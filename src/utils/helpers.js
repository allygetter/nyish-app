import { format, parseISO } from 'date-fns'

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount || 0)
}

export const formatDate = (date) => {
  if (!date) return '—'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM d, yyyy')
  } catch {
    return date
  }
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM d, yyyy h:mm a')
  } catch {
    return date
  }
}

export const roleColors = {
  chairperson: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  secretary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  treasurer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  member: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export const statusColors = {
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const cn = (...classes) => classes.filter(Boolean).join(' ')
