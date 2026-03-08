import React, { createContext, useContext } from 'react'
import { cn } from './utils'

const TabsContext = createContext({ value: '', onValueChange: () => {} })

export function Tabs({ value, onValueChange, className = '', children }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className = '', ...props }) {
  return <div className={cn('inline-flex items-center gap-1 rounded-xl bg-slate-800 p-1', className)} {...props} />
}

export function TabsTrigger({ value, className = '', children, ...props }) {
  const ctx = useContext(TabsContext)
  const active = ctx.value === value
  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm transition',
        active ? 'bg-slate-700 text-white shadow' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className = '', children, ...props }) {
  const ctx = useContext(TabsContext)
  if (ctx.value !== value) return null
  return (
    <div className={cn('mt-2', className)} {...props}>
      {children}
    </div>
  )
}
