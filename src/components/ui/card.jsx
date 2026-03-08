import React from 'react'
import { cn } from './utils'

export function Card({ className = '', ...props }) {
  return <div className={cn('rounded-2xl border border-slate-800 bg-slate-900', className)} {...props} />
}

export function CardHeader({ className = '', ...props }) {
  return <div className={cn('p-6', className)} {...props} />
}

export function CardTitle({ className = '', ...props }) {
  return <h3 className={cn('text-lg font-semibold', className)} {...props} />
}

export function CardContent({ className = '', ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
