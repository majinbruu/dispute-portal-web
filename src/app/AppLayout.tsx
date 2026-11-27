import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useUnreadCount } from '../api/queries';
import { useSession } from '../auth/useSession';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
}

interface AppLayoutProps {
  /** The main navigation of this side of the portal. */
  navItems: NavItem[];
  /** Whether this side of the portal has an inbox; only the customer's does. */
  inbox?: boolean;
}

const MAX_BADGE_COUNT = 99;

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : (styles.navLink ?? '');
}

function InboxLink() {
  const { data: unread = 0 } = useUnreadCount();
  const hasUnread = unread > 0;
  return (
    <NavLink
      to="/inbox"
      className={navLinkClass}
      aria-label={hasUnread ? `Inbox, ${unread} unread` : 'Inbox'}
    >
      Inbox
      {hasUnread ? (
        <span className={styles.unread} aria-hidden="true">
          {unread > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unread}
        </span>
      ) : null}
    </NavLink>
  );
}

/**
 * A client-side navigation does not move focus the way a page load does, so keyboard and screen
 * reader users would be left on the link they activated. Move focus to the new screen instead.
 */
function useFocusOnNavigation() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  return mainRef;
}

/** The signed-in shell: header with navigation, inbox badge and account controls. */
export function AppLayout({ navItems, inbox = false }: AppLayoutProps) {
  const { displayName, signOut } = useSession();
  const mainRef = useFocusOnNavigation();

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            ACME Bank
          </Link>
          <nav className={styles.nav} aria-label="Main">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
            {inbox ? <InboxLink /> : null}
          </nav>
          <div className={styles.account}>
            <span className={styles.userName} title={displayName}>
              <span className="visually-hidden">Signed in as </span>
              {displayName}
            </span>
            <button type="button" className={styles.signOut} onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main" ref={mainRef} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        ACME Bank is a fictional bank used for demonstration purposes.
      </footer>
      <ScrollRestoration />
    </div>
  );
}
