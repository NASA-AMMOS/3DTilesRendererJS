import { Link, useParams } from 'react-router-dom';
import { useAPIData } from '@/hooks/useAPIData';
import { ClassDoc } from '@/components/docs/ClassDoc';

function APIOverview() {
  const { data, loading, error } = useAPIData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading API data: {error.message}</div>
      </div>
    );
  }

  const categories = data?.classes.reduce((acc, cls) => {
    const category = cls.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cls);
    return acc;
  }, {} as Record<string, typeof data.classes>) || {};

  return (
    <div>
      {Object.entries(categories).map(([category, classes]) => (
        <section key={category} className="mb-10">
          <h2 className="text-2xl font-bold mb-5">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {classes.map((cls) => (
              <div
                key={cls.name}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5"
              >
                <Link
                  to={`/api/${cls.name}`}
                  className="text-[var(--color-primary)] font-semibold font-mono hover:underline"
                >
                  {cls.name}
                </Link>
                {cls.extends && (
                  <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                    extends {cls.extends}
                  </span>
                )}

                <ul className="mt-3 space-y-1">
                  {cls.properties?.slice(0, 5).map((prop: any) => (
                    <li key={prop.name}>
                      <Link
                        to={`/api/${cls.name}`}
                        className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                      >
                        {prop.name}
                      </Link>
                    </li>
                  ))}
                  {cls.methods?.slice(0, 8).map((method: any) => (
                    <li key={method.name}>
                      <Link
                        to={`/api/${cls.name}`}
                        className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                      >
                        {method.name}()
                      </Link>
                    </li>
                  ))}
                  {((cls.properties?.length || 0) + (cls.methods?.length || 0)) > 13 && (
                    <li className="text-xs text-[var(--color-text-secondary)] opacity-60 pt-1">
                      ...and more
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function APIPage() {
  const { className } = useParams();
  const { classData, loading, error } = useAPIData(className);

  if (!className) {
    return <APIOverview />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading API data: {error.message}</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-secondary)]">
          Class &quot;{className}&quot; not found.
        </div>
      </div>
    );
  }

  return <ClassDoc data={classData} />;
}
