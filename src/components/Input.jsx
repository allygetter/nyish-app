import { forwardRef } from 'react'
import { cn } from '../utils/helpers'

export const Input = forwardRef(({ label, error, className, icon, ...props }, ref) => (
  <div className={cn('w-full', className)}>
    {label && (
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-white dark:bg-slate-900 px-4 py-3 text-sm',
          icon && 'pl-10',
          'text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
          'transition-all duration-200 outline-none',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
            : 'border-slate-200 dark:border-slate-700'
        )}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
))
Input.displayName = 'Input'
