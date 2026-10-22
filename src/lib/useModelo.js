import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiError, boardBody, boardKey, call, cleanServer, cleanToken, isLocalServer, loadServer, loadToken, saveServer, saveToken,
  tokenLooksValid,
} from './modelo'

/**
 * Sesión con el motor local para el mapa abierto.
 *  - Lectura (revisa, modelo): se repite sola (con retraso) cada vez que cambia el tablero mientras el panel está abierto.
 *  - Escritura (rankea → guarda la foto base y el plan; disparos → guarda en disparos.csv): solo cuando la persona lo pide.
 * Todo lo que llega del motor se guarda junto a la huella del tablero con que se pidió, así nunca se muestra como
 * «actual» algo calculado con otro tablero.
 */
export function useModelo(map, active) {
  const [server, setServerState] = useState(() => cleanServer(loadServer()))
  const [token, setTokenState] = useState(loadToken)
  const [status, setStatus] = useState('checking') // checking | ok | off | auth
  const [lastTry, setLastTry] = useState(null)
  const [offMsg, setOffMsg] = useState('')
  const [authMsg, setAuthMsg] = useState('')
  const [revisa, setRevisa] = useState(null) // { d, key }
  const [rank, setRank] = useState(null) // { d, key }
  const [retro, setRetro] = useState(null) // { d, key } — respuesta de /modelo con retroalimentación
  const [busy, setBusy] = useState({}) // { revisa, rank, retro, save }
  const [error, setError] = useState(null) // { text, inconsistencias? }

  const key = useMemo(() => boardKey(map), [map])
  const keyRef = useRef(key)
  keyRef.current = key
  const mapRef = useRef(map)
  mapRef.current = map
  const alive = useRef(true)
  const ctl = useRef({})
  useEffect(() => {
    alive.current = true
    const c = ctl.current
    return () => {
      alive.current = false
      Object.values(c).forEach((x) => x?.abort())
    }
  }, [])

  const mapId = String(map.id)
  // al cambiar de mapa, nada de lo anterior vale
  useEffect(() => {
    setRevisa(null)
    setRank(null)
    setRetro(null)
    setError(null)
  }, [mapId])

  const setBusyOf = (name, v) => alive.current && setBusy((b) => ({ ...b, [name]: v }))

  const onFail = useCallback((e) => {
    if (e?.name === 'AbortError') return null
    if (e instanceof ApiError && e.offline) {
      setOffMsg(e.message)
      setLastTry(new Date())
      setStatus('off')
      return null
    }
    if (e instanceof ApiError && (e.auth || e.limited)) {
      setAuthMsg(e.message)
      setStatus('auth')
      return null
    }
    return e
  }, [])

  // una petición por nombre a la vez: la nueva cancela a la anterior
  const req = useCallback(
    async (name, ruta, cuerpo, { quiet = false, errors = false } = {}) => {
      ctl.current[name]?.abort()
      const c = new AbortController()
      ctl.current[name] = c
      setBusyOf(name, true)
      if (!quiet) setError(null)
      try {
        const d = await call(server, ruta, cuerpo, c.signal, token)
        return alive.current && !c.signal.aborted ? d : null
      } catch (e) {
        const left = onFail(e)
        if (left && alive.current) {
          if (!quiet) setError({ text: left.message, inconsistencias: left.data?.inconsistencias })
          else if (errors) return { ok: false, error: left.message }
        }
        return null
      } finally {
        if (ctl.current[name] === c) setBusyOf(name, false)
      }
    },
    [server, token, onFail],
  )

  const connect = useCallback(async () => {
    setStatus('checking')
    setOffMsg('')
    ctl.current.salud?.abort()
    const c = new AbortController()
    ctl.current.salud = c
    try {
      if (!isLocalServer(server)) throw new ApiError('El motor solo puede estar en esta PC (127.0.0.1 o localhost).', { offline: true })
      const d = await call(server, '/salud', undefined, c.signal, token)
      if (!alive.current || c.signal.aborted) return
      if (d.requiere_token && !d.autenticado) {
        setAuthMsg(token ? 'El token no es el correcto.' : '')
        setStatus('auth')
      } else setStatus('ok')
    } catch (e) {
      if (e?.name === 'AbortError' || !alive.current) return
      setOffMsg(e.message)
      setLastTry(new Date())
      setStatus('off')
    }
  }, [server, token])

  useEffect(() => {
    if (active) connect()
    else ctl.current.salud?.abort()
  }, [active, connect])

  const doRevisa = useCallback(async () => {
    const k = keyRef.current
    const d = await req('revisa', '/revisa', boardBody(mapRef.current))
    if (d && keyRef.current === k) setRevisa({ d, key: k })
  }, [req])

  const doRetro = useCallback(async () => {
    const k = keyRef.current
    const d = await req('retro', '/modelo', { ...boardBody(mapRef.current), retro: true }, { quiet: true })
    if (d && keyRef.current === k) setRetro({ d, key: k })
    return d
  }, [req])

  // lectura automática: al abrir el panel y cuando cambia el tablero (con un respiro para no pedir en cada tecla)
  useEffect(() => {
    if (!active || status !== 'ok') return undefined
    const t = setTimeout(() => {
      doRevisa()
      doRetro()
    }, revisa || retro ? 500 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status, key, doRevisa, doRetro])

  /** Calcula el plan. Guarda la foto base y el plan del mapa (así los disparos se comparan contra ellos). */
  const calcPlan = useCallback(
    async (umbral = 76) => {
      const k = keyRef.current
      const d = await req('rank', '/rankea', { ...boardBody(mapRef.current), precision: 'normal', umbral, guardar: true })
      if (d && keyRef.current === k) {
        setRank({ d, key: k })
        doRetro()
      }
      return d
    },
    [req, doRetro],
  )

  const saveShots = useCallback(
    (cuerpo) => req('save', '/disparos', { ...boardBody(mapRef.current), ...cuerpo }, { quiet: true, errors: true }),
    [req],
  )

  const importHistory = useCallback((filas) => req('import', '/disparos/importar', { filas }, { quiet: true, errors: true }), [req])

  const setServer = (text) => {
    const u = cleanServer(text)
    saveServer(u)
    setServerState(u)
  }
  const setToken = (text) => {
    const t = cleanToken(text)
    if (!tokenLooksValid(t)) return false
    saveToken(t)
    setAuthMsg('')
    setTokenState(t)
    return true
  }
  const forgetToken = () => {
    saveToken('')
    setTokenState('')
    setStatus('auth')
  }

  const fresh = (x) => (x && x.key === key ? x.d : null)

  return {
    server, token, status, lastTry, offMsg, authMsg, busy, error, setError,
    revisa: fresh(revisa), rank: fresh(rank), retro: fresh(retro),
    lastRevisa: revisa?.d || null, lastRank: rank?.d || null, lastRetro: retro?.d || null,
    rankStale: !!rank && rank.key !== key,
    revisaStale: !!revisa && revisa.key !== key,
    key,
    connect, doRevisa, doRetro, calcPlan, saveShots, importHistory, setServer, setToken, forgetToken,
  }
}
