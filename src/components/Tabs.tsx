import { type KeyboardEvent, type ReactNode, useRef } from 'react';
import styles from './Tabs.module.css';

export interface TabOption<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  /** Shared prefix for the tab and panel ids; pass the same value to {@link TabPanel}. */
  idBase: string;
  /** Accessible name for the group of tabs. */
  label: string;
  tabs: readonly TabOption<T>[];
  selected: T;
  onSelect: (id: T) => void;
}

function tabId(idBase: string, id: string): string {
  return `${idBase}-tab-${id}`;
}

function panelId(idBase: string): string {
  return `${idBase}-panel`;
}

/**
 * Tabs that switch the content of one panel on the same page, so they follow the ARIA tabs
 * pattern: only the selected tab is in the tab order, and the arrow, Home and End keys move
 * between tabs and select the one they land on. {@link TabNav} is for tabs that are links.
 */
export function Tabs<T extends string>({ idBase, label, tabs, selected, onSelect }: TabsProps<T>) {
  const buttons = useRef(new Map<T, HTMLButtonElement>());

  // Choosing the tab that is already selected is not a change, so the owner is not told.
  const select = (id: T) => {
    if (id !== selected) onSelect(id);
  };

  const moveTo = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    if (next) {
      select(next.id);
      buttons.current.get(next.id)?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (target !== undefined) {
      event.preventDefault();
      moveTo(target);
    }
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const isSelected = tab.id === selected;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) {
                buttons.current.set(tab.id, element);
              } else {
                buttons.current.delete(tab.id);
              }
            }}
            type="button"
            role="tab"
            id={tabId(idBase, tab.id)}
            aria-selected={isSelected}
            aria-controls={panelId(idBase)}
            tabIndex={isSelected ? 0 : -1}
            className={isSelected ? `${styles.tab} ${styles.selected}` : styles.tab}
            onClick={() => {
              select(tab.id);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  idBase: string;
  /** The selected tab, which names the panel. */
  selected: string;
  children: ReactNode;
}

/** The content of the selected tab. */
export function TabPanel({ idBase, selected, children }: TabPanelProps) {
  return (
    <div role="tabpanel" id={panelId(idBase)} aria-labelledby={tabId(idBase, selected)}>
      {children}
    </div>
  );
}
