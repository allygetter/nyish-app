import { User } from 'lucide-react'
import { getPublicUrl } from '../lib/supabase'
import { cn } from '../utils/helpers'

export function Avatar({ url, name, size = 'md', className }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  }

  const imageUrl = url ? getPublicUrl('avatars', url) : null

  return (
    <div className={cn(
      'relative rounded-full overflow-hidden bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center flex-shrink-0',
      sizeClasses[size],
      className
    )}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <User className="text-primary-600 dark:text-primary-400" size={size === 'sm' ? 14 : size === 'md' ? 20 : size === 'lg' ? 24 : 32} />
      )}
    </div>
  )
}
