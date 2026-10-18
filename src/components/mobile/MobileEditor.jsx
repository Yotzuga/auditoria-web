import { Eraser, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import CellGlyph, { cellBg } from '../CellGlyph'
import { NUM_COLORS, describe } from '../../lib/cells'
import { REWARDS, REWARD_BY_ID } from '../../lib/rewards'

const sq = 'flex size-9 items-center justify-center rounded-[10px] bg-surface-2 text-ink-2 active:brightness-125'

function Opt({ sample, label, active, bg = 'bg-cell-hidden', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-14 flex-1 flex-col items-center justify-center gap-[5px] rounded-[11px] border short:h-12 short:gap-0.5 ${bg} ${
        active ? 'border-accent' : 'border-line'
      }`}
    >
      <span className="flex size-5 items-center justify-center">
        <CellGlyph cell={sample} fs={17} />
      </span>
      <span className={`text-[11px] font-medium ${active ? 'text-accent' : 'text-ink-2'}`}>{label}</span>
    </button>
  )
}

function NumRow({ kind, cell, onPick, bg }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
        const active = cell?.t === kind && cell.v === n
        return (
          <button
            key={n}
            type="button"
            onClick={() => onPick({ t: kind, v: n })}
            aria-label={kind === 'num' ? `Número revelado ${n}` : `Número conocido ${n}`}
            aria-pressed={active}
            className={`h-10 flex-1 rounded-[10px] border font-num text-[15px] font-bold short:h-9 ${bg} ${
              active ? 'border-accent' : 'border-line'
            }`}
            style={{ color: NUM_COLORS[n] }}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

function RewardPicker({ cell, onPick }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-accent-mid bg-[#F5B83D0D] p-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-accent" />
        <span className="text-[13px] font-semibold">¿Qué recompensa dio esta mina?</span>
      </div>
      <div className="flex gap-1.5">
        {REWARDS.map((r) => {
          const on = cell.reward === r.id
          const Icon = r.icon
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              aria-pressed={on}
              className="flex flex-1 flex-col items-center gap-[7px] rounded-[11px] border pb-[9px] pt-2.5"
              style={{
                background: on ? r.color + '24' : 'var(--color-surface-2)',
                borderColor: on ? r.color : 'var(--color-line)',
              }}
            >
              <span className="flex size-8 items-center justify-center rounded-[9px]" style={{ background: r.color + '1F' }}>
                <Icon size={16} style={{ color: r.color }} />
              </span>
              <span className={`text-[11px] ${on ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>{r.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Hoja inferior para editar la casilla seleccionada (diseño "Editando casilla"). */
export default function MobileEditor({ sel, cell, onSet, onErase, onPrev, onNext }) {
  const t = cell?.t
  const reward = t === 'X' && cell.reward ? REWARD_BY_ID[cell.reward] : null
  const needsReward = t === 'X' && !reward // el selector solo aparece si esta mina aún no tiene recompensa

  return (
    <div className="flex max-h-[50dvh] short:max-h-[46dvh] shrink-0 flex-col gap-2.5 overflow-y-auto rounded-t-3xl border border-b-0 border-line bg-surface px-4 pb-[max(env(safe-area-inset-bottom),6px)] pt-4 short:gap-2 short:pt-3">
      <div className="flex items-center justify-between pb-1">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-accent ${cellBg(cell)}`}
          >
            <CellGlyph cell={cell} fs={16} />
          </div>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="truncate text-[15px] font-semibold">
              Fila {sel.r + 1} · Columna {sel.c + 1}
            </span>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-ink-2">
              <span className="min-w-0 truncate">{describe(cell)}</span>
              {reward && (
                // etiqueta de la recompensa: tocarla la quita y vuelve a mostrar el selector
                <button
                  type="button"
                  onClick={() => onSet({ t: 'X' })}
                  aria-label={`Recompensa ${reward.name}: tocar para cambiarla`}
                  className="-my-1.5 flex shrink-0 items-center gap-1 rounded-md px-1.5 py-[3px] text-[11px] font-medium active:brightness-125"
                  style={{ background: reward.color + '24', color: reward.color }}
                >
                  <reward.icon size={11} />
                  {reward.name}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button type="button" className={sq} onClick={onErase} aria-label="Borrar">
            <Eraser size={17} />
          </button>
          <button type="button" className={sq} onClick={onPrev} aria-label="Casilla anterior">
            <ChevronLeft size={17} />
          </button>
          <button type="button" className={sq} onClick={onNext} aria-label="Casilla siguiente">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        <Opt sample={{ t: 'x' }} label="Identificada" active={t === 'x'} onClick={() => onSet({ t: 'x' })} />
        <Opt
          sample={{ t: 'X' }}
          label="Revelada"
          bg="bg-cell-open"
          active={t === 'X'}
          onClick={() => onSet({ t: 'X', reward: t === 'X' ? cell.reward : undefined })}
        />
        <Opt sample={{ t: 'O' }} label="Posible mina" active={t === 'O'} onClick={() => onSet({ t: 'O' })} />
      </div>

      {needsReward && <RewardPicker cell={cell} onPick={(id) => onSet({ t: 'X', reward: id })} />}

      <div className="flex gap-1.5">
        <Opt sample={{ t: 'dash' }} label="Posible nº" active={t === 'dash'} onClick={() => onSet({ t: 'dash' })} />
        <Opt sample={{ t: 'hash' }} label="Nº seguro" active={t === 'hash'} onClick={() => onSet({ t: 'hash' })} />
        <Opt sample={{ t: 'red' }} label="Sin certeza" active={t === 'red'} onClick={() => onSet({ t: 'red' })} />
        <Opt sample={{ t: 'zero' }} label="Cero" bg="bg-cell-open" active={t === 'zero'} onClick={() => onSet({ t: 'zero' })} />
      </div>

      <NumRow kind="num" cell={cell} onPick={onSet} bg="bg-cell-open" />
      <NumRow kind="known" cell={cell} onPick={onSet} bg="bg-cell-hidden" />
    </div>
  )
}
