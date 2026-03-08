import React from 'react'
import { cn } from './utils'

const variants = {
  default: 'bg-sky-600 text-white hover:bg-sky-500 border-transparent',
  outline: 'bg-transparent text-slate-100 border border-slate-700 hover:bg-slate-800',
}

const sizes = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-8 px-3 text-xs',
}

export function Button({ className = '', variant = 'default', size = 'default', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        className,
      )}
      {...props}
    />
  )
}
