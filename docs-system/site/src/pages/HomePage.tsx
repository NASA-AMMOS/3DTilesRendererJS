import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    title: 'Full 3D Tiles Support',
    description: 'Complete OGC 3D Tiles 1.0 & 1.1 specification support including B3DM, I3DM, PNTS, CMPT, and glTF formats.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'High Performance',
    description: 'Intelligent LOD management with priority-based tile loading for smooth rendering of massive geospatial datasets.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
      </svg>
    ),
    title: 'Plugin Ecosystem',
    description: 'Extensible plugin architecture with built-in support for Google Maps, Cesium Ion, image overlays, and more.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
      </svg>
    ),
    title: 'Multi-Framework',
    description: 'Works seamlessly with Three.js, Babylon.js, and React Three Fiber — choose your preferred rendering engine.',
  },
];

export function HomePage() {
  return (
    <div className="min-h-[calc(100vh-var(--header-height))]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="max-w-[960px] mx-auto px-6 pt-20 pb-16 text-center relative">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-[var(--color-primary)] to-purple-500 bg-clip-text text-transparent">
              3D Tiles Renderer
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-[var(--color-text-secondary)] max-w-[640px] mx-auto mb-10 leading-relaxed">
            A high-performance JavaScript library for rendering{' '}
            <a
              href="https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:underline"
            >
              OGC 3D Tiles
            </a>{' '}
            in the browser.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/guide/quick-start"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[var(--color-primary)]/25"
            >
              Get Started
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="https://github.com/NASA-AMMOS/3DTilesRendererJS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--color-border)] font-medium hover:border-[var(--color-text-secondary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
          </div>

          {/* Install snippet */}
          <div className="mt-12 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-sm">
            <span className="text-[var(--color-text-secondary)]">$</span>
            <span>npm install 3d-tiles-renderer</span>
            <button
              onClick={() => navigator.clipboard.writeText('npm install 3d-tiles-renderer')}
              className="p-1 rounded hover:bg-[var(--color-border)] transition-colors text-[var(--color-text-secondary)]"
              title="Copy"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Banner Image */}
      <section className="max-w-[960px] mx-auto px-6 pb-16">
        <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xl">
          <img
            src="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesRendererJS/master/images/header-mars.png"
            alt="3D Tiles Renderer Mars Demo"
            className="w-full"
          />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[960px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]/40 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="max-w-[960px] mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/api"
              className="group block p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                API Reference
                <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Complete documentation for TilesRenderer, plugins, overlays, and all public APIs.
              </p>
            </Link>
            <Link
              to="/examples"
              className="group block p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                Examples
                <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Interactive demos showcasing Google Maps, Cesium Ion, WMTS overlays, and more.
              </p>
            </Link>
            <a
              href="https://github.com/NASA-AMMOS/3DTilesRendererJS"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                GitHub
                <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Source code, issues, contributing guidelines, and release notes.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="max-w-[960px] mx-auto px-6 py-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Released under the{' '}
            <a
              href="https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:underline"
            >
              Apache V2.0 License
            </a>
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 opacity-70">
            Copyright &copy; 2020 California Institute of Technology. United States Government Sponsorship Acknowledged.
          </p>
        </div>
      </footer>
    </div>
  );
}
