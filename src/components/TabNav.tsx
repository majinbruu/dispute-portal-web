import { NavLink } from 'react-router';
import styles from './TabNav.module.css';

export interface TabLink {
  to: string;
  label: string;
}

interface TabNavProps {
  /** Accessible name for the group of tabs. */
  label: string;
  tabs: TabLink[];
}

/**
 * Tabs that are really links between routes, so they are exposed as navigation with
 * `aria-current="page"` rather than as an ARIA tablist.
 */
export function TabNav({ label, tabs }: TabNavProps) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
