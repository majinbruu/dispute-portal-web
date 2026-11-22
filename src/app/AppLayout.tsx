import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { useUnreadCount } from '../api/queries';
import { useSession } from '../auth/useSession';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/debit-orders', label: 'Debit orders' },
  { to: '/disputes', label: 'Disputes' },
  { to: '/mandates', label: 'Mandates' },
];

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

/** The signed-in shell: header with navigation, inbox badge and account controls. */
export function AppLayout() {
  const { displayName, signOut } = useSession();

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
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
            <InboxLink />
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
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        ACME Bank is a fictional bank used for demonstration purposes.
      </footer>
      <ScrollRestoration />
    </div>
  );
}
