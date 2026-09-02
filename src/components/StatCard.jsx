export default function StatCard({ label, value, accent = 'forest' }) {
  const accentClasses = {
    forest: 'text-forest-dark',
    gold: 'text-gold-dark',
    clay: 'text-clay',
  }
  return (
    <div className="card">
      <p className="text-sm text-ink/50">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${accentClasses[accent]}`}>{value}</p>
    </div>
  )
}
