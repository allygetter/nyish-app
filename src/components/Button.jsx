import { cn } from '../utils/helpers'

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  isLoading, 
  ...props 
}) {
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-lg shadow-primary-600/20',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    outline: 'border-2 border-slate-200 text-slate-700 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  )
}
