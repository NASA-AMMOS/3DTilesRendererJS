import { Link } from 'react-router-dom';
import { CodeBlock } from '@/components/docs/CodeBlock';

export function QuickStartPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Quick Start</h1>
      <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
        3D Tiles Renderer is a JavaScript implementation for the{' '}
        <a
          href="https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] hover:underline"
        >
          OGC 3D Tiles specification
        </a>
        , supporting <strong>Three.js</strong>, <strong>Babylon.js</strong>, and{' '}
        <strong>React Three Fiber</strong>.
      </p>

      {/* Installation */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Installation</h2>
        <CodeBlock code="npm install 3d-tiles-renderer --save" language="bash" />
      </section>

      {/* Basic Usage */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Basic Usage</h2>
        <CodeBlock code={`import { TilesRenderer } from '3d-tiles-renderer';

const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.setCamera( camera );
tilesRenderer.setResolutionFromRenderer( camera, renderer );

// add to scene
scene.add( tilesRenderer.group );

// render loop
function animate() {
  requestAnimationFrame( animate );
  tilesRenderer.update();
  renderer.render( scene, camera );
}`} language="javascript" />
      </section>

      {/* Framework Guides */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Framework Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://github.com/NASA-AMMOS/3DTilesRendererJS/tree/master/example"
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-semibold mb-1 group-hover:text-[var(--color-primary)] transition-colors">
              Three.js
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Setup, custom materials, DRACO, Cesium Ion, and more.
            </p>
          </a>
          <a
            href="https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/src/babylonjs/renderer/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-semibold mb-1 group-hover:text-[var(--color-primary)] transition-colors">
              Babylon.js
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Renderer setup, usage, and limitations.
            </p>
          </a>
          <a
            href="https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/src/r3f/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-semibold mb-1 group-hover:text-[var(--color-primary)] transition-colors">
              React Three Fiber
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              R3F components for 3D Tiles.
            </p>
          </a>
        </div>
      </section>

      {/* Supported Features */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Supported Features</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Full OGC 3D Tiles 1.0 and 1.1 support',
            'B3DM, I3DM, PNTS, CMPT formats',
            'Google Photorealistic 3D Tiles',
            'Cesium Ion integration',
            'Image overlay plugins (WMS, WMTS, TMS, XYZ)',
            'Level of Detail (LOD) management',
            'Custom material support',
            'TypeScript support',
          ].map((feature, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      {/* Next Steps */}
      <section className="border-t border-[var(--color-border)] pt-8">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/api"
            className="group block p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <span className="font-medium group-hover:text-[var(--color-primary)] transition-colors">
              API Reference &rarr;
            </span>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Explore the complete API documentation.
            </p>
          </Link>
          <Link
            to="/examples"
            className="group block p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <span className="font-medium group-hover:text-[var(--color-primary)] transition-colors">
              Examples &rarr;
            </span>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Interactive demos and use cases.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
