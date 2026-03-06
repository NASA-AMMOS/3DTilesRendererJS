import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />
      {isLandingPage ? (
        <main>{children}</main>
      ) : (
        <div className="flex">
          <Sidebar />
          <main className="main-content flex-1">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
