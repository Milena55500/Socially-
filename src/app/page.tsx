import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { PRICE_CENTS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Photos are free to use under the Unsplash License (https://unsplash.com/license).
const unsplash = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;
const PHOTOS = {
  hero: {
    src: unsplash("photo-1760348082270-3a46a3512850", 900),
    alt: "A graduate celebrating outdoors with friends and family",
    by: "Mattia Revelant",
    link: "https://unsplash.com/photos/graduation-celebration-with-family-and-friends-outdoors-pabZkFHzgYg",
  },
  night: {
    src: unsplash("photo-1647071012620-1f30c06e32a0"),
    alt: "A group of friends out together on a city street at night",
    by: "Daesun Kim",
    link: "https://unsplash.com/photos/a-group-of-people-standing-outside-of-a-building-at-night-AivZxl17aOI",
  },
  party: {
    src: unsplash("photo-1517457373958-b7bdd4587205", 900),
    alt: "A group of young people laughing together at a party under string lights",
    by: "Samantha Gades",
    link: "https://unsplash.com/photos/laughing-people-in-party-fIHozNWfcvs",
  },
};

// Real quotes from people who've used Socially. Add them here and the section appears on the homepage.
// Only add quotes you have permission to use, e.g.
// { quote: "…", name: "Jane Doe", role: "Class of 2027" },
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
          <p className="eyebrow">For college students &amp; young creators</p>
          <h1>
            Captions that sound like <span className="highlight">you.</span>
          </h1>
          <p className="lead">
            Grad pics, a night out, the internship you finally landed. You&apos;ve got the photos, now get the
            caption. Socially learns from your old posts, so you get three options that sound like you
            wrote them (not like a chatbot did), plus a story graphic if you want one.
          </p>
          <div className="cta-row">
            <Link href={start} className="btn btn-primary btn-lg">
              {loggedIn ? "Write a caption" : "Try it free: 3 posts on us"}
            </Link>
          </div>
        </div>
        <figure className="hero-photo">
          <img src={PHOTOS.hero.src} alt={PHOTOS.hero.alt} />
          <div className="float-card">
            <p className="hook">4 years, 3 majors, 1 diploma 🎓</p>
            <p className="muted">thank you to everyone who got me here (especially mom)</p>
          </div>
          <Credit by={PHOTOS.hero.by} link={PHOTOS.hero.link} />
        </figure>
      </main>

      <section className="section">
        <h2>How it works</h2>
        <p className="lead">Set it up once in about two minutes. After that, a caption takes one click.</p>
        <ol className="steps">
          <li>
            <strong>Paste a few old captions</strong>
            <span className="muted">Socially picks up how you write: lowercase or not, your emoji, your humor.</span>
          </li>
          <li>
            <strong>Pick what you&apos;re posting</strong>
            <span className="muted">Graduation, a night out, a big win, a photo dump, or something for your club or side hustle.</span>
          </li>
          <li>
            <strong>Tell it what happened</strong>
            <span className="muted">A sentence is enough. Who was there, what it meant, who you want to thank.</span>
          </li>
          <li>
            <strong>Pick your favorite of 3</strong>
            <span className="muted">Funny, sentimental or a one-liner. Copy it, or make a matching story graphic.</span>
          </li>
        </ol>
      </section>

      <section className="section">
        <h2>Not another AI-sounding caption</h2>
        <p className="lead">Same grad pics, same request. Example only.</p>
        <div className="compare">
          <div className="card bad">
            <p className="eyebrow small-eyebrow">A generic AI chatbot</p>
            <p>🎓✨ Today marks the end of an incredible journey and the beginning of a new chapter! Grateful for every lesson, every late night, and every memory. The future is bright! #Graduation #ClassOf2027 #Blessed #NewBeginnings</p>
          </div>
          <div className="card">
            <p className="eyebrow small-eyebrow">Socially, after reading your old posts</p>
            <p>
              they&apos;re really letting me leave with a degree huh 🎓 thank you mom, dad, and the library
              third floor for raising me
            </p>
            <p className="muted small" style={{ marginTop: 10 }}>
              Doesn&apos;t know your school yet? It leaves a <span className="placeholder-tag">[SCHOOL]</span> for you to fill in instead of guessing.
            </p>
          </div>
        </div>
      </section>

      <section className="section photo-strip">
        <figure>
          <img src={PHOTOS.night.src} alt={PHOTOS.night.alt} />
          <Credit by={PHOTOS.night.by} link={PHOTOS.night.link} />
        </figure>
        <figure>
          <img src={PHOTOS.party.src} alt={PHOTOS.party.alt} />
          <Credit by={PHOTOS.party.by} link={PHOTOS.party.link} />
        </figure>
      </section>

      <section className="section">
        <h2>For your life, and your side hustle</h2>
        <p className="lead">Same tool, two modes.</p>
        <div className="audiences">
          <div className="card">
            <p className="eyebrow small-eyebrow">Personal posts</p>
            <strong>Grad pics, nights out, wins, photo dumps</strong>
            <p className="muted">Short, natural captions in your voice. A LinkedIn version for the internship announcement, too.</p>
          </div>
          <div className="card">
            <p className="eyebrow small-eyebrow">Clubs, businesses &amp; events</p>
            <strong>Promote the thing you run</strong>
            <p className="muted">Add your website and logo. Socially pulls the real dates and details, writes promo posts, and makes branded graphics.</p>
          </div>
        </div>
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
            <strong>Sounds like you, not a chatbot</strong>
            <p className="muted">It learns from your own captions, so your friends won&apos;t clock it as AI.</p>
          </div>
          <div>
            <strong>Never makes stuff up</strong>
            <p className="muted">It only uses what you tell it. Missing details become [placeholders] you fill in.</p>
          </div>
          <div>
            <strong>Pay once, not monthly</strong>
            <p className="muted">One-time ${price}. Cheaper than one coffee run with the group chat.</p>
          </div>
        </div>
        <div className="card pricing">
          <div>
            <p className="eyebrow small-eyebrow">Socially Pro</p>
            <p className="price">${price} <span className="muted small">one time</span></p>
            <p className="muted">Unlimited captions, your voice profile, story graphics, every platform, saved history.</p>
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
