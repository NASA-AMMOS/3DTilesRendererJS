import { Link } from 'react-router-dom';

export function GuidePage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Introduction</h1>
      <p className="text-[var(--color-text-secondary)] mb-6 leading-relaxed">
        3D Tiles Renderer is a high-performance JavaScript library for rendering{' '}
        <a
          href="https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] hover:underline"
        >
          OGC 3D Tiles
        </a>{' '}
        in the browser. It supports <strong>Three.js</strong>, <strong>Babylon.js</strong>, and{' '}
        <strong>React Three Fiber</strong>.
      </p>
      <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
        To get started with installation and basic usage, see the{' '}
        <Link to="/guide/quick-start" className="text-[var(--color-primary)] hover:underline font-medium">
          Quick Start
        </Link>{' '}
        guide.
      </p>
    </div>
  );
}
