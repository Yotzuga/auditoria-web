import { useEffect, useState } from 'react'

/** true mientras la ventana cumple la media query (se actualiza al girar/redimensionar). */
export function useMedia(query) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const f = () => setOn(mq.matches)
    f()
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [query])
  return on
}
