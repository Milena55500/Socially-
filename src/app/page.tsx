import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { PRICE_CENTS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Photos are free to use under the Unsplash License (https://unsplash.com/license).
const unsplash = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;
const PHOTOS = {
  hero: {
    src: unsplash("photo-1761150285221-c164680ccbea", 900),
    alt: "A maker carving wood at an outdoor art stall",
    by: "Juup Schram",
    link: "https://unsplash.com/photos/man-carving-wood-at-an-outdoor-art-stall-EGWFtb_njdA",
  },
  stall: {
    src: unsplash("photo-1768992831140-2f6f6c388f5b"),
    alt: "Shoppers browsing a market stall full of colorful masks and scarves",
    by: "Claudio Schwarz",
    link: "https://unsplash.com/photos/people-browse-a-stall-filled-with-colorful-masks-and-scarves-xDR0GP-EpNk",
  },
  crowd: {
    src: unsplash("photo-1639775465486-8a891a71d53f", 900),
    alt: "A crowd walking through a market street at night",
    by: "Richard Bell",
    link: "https://unsplash.com/photos/a-crowd-of-people-walking-down-a-street-at-night-F-SwH9M0srU",
  },
};

// Real quotes from people who've used Socially. Add them here and the section appears on the homepage.
// Only add quotes you have permission to use, e.g.
// { quote: "…", name: "Jane Doe", role: "Owner, Example Candle Co." },
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

function Credit({ by, link }: { by: string; link: string }) {
  return (
    <p className="credit">
      Photo: <a href={link} target="_blank" rel="noreferrer">{by} / Unsplash</a>
    </p>
  );
}

export default async function Home() {
  const loggedIn = (await getSessionUserId()) !== null;
  const price = (PRICE_CENTS / 100).toFixed(PRICE_CENTS % 100 === 0 ? 0 : 2);
  const start = loggedIn ? "/dashboard" : "/signup";

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

      <main className="hero hero-split">
        <div>
          <p className="eyebrow">For makers, markets &amp; small shops</p>
          <h1>
            Posts that know <span className="highlight">your business.</span>
          </h1>
          <p className="lead">
            Most AI tools guess. Socially reads your website and your past posts first, so every caption
            has your real dates, names and details, sounds like you wrote it, and comes with a
            ready-to-post graphic with your logo and colors.
          </p>
          <div className="cta-row">
            <Link href={start} className="btn btn-primary btn-lg">
              {loggedIn ? "Create posts" : "Try it free: 3 posts on us"}
            </Link>
          </div>
        </div>
        <figure className="hero-photo">
          <img src={PHOTOS.hero.src} alt={PHOTOS.hero.alt} />
          <div className="float-card">
            <p className="hook">Meet the hands behind the booth 🪵</p>
            <p className="muted">Caption, hashtags and a branded graphic, written from your own website.</p>
          </div>
          <Credit by={PHOTOS.hero.by} link={PHOTOS.hero.link} />
        </figure>
      </main>

      <section className="section">
        <h2>How it works</h2>
        <p className="lead">Set it up once in about five minutes. After that, a week of posts takes one click.</p>
        <ol className="steps">
          <li>
            <strong>Add your website</strong>
            <span className="muted">Socially reads your site (event, about, vendor and FAQ pages) and pulls out the real facts.</span>
          </li>
          <li>
            <strong>Paste a few old posts</strong>
            <span className="muted">It learns how you write: your emoji, your slang, how you sign off.</span>
          </li>
          <li>
            <strong>Upload your logo</strong>
            <span className="muted">We grab your brand colors from it automatically.</span>
          </li>
          <li>
            <strong>Get posts + graphics</strong>
            <span className="muted">Three captions, hashtags, and a downloadable graphic for each, sized for Instagram, Stories or TikTok.</span>
          </li>
        </ol>
      </section>

      <section className="section">
        <h2>The difference real details make</h2>
        <p className="lead">The same request, &ldquo;promote our holiday market,&rdquo; for an example business.</p>
        <div className="compare">
          <div className="card bad">
            <p className="eyebrow small-eyebrow">A generic AI chatbot</p>
            <p>✨ Get ready for the most magical holiday market of the year! Shop amazing local vendors, enjoy delicious treats and find the perfect gift! See you there! 🎄</p>
          </div>
          <div className="card">
            <p className="eyebrow small-eyebrow">Socially, with your Brand Kit</p>
            <p>
              okay this is the big one 🧶 40+ makers under one roof this Saturday, including the candle girls
              everyone asked about after last time. doors at 10, free to get in, bring a tote. full vendor list
              at the link in bio.
            </p>
            <p className="muted small" style={{ marginTop: 10 }}>
              Missing a detail? Socially leaves a <span className="placeholder-tag">[DATE]</span> for you to fill in instead of making one up.
            </p>
          </div>
        </div>
      </section>

      <section className="section photo-strip">
        <figure>
          <img src={PHOTOS.stall.src} alt={PHOTOS.stall.alt} />
          <Credit by={PHOTOS.stall.by} link={PHOTOS.stall.link} />
        </figure>
        <figure>
          <img src={PHOTOS.crowd.src} alt={PHOTOS.crowd.alt} />
          <Credit by={PHOTOS.crowd.by} link={PHOTOS.crowd.link} />
        </figure>
      </section>

      {TESTIMONIALS.length > 0 && (
        <section className="section">
          <h2>What people are saying</h2>
          <div className="quotes">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="card">
                <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption>
                  {t.name} <span className="muted small">· {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="why section">
        <h2>Why it&apos;s worth paying for</h2>
        <div className="why-grid">
          <div>
            <strong>It already knows your business</strong>
            <p className="muted">No re-explaining your event every time. Your Brand Kit is saved and used on every post.</p>
          </div>
          <div>
            <strong>Graphics included</strong>
            <p className="muted">On-brand images with your logo and colors, ready to download. No Canva session needed.</p>
          </div>
          <div>
            <strong>Cheaper than a social media manager</strong>
            <p className="muted">Freelancers charge hundreds a month. Socially Pro is a one-time ${price}.</p>
          </div>
        </div>
        <div className="card pricing">
          <div>
            <p className="eyebrow small-eyebrow">Socially Pro</p>
            <p className="price">${price} <span className="muted small">one time</span></p>
            <p className="muted">Unlimited posts, Brand Kit, branded graphics, every platform, saved history.</p>
          </div>
          <Link href={start} className="btn btn-primary">Get started</Link>
        </div>
      </section>

      <footer className="footer">
        <p>Created by Milena Lombardo</p>
        <p className="muted">© {new Date().getFullYear()} Socially</p>
      </footer>
    </div>
  );
}
