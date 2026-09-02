export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink/60">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest/20 border-t-forest" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
