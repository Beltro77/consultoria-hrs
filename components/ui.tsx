'use client'
import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { COLORS, type Client, TASK_STATUS_CYCLE, type TaskStatus } from '@/lib/types'

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest mb-3">{children}</p>
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-stone-50 rounded-lg p-3">
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <p className="text-[22px] font-medium text-stone-800">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, bg, fg, size = 'md' }: { name: string; bg: string; fg: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-medium flex-shrink-0`}
      style={{ background: bg, color: fg }}>
      {initials}
    </div>
  )
}

// ─── HourBar ──────────────────────────────────────────────────────────────────
export function HourBar({ label, hours, maxHours, color }: { label: string; hours: number; maxHours: number; color: string }) {
  const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0
  return (
    <div className="flex items-center gap-2 mb-2.5 last:mb-0">
      <span className="text-sm text-stone-700 w-28 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-stone-400 w-9 text-right flex-shrink-0">{hours.toFixed(1)}h</span>
    </div>
  )
}

// ─── Tag ─────────────────────────────────────────────────────────────────────
export function Tag({ label, selected, onClick, color }: { label: string; selected?: boolean; onClick?: () => void; color?: string }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selected ? 'text-white border-transparent' : 'text-stone-500 border-stone-200 bg-transparent hover:border-stone-300'}`}
      style={selected ? { background: color || 'var(--accent)', borderColor: color || 'var(--accent)' } : {}}>
      {label}
    </button>
  )
}

// ─── PeriodFilter ─────────────────────────────────────────────────────────────
export type Period = 'mes' | 'trim' | 'año' | 'todo'
const PERIODS = [{ id: 'mes' as Period, label: 'Este mes' }, { id: 'trim' as Period, label: 'Trimestre' }, { id: 'año' as Period, label: 'Este año' }, { id: 'todo' as Period, label: 'Todo' }]
export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {PERIODS.map(p => (
        <button key={p.id} onClick={() => onChange(p.id)}
          className={`px-3 py-1 rounded-full text-xs border transition-all ${value === p.id ? 'text-white' : 'text-stone-500 border-stone-200 hover:border-stone-300'}`}
          style={value === p.id ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ─── Form elements ────────────────────────────────────────────────────────────
const fieldCls = 'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white text-stone-800 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all'
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ''}`} />
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldCls} ${props.className ?? ''}`} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldCls} resize-none ${props.className ?? ''}`} />
}
export function Label({ children }: { children: ReactNode }) {
  return <p className="text-xs text-stone-400 mb-1 mt-3 first:mt-0">{children}</p>
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', className = '' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost'; className?: string
}) {
  return (
    <button onClick={onClick}
      className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[.98] ${variant === 'primary' ? 'text-white' : 'border border-stone-200 text-stone-500 bg-transparent hover:bg-stone-50'} ${className}`}
      style={variant === 'primary' ? { background: 'var(--accent)' } : {}}>
      {children}
    </button>
  )
}

// ─── ColorPicker ─────────────────────────────────────────────────────────────
export function ColorPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {COLORS.map((c, i) => (
        <button key={i} onClick={() => onChange(i)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${value === i ? 'text-white' : 'text-stone-500 border-stone-200'}`}
          style={value === i ? { background: c.dot, borderColor: c.dot } : {}}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

// ─── StatusButton ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<TaskStatus, { cls: string; icon: string }> = {
  'pendiente':    { cls: 'border-stone-300 bg-transparent text-transparent', icon: '' },
  'en ejecución': { cls: 'border-amber-400 bg-amber-50 text-amber-700',       icon: '◑' },
  'realizada':    { cls: 'border-accent bg-accent-light text-accent-dark',     icon: '✓' },
}
export function StatusButton({ status, onClick }: { status: TaskStatus; onClick: () => void }) {
  const s = STATUS_STYLES[status]
  return (
    <button onClick={onClick}
      className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center text-[10px] transition-all flex-shrink-0 mt-0.5 ${s.cls}`}
      title="Cambiar estado">
      {s.icon}
    </button>
  )
}

// ─── BottomSheet ──────────────────────────────────────────────────────────────
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-t-2xl px-4 pt-5 pb-8 w-full max-w-lg max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-medium text-stone-800">{title}</p>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, string> = {
  pendiente:      'bg-stone-100 text-stone-500',
  'en ejecución': 'bg-amber-50 text-amber-700',
  realizada:      'bg-accent-light text-accent-dark',
  recurrente:     'bg-purple-50 text-purple-700',
}
export function Badge({ label }: { label: string }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${BADGE_STYLES[label] ?? 'bg-stone-100 text-stone-500'}`}>
      {label}
    </span>
  )
}
