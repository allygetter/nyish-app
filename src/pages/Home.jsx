import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest px-4 pb-16 pt-20 text-center text-white md:pb-24 md:pt-28">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-gold-light">
          NYISH
        </p>
        <h1 className="mx-auto mt-2 max-w-2xl font-display text-3xl font-bold leading-tight md:text-5xl">
          Nguumo Young Investors Self-Help Group
        </h1>
        <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold" />
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
          A digital platform connecting our members, managing group activities, and supporting
          our journey towards economic empowerment.
        </p>

        <div className="mx-auto mt-9 flex max-w-xs flex-col gap-3 md:max-w-none md:flex-row md:justify-center">
          <Link to="/login" className="btn btn-gold">
            Member Login
          </Link>
          <Link to="/announcements" className="btn border border-white/40 text-white hover:bg-white/10">
            View Announcements
          </Link>
          <Link to="/about" className="btn border border-white/40 text-white hover:bg-white/10">
            Group Information
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card">
            <p className="font-display font-semibold text-forest-dark">Contributions</p>
            <p className="mt-1 text-sm text-ink/60">
              Track your savings and see the group's collective progress.
            </p>
          </div>
          <div className="card">
            <p className="font-display font-semibold text-forest-dark">Meetings</p>
            <p className="mt-1 text-sm text-ink/60">
              Stay up to date on when and where the group meets next.
            </p>
          </div>
          <div className="card">
            <p className="font-display font-semibold text-forest-dark">Activities</p>
            <p className="mt-1 text-sm text-ink/60">
              Follow group projects, trainings, and investment ideas.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-ink/40">
        NYISH — Nguumo Young Investors Self-Help Group · NYOTA beneficiaries
      </footer>
    </div>
  )
}
