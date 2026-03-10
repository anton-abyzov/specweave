import React, {useCallback, useEffect, useRef, useState} from 'react';
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
  /** Ref to the trigger container for positioning */
  triggerRef?: React.RefObject<HTMLDivElement | null>;
  /** Forwarded ref so parent can detect outside clicks on the panel */
  panelRef?: React.RefObject<HTMLDivElement | null>;
  /** Called when mouse enters the panel — parent cancels close timeout */
  onPanelEnter?: () => void;
  /** Called when mouse leaves the panel — parent schedules close */
  onPanelLeave?: () => void;
}

const VIEWPORT_PAD = 16; // px from viewport edges

export default function MegaMenuPanel({
  categories,
  visible,
  onClose,
  columns,
  autoFocus,
  triggerRef,
  panelRef: externalPanelRef,
  onPanelEnter,
  onPanelLeave,
}: Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? internalRef;
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const panel = panelRef.current ?? internalRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>('a[href]');
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
    [onClose, panelRef],
  );

  // Compute fixed position based on trigger rect, clamped to viewport
  useEffect(() => {
    if (!visible || !triggerRef?.current) {
      setPos(null);
      return;
    }

    const compute = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current ?? internalRef.current;
      if (!trigger || !panel) return;

      const triggerRect = trigger.getBoundingClientRect();
      const panelWidth = panel.offsetWidth;
      const vw = window.innerWidth;

      // Position below trigger, centered on trigger
      const top = triggerRect.bottom;
      let left = triggerRect.left + triggerRect.width / 2 - panelWidth / 2;

      // Clamp: don't overflow left viewport edge
      if (left < VIEWPORT_PAD) {
        left = VIEWPORT_PAD;
      }
      // Clamp: don't overflow right viewport edge
      if (left + panelWidth > vw - VIEWPORT_PAD) {
        left = vw - VIEWPORT_PAD - panelWidth;
      }

      setPos({top, left});
    };

    // Compute on next frame so panel has rendered at full size
    requestAnimationFrame(compute);

    // Recompute on scroll/resize
    window.addEventListener('scroll', compute, {passive: true});
    window.addEventListener('resize', compute, {passive: true});
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [visible, triggerRef, panelRef]);

  useEffect(() => {
    if (visible && autoFocus) {
      const panel = panelRef.current ?? internalRef.current;
      if (panel) {
        const firstLink = panel.querySelector<HTMLElement>('a[href]');
        firstLink?.focus();
      }
    }
  }, [visible, autoFocus, panelRef]);

  const colStyle: React.CSSProperties = {
    ...(columns && columns !== 3
      ? {gridTemplateColumns: `repeat(${columns}, 1fr)`}
      : undefined),
    ...(pos ? {top: pos.top, left: pos.left} : undefined),
  };

  // Assign ref: use callback to set both internal and external ref
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (externalPanelRef) {
        (externalPanelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [externalPanelRef],
  );

  return (
    <div
      ref={setRef}
      className={styles.megaMenuPanel}
      role="menu"
      aria-hidden={!visible}
      data-visible={visible}
      onKeyDown={handleKeyDown}
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
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
