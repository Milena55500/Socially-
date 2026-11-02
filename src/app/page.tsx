export default function Home() {
  return (
    <div className="page">
      <header className="nav">
        <span className="logo">
          <span className="logo-dot" /> Socially
        </span>
      </header>

      <main className="hero">
        <p className="eyebrow">AI-powered social media assistant</p>
        <h1>
          Never stare at a <span className="highlight">blank post</span> again.
        </h1>
        <p className="lead">
          Socially helps small businesses and content creators grow their online presence. Tell it
          about your brand, and it generates fresh post ideas, writes engaging captions, and
          suggests the right hashtags in seconds.
        </p>

        <ul className="features">
          <li>
            <strong>Post ideas</strong>
            <span>Never run out of things to share.</span>
          </li>
          <li>
            <strong>Captions</strong>
            <span>Written in your brand&apos;s voice.</span>
          </li>
          <li>
            <strong>Hashtags</strong>
            <span>Reach the people who care.</span>
          </li>
        </ul>
      </main>

      <footer className="footer">
        <p>Created by Milena Lombardo</p>
        <p className="muted">© {new Date().getFullYear()} Socially</p>
      </footer>
    </div>
  );
}
