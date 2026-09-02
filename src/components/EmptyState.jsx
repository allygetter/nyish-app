export default function EmptyState({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-line py-10 text-center">
      <p className="font-display font-semibold text-forest-dark">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink/50">{hint}</p>}
    </div>
  )
}
