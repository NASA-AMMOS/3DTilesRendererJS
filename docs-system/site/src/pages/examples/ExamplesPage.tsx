import { useParams } from 'react-router-dom';
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
}

export function ExamplesPage() {
  const { exampleId } = useParams();
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/examples.json')
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

  // Show example list if no specific example selected
  if (!exampleId) {
    const categories = examples.reduce((acc, ex) => {
      if (!acc[ex.category]) acc[ex.category] = [];
      acc[ex.category].push(ex);
      return acc;
    }, {} as Record<string, Example[]>);

    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Examples</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Interactive examples demonstrating various features and use cases.
        </p>

        {Object.keys(categories).length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            <p>No examples available yet.</p>
            <p className="text-sm mt-2">
              Run the docs build script to generate examples.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(categories).map(([category, exs]) => (
              <section key={category}>
                <h2 className="text-xl font-semibold mb-4 capitalize">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exs.map(example => (
                    <a
                      key={example.id}
                      href={`/examples/${example.id}`}
                      className="block p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
                    >
                      <h3 className="font-medium">{example.title}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                        {example.description || 'No description available.'}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show specific example
  const example = examples.find(e => e.id === exampleId);

  if (!example) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">
          Example "{exampleId}" not found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{example.title}</h1>
        {example.description && (
          <p className="text-[var(--color-text-secondary)] mt-2">
            {example.description}
          </p>
        )}
      </div>

      <CodeSandbox
        initialCode={example.code}
        dependencies={example.dependencies}
      />

      <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
        Source: <code>{example.sourceFile}</code>
      </div>
    </div>
  );
}
