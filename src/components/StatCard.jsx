import { cn } from '../utils/helpers'

export function StatCard({ title, value, icon: Icon, trend, color = 'primary' }) {
  const colorMap = {
    primary: 'from-primary-500 to-emerald-600',
    blue: 'from-blue-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
      <div className={cn('absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-full -mr-8 -mt-8', colorMap[color])} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-display">{value}</p>
          {trend && (
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg', colorMap[color])}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
