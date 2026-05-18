import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FiBarChart2, FiBell, FiLayers, FiMenu, FiX, FiChevronDown } from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi2';

interface HeaderProps {
  pageTitle: string;
  description?: string;
  customElement?: React.ReactNode;
}

const navLinkBase =
  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function navClass(active: boolean): string {
  return active
    ? `${navLinkBase} bg-accent/15 text-accent`
    : `${navLinkBase} text-fg-muted hover:bg-surface-inset hover:text-fg`;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, description, customElement }) => {
  const router = useRouter();
  const pathname = router.pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  const isDashboard = pathname === '/dashboard';
  const isStaff = pathname === '/staff';
  const isGroup = pathname.startsWith('/group');
  const isBudgetAlerts = pathname === '/alerts';
  const isPopAlerts = pathname === '/project-end-alerts';
  const alertsSectionActive = isBudgetAlerts || isPopAlerts;

  const closeAlerts = useCallback(() => setIsAlertsOpen(false), []);

  useEffect(() => {
    if (!isAlertsOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = alertsRef.current;
      if (el && !el.contains(e.target as Node)) closeAlerts();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAlerts();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isAlertsOpen, closeAlerts]);

  const handleLogoClick = () => {
    router.push('/dashboard');
  };

  const navigate = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
    setIsAlertsOpen(false);
  };

  const NavItemsDesktop = () => (
    <>
      <button type="button" onClick={() => navigate('/dashboard')} className={navClass(isDashboard)} title="Dashboard">
        <FiBarChart2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>Dashboard</span>
      </button>
      <button type="button" onClick={() => navigate('/staff')} className={navClass(isStaff)} title="Staff">
        <HiOutlineUserGroup className="h-4 w-4 shrink-0" aria-hidden />
        <span>Staff</span>
      </button>
      <button type="button" onClick={() => navigate('/group')} className={navClass(isGroup)} title="Group">
        <FiLayers className="h-4 w-4 shrink-0" aria-hidden />
        <span>Group</span>
      </button>
      <div className="relative" ref={alertsRef}>
        <button
          type="button"
          onClick={() => setIsAlertsOpen((o) => !o)}
          className={navClass(alertsSectionActive)}
          aria-expanded={isAlertsOpen}
          aria-haspopup="menu"
          title="Alerts"
        >
          <FiBell className="h-4 w-4 shrink-0" aria-hidden />
          <span>Alerts</span>
          <FiChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isAlertsOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {isAlertsOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-2 min-w-[14rem] rounded-xl border border-line bg-surface-elevated py-1 shadow-card"
            role="menu"
            aria-label="Alert destinations"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => navigate('/alerts')}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-fg hover:bg-surface-inset focus-visible:bg-surface-inset focus-visible:outline-none"
            >
              <span className="font-medium">Budget alerts</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => navigate('/project-end-alerts')}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-fg hover:bg-surface-inset focus-visible:bg-surface-inset focus-visible:outline-none"
            >
              <span className="font-medium">Contract ending (POP)</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  const NavItemsMobile = () => (
    <nav className="flex flex-col gap-1 border-t border-line bg-surface-elevated p-3" aria-label="Mobile">
      <button type="button" onClick={() => navigate('/dashboard')} className={`${navClass(isDashboard)} w-full justify-start`}>
        <FiBarChart2 className="h-4 w-4" />
        Dashboard
      </button>
      <button type="button" onClick={() => navigate('/staff')} className={`${navClass(isStaff)} w-full justify-start`}>
        <HiOutlineUserGroup className="h-4 w-4" />
        Staff
      </button>
      <button type="button" onClick={() => navigate('/group')} className={`${navClass(isGroup)} w-full justify-start`}>
        <FiLayers className="h-4 w-4" />
        Group
      </button>
      <div className="my-1 border-t border-line" />
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Alerts</p>
      <button type="button" onClick={() => navigate('/alerts')} className={`${navClass(isBudgetAlerts)} w-full justify-start`}>
        <FiBell className="h-4 w-4" />
        Budget alerts
      </button>
      <button type="button" onClick={() => navigate('/project-end-alerts')} className={`${navClass(isPopAlerts)} w-full justify-start`}>
        <FiBell className="h-4 w-4" />
        Contract ending (POP)
      </button>
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex shrink-0 items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Go to dashboard"
          >
            <Image src="/logo-white.svg" alt="WebFirst" width={140} height={40} className="h-8 w-auto" priority />
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            <NavItemsDesktop />
          </nav>

          <div className="flex items-center gap-2">
            {customElement}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setIsMenuOpen((o) => !o)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-fg hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && <NavItemsMobile />}

        <div className="border-t border-line/80 py-4 lg:py-5">
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{pageTitle}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-fg-muted">{description}</p>}
        </div>
      </div>
    </header>
  );
};

export default Header;
