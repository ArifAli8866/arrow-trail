import Link from "next/link";

const features = [
  {
    title: "30 hand-tuned levels",
    body: "Easy warm-ups to expert-grade sprawls, each seed generated deterministically so leaderboards stay fair.",
  },
  {
    title: "Live 1v1 races",
    body: "Search a username, send a challenge, and both of you drop into the same maze at the same instant.",
  },
  {
    title: "Presence & chat",
    body: "See who's online right now, message them before, during, and after a race.",
  },
  {
    title: "Ratings & leaderboard",
    body: "Every race moves your rating. Climb the global board or check your personal best times.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--ink-dim)]">
              <span className="status-dot" style={{ background: "var(--trail)" }} />
              players racing right now
            </span>
            <h1 className="display mt-5 text-4xl font-bold leading-[1.05] md:text-6xl">
              Follow the arrows.
              <br />
              <span style={{ color: "var(--trail)" }}>Beat the clock.</span>
              <br />
              Race a friend.
            </h1>
            <p className="mt-5 max-w-md text-[var(--ink-dim)]">
              Arrow Trail is a fast, responsive maze puzzle — trace the one true path from
              start to finish, then challenge anyone online to a live head-to-head.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary">
                Play free — create account
              </Link>
              <Link href="/login" className="btn btn-ghost">
                I already have one
              </Link>
            </div>
          </div>

          <div className="panel flex items-center justify-center p-6">
            <HeroMaze />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="display text-2xl font-bold md:text-3xl">Everything a puzzle ladder needs</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={f.title} className="panel p-5">
              <span className="text-xs font-mono" style={{ color: "var(--spark)" }}>
                0{i + 1}
              </span>
              <h3 className="display mt-2 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--ink-dim)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="panel flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="display text-2xl font-bold">Ready to race the maze?</h2>
          <p className="max-w-md text-sm text-[var(--ink-dim)]">
            Free account, works on your phone or your desktop, no download.
          </p>
          <Link href="/signup" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroMaze() {
  // Small static decorative arrow-grid — purely visual, not the game engine.
  const arrows = ["↑", "→", "→", "↓", "←", "↑", "→", "↓", "↓", "→", "↑", "←"];
  return (
    <div className="grid grid-cols-4 gap-2">
      {arrows.map((a, i) => (
        <span
          key={i}
          className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold"
          style={{
            background: i % 5 === 0 ? "rgba(94,230,201,0.15)" : "var(--bg-panel-raised)",
            color: i % 5 === 0 ? "var(--trail)" : "var(--ink-dim)",
            border: "1px solid var(--line)",
          }}
        >
          {a}
        </span>
      ))}
    </div>
  );
}
