import React from 'react'
import { cn } from './utils'

export function Dialog({ open, children }) {
  if (!open) return null
  return <>{children}</>
}

export function DialogContent({ className = '', children, ...props }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={cn('w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl', className)} {...props}>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className = '', ...props }) {
  return <div className={cn('mb-4 space-y-1', className)} {...props} />
}

export function DialogTitle({ className = '', ...props }) {
  return <h2 className={cn('text-xl font-semibold text-slate-50', className)} {...props} />
}

export function DialogFooter({ className = '', ...props }) {
  return <div className={cn('mt-4 flex justify-end gap-2', className)} {...props} />
}
