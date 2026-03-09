/* Swizzled from @docusaurus/theme-classic@3.9.2 -- WRAP mode.
   On upgrade: npx docusaurus swizzle --list to verify NavbarItem API stability. */

import React, {useState, useCallback, useRef, useEffect, type ReactNode} from 'react';
import NavbarItem from '@theme-original/NavbarItem';
import type NavbarItemType from '@theme/NavbarItem';
import type {WrapperProps} from '@docusaurus/types';
import MegaMenuPanel from './MegaMenuPanel';
import type {MegaMenuCategory} from './MegaMenuPanel';
import styles from './MegaMenuPanel.module.css';

type Props = WrapperProps<typeof NavbarItemType>;

// Global coordination: only one mega menu open at a time.
// Each instance gets a unique ID; opening one dispatches an event
// that causes all others to close.
let instanceCounter = 0;

function MegaMenuNavbarItem({
  props,
  categories,
}: {
  props: Props;
  categories: MegaMenuCategory[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceIdRef = useRef(++instanceCounter);

  const handleOpen = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    // Tell all other mega menus to close
    window.dispatchEvent(
      new CustomEvent('megamenu:open', {detail: instanceIdRef.current}),
    );
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 120);
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        window.dispatchEvent(
          new CustomEvent('megamenu:open', {detail: instanceIdRef.current}),
        );
      }
      return !prev;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      } else if (e.key === 'ArrowDown' && !open) {
        e.preventDefault();
        handleOpen();
      }
    },
    [open, handleToggle, handleOpen],
  );

  // Listen for other mega menus opening — close this one
  useEffect(() => {
    const onOtherOpen = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (detail !== instanceIdRef.current) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        setOpen(false);
      }
    };
    window.addEventListener('megamenu:open', onOtherOpen);
    return () => window.removeEventListener('megamenu:open', onOtherOpen);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Clean up close timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const colCount = categories.length;

  return (
    <div
      ref={containerRef}
      className={styles.megaMenuTrigger}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <div
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleToggle}
      >
        <NavbarItem {...props} />
      </div>
      {/* Backdrop dims page content when menu is open */}
      {open && <div className={styles.megaMenuBackdrop} onClick={() => setOpen(false)} />}
      <MegaMenuPanel
        categories={categories}
        visible={open}
        onClose={() => setOpen(false)}
        columns={colCount}
      />
    </div>
  );
}

export default function NavbarItemWrapper(props: Props): ReactNode {
  const customProps = (props as any).customProps as
    | {megaMenu?: boolean; megaMenuCategories?: MegaMenuCategory[]}
    | undefined;

  if (!customProps?.megaMenu || !customProps.megaMenuCategories) {
    return <NavbarItem {...props} />;
  }

  return (
    <MegaMenuNavbarItem
      props={props}
      categories={customProps.megaMenuCategories}
    />
  );
}
