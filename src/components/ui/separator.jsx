import React from 'react'
import { cn } from './utils'

export function Separator({ className = '' }) {
  return <div className={cn('h-px w-full bg-slate-800', className)} />
}
