import React from 'react'
import { cn } from './utils'

function flatten(children, out = []) {
  React.Children.forEach(children, (child) => {
    if (!child) return
    if (Array.isArray(child)) {
      flatten(child, out)
      return
    }
    if (React.isValidElement(child)) {
      out.push(child)
      if (child.props?.children) flatten(child.props.children, out)
    }
  })
  return out
}

export function Select({ value, onValueChange, className = '', children }) {
  const items = flatten(children).filter((child) => child.type?.displayName === 'SelectItem')
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn('w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500', className)}
    >
      {items.map((item) => (
        <option key={item.props.value} value={item.props.value}>
          {typeof item.props.children === 'string' ? item.props.children : item.props.value}
        </option>
      ))}
    </select>
  )
}

export function SelectTrigger({ children }) {
  return <>{children}</>
}

export function SelectValue() {
  return null
}

export function SelectContent({ children }) {
  return <>{children}</>
}

export function SelectItem() {
  return null
}
SelectItem.displayName = 'SelectItem'
