import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { PRICE_CENTS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function Home() {
  const loggedIn = (await getSessionUserId()) !== null;
  const price = (PRICE_CENTS / 100).toFixed(PRICE_CENTS % 100 === 0 ? 0 : 2);

  return (
    <div className="page">
      <header className="nav nav-row">
        <span className="logo">
          <span className="logo-dot" /> Socially
        </span>
        <nav className="nav-links">
          {loggedIn ? (
            <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Log in</Link>
              <Link href="/signup" className="btn btn-primary">Sign up free</Link>
            </>
          )}
        </nav>
      </header>

      <main className="hero">
        <p className="eyebrow">AI-powered social media assistant</p>
        <h1>
          Never stare at a <span className="highlight">blank post</span> again.
        </h1>
        <p className="lead">
          Socially is for small business owners and creators who don&apos;t have time to be a
          full-time social media manager. Describe what you&apos;re selling, and in seconds you get
          three ready-to-post ideas, each with a scroll-stopping hook, a caption in your brand&apos;s
          voice, the right hashtags, and what to photograph.
        </p>
        <div className="cta-row">
          <Link href={loggedIn ? "/dashboard" : "/signup"} className="btn btn-primary btn-lg">
            {loggedIn ? "Create posts" : "Try it free: 3 posts on us"}
          </Link>
        </div>

        <ul className="features">
          <li>
            <strong>Post ideas</strong>
            <span>Three different angles every time, so your feed never feels repetitive.</span>
          </li>
          <li>
            <strong>Captions</strong>
            <span>Written for the platform you choose, in the tone that fits your brand.</span>
          </li>
          <li>
            <strong>Hashtags</strong>
            <span>A mix of broad, niche, and local tags to reach people who&apos;ll actually buy.</span>
          </li>
        </ul>
      </main>

      <section className="why">
        <h2>Why it&apos;s worth paying for</h2>
        <div className="why-grid">
          <div>
            <strong>Hours back every week</strong>
            <p className="muted">Planning a week of posts takes minutes instead of an evening.</p>
          </div>
          <div>
            <strong>Cheaper than a social media manager</strong>
            <p className="muted">Freelancers charge hundreds a month. Socially Pro is a one-time ${price}.</p>
          </div>
          <div>
            <strong>Posts that sound like you</strong>
            <p className="muted">No generic &quot;check out our product!&quot; filler. Specific, human, on-brand.</p>
          </div>
        </div>
        <div className="card pricing">
          <div>
            <p className="eyebrow small-eyebrow">Socially Pro</p>
            <p className="price">${price} <span className="muted small">one time</span></p>
            <p className="muted">Unlimited generations, every platform, saved post history.</p>
          </div>
          <Link href={loggedIn ? "/dashboard" : "/signup"} className="btn btn-primary">Get started</Link>
        </div>
      </section>

      <footer className="footer">
        <p>Created by Milena Lombardo</p>
        <p className="muted">© {new Date().getFullYear()} Socially</p>
      </footer>
    </div>
  );
}
