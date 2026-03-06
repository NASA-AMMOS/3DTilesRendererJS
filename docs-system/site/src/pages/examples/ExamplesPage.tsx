import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CodeSandbox } from '@/components/sandbox/CodeSandbox';

interface Example {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  dependencies: string[];
  sourceFile: string;
  framework: 'three' | 'r3f' | 'babylonjs';
  hasLocalImports: boolean;
  htmlElements: string[];
  thumbnail?: string;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  three: 'Three.js',
  r3f: 'React Three Fiber',
  babylonjs: 'Babylon.js',
};

const FRAMEWORK_ORDER = ['three', 'r3f', 'babylonjs'];

function getDeployedUrl(example: Example): string {
  const filename = example.sourceFile
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.jsx?$/, '.html');
  return `${import.meta.env.BASE_URL}example/bundle/${example.framework}/${filename}`;
}

function getThumbnailUrl(example: Example): string | null {
  if (example.thumbnail) {
    return `${import.meta.env.BASE_URL}${example.thumbnail}`;
  }
  return null;
}

function ExampleCard({ example }: { example: Example }) {
  const thumbUrl = getThumbnailUrl(example);

  return (
    <Link
      to={`/examples/${example.id}`}
      className="group block rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all overflow-hidden"
    >
      <div className="aspect-video bg-[#0d1117] relative overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={example.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
            <div className="text-center px-4">
              <div className="text-3xl mb-2 opacity-40">&#9651;</div>
              <span className="text-xs text-gray-500 font-mono">{example.id}</span>
            </div>
          </div>
        )}
        {example.hasLocalImports && (
          <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/80 text-white">
            external deps
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm truncate">{example.title}</h4>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
          {example.description || 'No description available.'}
        </p>
      </div>
    </Link>
  );
}

export function ExamplesPage() {
  const { exampleId } = useParams();
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}examples.json`)
      .then(res => res.json())
      .then(data => {
        setExamples(data.examples || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!exampleId) {
    const byFramework = examples.reduce((acc, ex) => {
      const fw = ex.framework || 'three';
      if (!acc[fw]) acc[fw] = {};
      const cat = ex.category || 'general';
      if (!acc[fw][cat]) acc[fw][cat] = [];
      acc[fw][cat].push(ex);
      return acc;
    }, {} as Record<string, Record<string, Example[]>>);

    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Examples</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Interactive examples demonstrating various features and use cases.
        </p>

        {Object.keys(byFramework).length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            <p>No examples available yet.</p>
            <p className="text-sm mt-2">
              Run the docs build script to generate examples.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {FRAMEWORK_ORDER
              .filter(fw => byFramework[fw])
              .map(fw => (
                <section key={fw}>
                  <h2 className="text-2xl font-semibold mb-5">
                    {FRAMEWORK_LABELS[fw] || fw}
                  </h2>
                  <div className="space-y-6">
                    {Object.entries(byFramework[fw]).map(([category, exs]) => (
                      <div key={category}>
                        <h3 className="text-lg font-medium mb-3 capitalize text-[var(--color-text-secondary)]">
                          {category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {exs.map(example => (
                            <ExampleCard key={example.id} example={example} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>
    );
  }

  const example = examples.find(e => e.id === exampleId);

  if (!example) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">
          Example &quot;{exampleId}&quot; not found.
        </div>
      </div>
    );
  }

  const deployedUrl = getDeployedUrl(example);

  const sourceUrl = `https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/${example.sourceFile.replace(/\\/g, '/')}`;

  return (
    <div className="example-detail-page">
      <header className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{example.title}</h1>
          <span className="text-xs px-2 py-1 rounded bg-[var(--color-border)] text-[var(--color-text-secondary)]">
            {FRAMEWORK_LABELS[example.framework] || example.framework}
          </span>
        </div>
        {example.description && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {example.description}
          </p>
        )}
        <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Source:{' '}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline font-mono"
          >
            {example.sourceFile.replace(/\\/g, '/')}
          </a>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <CodeSandbox
          initialCode={example.code}
          hasLocalImports={example.hasLocalImports}
          htmlElements={example.htmlElements}
          deployedUrl={deployedUrl}
          autoRun
        />
      </div>
    </div>
  );
}
