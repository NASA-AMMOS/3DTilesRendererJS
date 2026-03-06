import { Link, useLocation } from 'react-router-dom';
import { useAPIData } from '@/hooks/useAPIData';
import clsx from 'clsx';

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
      {section === 'examples' && (
        <nav>
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 px-3">
              Examples
            </h3>
            <ul className="space-y-0.5">
              <li>
                <Link
                  to="/examples"
                  className="block px-3 py-1.5 text-sm text-[var(--color-text-secondary)] border-l-2 border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)] transition-colors"
                >
                  All Examples
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      )}
    </aside>
  );
}
