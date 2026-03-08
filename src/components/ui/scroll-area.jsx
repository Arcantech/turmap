import React from 'react'
import { cn } from './utils'

export function ScrollArea({ className = '', ...props }) {
  return <div className={cn('overflow-auto', className)} {...props} />
}
