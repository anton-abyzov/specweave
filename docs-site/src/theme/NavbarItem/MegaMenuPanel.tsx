import React, {useCallback, useEffect, useRef} from 'react';
import Link from '@docusaurus/Link';
import styles from './MegaMenuPanel.module.css';

export interface MegaMenuLink {
  title: string;
  description?: string;
  to: string;
}

export interface MegaMenuCategory {
  categoryTitle: string;
  links: MegaMenuLink[];
}

interface Props {
  categories: MegaMenuCategory[];
  visible: boolean;
  onClose: () => void;
  columns?: number;
  autoFocus?: boolean;
}

export default function MegaMenuPanel({categories, visible, onClose, columns, autoFocus}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (!panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href]');
      const items = Array.from(focusable);
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (visible && autoFocus && panelRef.current) {
      const firstLink = panelRef.current.querySelector<HTMLElement>('a[href]');
      firstLink?.focus();
    }
  }, [visible, autoFocus]);

  const colStyle = columns && columns !== 3
    ? {gridTemplateColumns: `repeat(${columns}, 1fr)`} as React.CSSProperties
    : undefined;

  return (
    <div
      ref={panelRef}
      className={styles.megaMenuPanel}
      role="menu"
      aria-hidden={!visible}
      data-visible={visible}
      onKeyDown={handleKeyDown}
      style={colStyle}
    >
      {categories.map((cat) => (
        <div key={cat.categoryTitle} className={styles.megaMenuCategory}>
          <div className={styles.megaMenuCategoryTitle}>{cat.categoryTitle}</div>
          {cat.links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={styles.megaMenuLink}
              role="menuitem"
              onClick={onClose}
            >
              <div className={styles.megaMenuLinkTitle}>{link.title}</div>
              {link.description && (
                <div className={styles.megaMenuLinkDesc}>{link.description}</div>
              )}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
