import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAPIData } from '@/hooks/useAPIData';
import clsx from 'clsx';

interface Example {
  id: string;
  title: string;
  category: string;
  framework: 'three' | 'r3f' | 'babylonjs';
  hasLocalImports: boolean;
  thumbnail?: string;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  three: 'Three.js',
  r3f: 'React Three Fiber',
  babylonjs: 'Babylon.js',
};

const FRAMEWORK_ORDER = ['three', 'r3f', 'babylonjs'];

function GuideSidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const guideNav = [
    {
      title: 'Getting Started',
      items: [
        { to: '/guide', label: 'Introduction' },
        { to: '/guide/quick-start', label: 'Quick Start' },
      ],
    },
    {
      title: 'Essentials',
      items: [
        { to: '/guide/three-usage', label: 'Three.js Usage' },
        { to: '/guide/babylon-usage', label: 'Babylon.js Usage' },
        { to: '/guide/r3f-usage', label: 'React Three Fiber' },
      ],
    },
    {
      title: 'Advanced',
      items: [
        { to: '/guide/custom-materials', label: 'Custom Materials' },
        { to: '/guide/plugins', label: 'Plugins' },
        { to: '/guide/performance', label: 'Performance' },
      ],
    },
  ];

  return (
    <nav>
      {guideNav.map((section) => (
        <div key={section.title} className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 px-3">
            {section.title}
          </h3>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={clsx(
                    'block px-3 py-1.5 text-sm transition-colors border-l-2',
                    isActive(item.to)
                      ? 'text-[var(--color-primary)] border-[var(--color-primary)] font-medium'
                      : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function APISidebar() {
  const location = useLocation();
  const { data, loading } = useAPIData();

  const isActive = (path: string) => location.pathname === path;

  const categories = data?.classes.reduce((acc, cls) => {
    const category = cls.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cls);
    return acc;
  }, {} as Record<string, typeof data.classes>) || {};

  if (loading) {
    return (
      <div className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">Loading...</div>
    );
  }

  return (
    <nav>
      {Object.entries(categories).map(([category, classes]) => (
        <div key={category} className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 px-3">
            {category}
          </h3>
          <ul className="space-y-0.5">
            {classes.map((cls) => (
              <li key={cls.name}>
                <Link
                  to={`/api/${cls.name}`}
                  className={clsx(
                    'block px-3 py-1.5 text-sm transition-colors border-l-2',
                    isActive(`/api/${cls.name}`)
                      ? 'text-[var(--color-primary)] border-[var(--color-primary)] font-medium'
                      : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                  )}
                >
                  {cls.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ExamplesSidebar() {
  const location = useLocation();
  const [examples, setExamples] = useState<Example[]>([]);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}examples.json`)
      .then(res => res.json())
      .then(data => setExamples(data.examples || []))
      .catch(() => {});
  }, []);

  if (examples.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">Loading...</div>
    );
  }

  const byFramework: Record<string, Record<string, Example[]>> = {};
  for (const ex of examples) {
    const fw = ex.framework || 'three';
    if (!byFramework[fw]) byFramework[fw] = {};
    const cat = ex.category || 'general';
    if (!byFramework[fw][cat]) byFramework[fw][cat] = [];
    byFramework[fw][cat].push(ex);
  }

  return (
    <nav>
      {FRAMEWORK_ORDER.filter(fw => byFramework[fw]).map(fw => (
        <div key={fw} className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 px-1">
            {FRAMEWORK_LABELS[fw] || fw}
          </h3>
          {Object.entries(byFramework[fw]).map(([category, exs]) => (
            <div key={category} className="mb-4">
              <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] capitalize">
                {category}
              </div>
              <ul className="space-y-2">
                {exs.map(ex => {
                  const active = isActive(`/examples/${ex.id}`);
                  const thumbUrl = ex.thumbnail
                    ? `${import.meta.env.BASE_URL}${ex.thumbnail}`
                    : null;
                  return (
                    <li key={ex.id}>
                      <Link
                        to={`/examples/${ex.id}`}
                        className={clsx(
                          'block rounded-lg overflow-hidden transition-all',
                          active
                            ? 'ring-2 ring-[var(--color-primary)]'
                            : 'hover:ring-1 hover:ring-[var(--color-border)] opacity-80 hover:opacity-100'
                        )}
                      >
                        <div className="aspect-[16/10] bg-[#0d1117] relative">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={ex.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
                              <span className="text-xl opacity-30">&#9651;</span>
                            </div>
                          )}
                        </div>
                        <div className={clsx(
                          'px-2 py-1.5 text-xs',
                          active
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                        )}>
                          {ex.title}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const location = useLocation();
  const section = location.pathname.startsWith('/api') ? 'api'
    : location.pathname.startsWith('/guide') ? 'guide'
    : location.pathname.startsWith('/examples') ? 'examples'
    : null;

  return (
    <aside className="sidebar p-4 pt-6">
      {section === 'guide' && <GuideSidebar />}
      {section === 'api' && <APISidebar />}
      {section === 'examples' && <ExamplesSidebar />}
    </aside>
  );
}
