import { Eraser, Sparkles } from 'lucide-react'
import CellGlyph, { cellBg } from './CellGlyph'
import { NUM_COLORS, describe } from '../lib/cells'
import { REWARDS, REWARD_BY_ID } from '../lib/rewards'

const sqBtn =
  'flex size-[34px] items-center justify-center rounded-[9px] bg-surface-2 text-ink-2 hover:text-ink'

function Kbd({ children, className = '' }) {
  return (
    <span
      className={`rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 font-num text-[10px] leading-none text-ink-2 ${className}`}
    >
      {children}
    </span>
  )
}

/** Botón de tipo de casilla (Identificada, Revelada…) */
function Opt({ sample, label, hotkey, active, bg = 'bg-cell-hidden', onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`relative flex h-[62px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border ${bg} ${
        active ? 'border-accent' : 'border-line'
      } hover:brightness-125`}
    >
      <span className="flex size-[22px] items-center justify-center">
        <CellGlyph cell={sample} fs={18} />
      </span>
      <span className={`text-[11px] font-medium ${active ? 'text-accent' : 'text-ink-2'}`}>{label}</span>
      <span className="absolute right-1.5 top-[5px] font-num text-[10px] text-ink-3">{hotkey}</span>
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
            title={kind === 'num' ? `Número revelado ${n} (tecla ${n})` : `Nº conocido ${n} (Num ${n})`}
            aria-pressed={active}
            className={`h-10 flex-1 rounded-[10px] border font-num text-[15px] font-bold hover:brightness-125 ${bg} ${
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[13px] font-semibold">¿Qué recompensa dio esta mina?</span>
        </div>
        <span className="font-num text-[10px] text-ink-3">teclas 1–5</span>
      </div>
      <div className="flex gap-[7px]">
        {REWARDS.map((r) => {
          const on = cell.reward === r.id
          const Icon = r.icon
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              aria-pressed={on}
              className="relative flex flex-1 flex-col items-center gap-[7px] rounded-[11px] border pb-[9px] pt-2.5 hover:brightness-125"
              style={{
                background: on ? r.color + '24' : 'var(--color-surface-2)',
                borderColor: on ? r.color : 'var(--color-line)',
              }}
            >
              <span
                className="flex size-[30px] items-center justify-center rounded-lg"
                style={{ background: r.color + '1F' }}
              >
                <Icon size={15} style={{ color: r.color }} />
              </span>
              <span className={`text-[11px] ${on ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>
                {r.name}
              </span>
              <span className="absolute right-1 top-1 font-num text-[9px] text-ink-3">{r.key}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Rewards({ counts, total, delta }) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="overline">Recompensas</span>
        <span className="text-xs text-ink-2">{total} en total</span>
      </div>
      <div className="flex h-1.5 gap-0.5">
        {total === 0 ? (
          <div className="h-full flex-1 rounded-[3px] bg-surface-2" />
        ) : (
          REWARDS.filter((r) => counts[r.id] > 0).map((r) => (
            <div
              key={r.id}
              className="h-full rounded-[3px]"
              style={{ flexGrow: counts[r.id], flexBasis: 0, background: r.color }}
            />
          ))
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {REWARDS.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.id} className="flex items-center gap-3 py-1.5">
              <span
                className="flex size-7 items-center justify-center rounded-lg"
                style={{ background: r.color + '1F' }}
              >
                <Icon size={14} style={{ color: r.color }} />
              </span>
              <span className="flex-1 text-[13px] font-medium">{r.name}</span>
              {delta === r.id && (
                <span
                  className="rounded-full px-1.5 py-0.5 font-num text-[10px] font-semibold"
                  style={{ background: r.color + '24', color: r.color }}
                >
                  +1
                </span>
              )}
              <span className="font-num text-sm font-medium">{counts[r.id]}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function Inspector({ sel, cell, rewardStats, onSet, onErase }) {
  const t = cell?.t
  const reward = cell?.t === 'X' && cell.reward ? REWARD_BY_ID[cell.reward] : null
  const state = describe(cell) + (reward ? ` · ${reward.name}` : '')

  return (
    <aside className="flex w-[400px] shrink-0 flex-col gap-7 overflow-y-auto border-l border-line bg-surface p-6 max-lg:w-full max-lg:border-l-0 max-lg:border-t">
      <section className="flex flex-col gap-3.5">
        <span className="overline">Casilla</span>

        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-11 items-center justify-center rounded-[10px] border border-accent ${cellBg(cell)}`}
            >
              <CellGlyph cell={cell} fs={18} />
            </div>
            <div className="flex flex-col gap-[3px]">
              <span className="text-base font-semibold">
                Fila {sel.r + 1} · Columna {sel.c + 1}
              </span>
              <span className="text-xs text-ink-2">{state}</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button type="button" className={sqBtn} onClick={onErase} aria-label="Borrar" title="Borrar (⌫)">
              <Eraser size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Opt sample={{ t: 'x' }} label="Identificada" hotkey="X" active={t === 'x'} onClick={() => onSet({ t: 'x' })} title="Mina identificada, sin revelar" />
          <Opt
            sample={{ t: 'X' }}
            label="Revelada"
            hotkey="⇧X"
            bg="bg-cell-open"
            active={t === 'X'}
            onClick={() => onSet({ t: 'X', reward: cell?.t === 'X' ? cell.reward : undefined })}
            title="Mina revelada"
          />
          <Opt sample={{ t: 'O' }} label="Posible mina" hotkey="O/R" active={t === 'O'} onClick={() => onSet({ t: 'O' })} />
        </div>

        {cell?.t === 'X' && <RewardPicker cell={cell} onPick={(id) => onSet({ t: 'X', reward: id })} />}

        <div className="flex gap-2">
          <Opt sample={{ t: 'dash' }} label="Posible nº" hotkey="Q" active={t === 'dash'} onClick={() => onSet({ t: 'dash' })} title="Seguro; posible número / cero deducido" />
          <Opt sample={{ t: 'hash' }} label="Nº seguro" hotkey="W" active={t === 'hash'} onClick={() => onSet({ t: 'hash' })} title="Seguro, número de valor desconocido" />
          <Opt sample={{ t: 'red' }} label="Sin certeza" hotkey="E" active={t === 'red'} onClick={() => onSet({ t: 'red' })} title="Seguro, sin certeza de si es número" />
          <Opt sample={{ t: 'zero' }} label="Cero" hotkey="0" bg="bg-cell-open" active={t === 'zero'} onClick={() => onSet({ t: 'zero' })} title="Cero revelado" />
        </div>

        <NumRow kind="num" cell={cell} onPick={onSet} bg="bg-cell-open" />
        <NumRow kind="known" cell={cell} onPick={onSet} bg="bg-cell-hidden" />
      </section>

      <Rewards
        counts={rewardStats.rewards}
        total={rewardStats.rewardTotal}
        delta={cell?.t === 'X' ? cell.reward : null}
      />

      <section className="mt-auto flex flex-col gap-2.5 border-t border-line pt-4">
        <span className="overline">Atajos</span>
        <div className="flex gap-4">
          <div className="flex flex-1 items-center gap-1">
            <Kbd>←</Kbd>
            <Kbd>↑</Kbd>
            <Kbd>→</Kbd>
            <Kbd>↓</Kbd>
            <span className="pl-1 text-xs text-ink-3">Mover</span>
          </div>
          <div className="flex flex-1 items-center gap-1">
            <Kbd>⌫</Kbd>
            <span className="pl-1 text-xs text-ink-3">Borrar</span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-1 items-center gap-1">
            <Kbd>1–8</Kbd>
            <span className="pl-1 text-xs text-ink-3">Nº revelado</span>
          </div>
          <div className="flex flex-1 items-center gap-1">
            <Kbd>Num</Kbd>
            <Kbd>1–8</Kbd>
            <span className="pl-1 text-xs text-ink-3">Nº conocido</span>
          </div>
        </div>
      </section>
    </aside>
  )
}
