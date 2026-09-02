import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-forest hover:underline">
          ← Back home
        </Link>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">Group Information</h1>

        <div className="card mt-6 space-y-4 text-sm leading-relaxed text-ink/80">
          <p>
            Nguumo Young Investors Self-Help Group (NYISH) is a self-help group of about 30 young
            people who are beneficiaries of the NYOTA programme. The group brings members together
            to save, invest, and build economic opportunities as a community.
          </p>
          <div>
            <p className="font-display font-semibold text-forest-dark">What we do</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Collect regular member contributions and group savings</li>
              <li>Hold periodic meetings to plan and review group progress</li>
              <li>Run training sessions on business and investment skills</li>
              <li>Discuss and pursue group investment and business ideas</li>
              <li>Take part in community activities together</li>
            </ul>
          </div>
          <div>
            <p className="font-display font-semibold text-forest-dark">Membership</p>
            <p className="mt-2">
              Members join as NYOTA beneficiaries and are registered by the group administrator.
              Each member can log in to view their own contributions, group announcements,
              upcoming meetings, and ongoing activities.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
