import React from 'react'
import { cn } from './utils'

export function Switch({ checked = false, onCheckedChange, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition',
        checked ? 'bg-sky-500' : 'bg-slate-700',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white transition',
          checked ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  )
}
