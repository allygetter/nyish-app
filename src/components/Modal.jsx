import { X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../utils/helpers'

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full bg-white dark:bg-slate-900 sm:rounded-2xl rounded-t-2xl shadow-2xl',
        'max-h-[90vh] overflow-y-auto animate-slide-up',
        maxWidth
      )}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
