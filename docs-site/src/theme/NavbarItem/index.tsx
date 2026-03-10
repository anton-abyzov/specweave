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
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceIdRef = useRef(++instanceCounter);
  const openedViaKeyboardRef = useRef(false);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    cancelClose();
    // Tell all other mega menus to close
    window.dispatchEvent(
      new CustomEvent('megamenu:open', {detail: instanceIdRef.current}),
    );
    openedViaKeyboardRef.current = false;
    setOpen(true);
  }, [cancelClose]);

  const handleClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 150);
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
        openedViaKeyboardRef.current = true;
        handleToggle();
      } else if (e.key === 'ArrowDown' && !open) {
        e.preventDefault();
        openedViaKeyboardRef.current = true;
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
        cancelClose();
        setOpen(false);
      }
    };
    window.addEventListener('megamenu:open', onOtherOpen);
    return () => window.removeEventListener('megamenu:open', onOtherOpen);
  }, [cancelClose]);

  // Close on outside click — check both container and panel
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inContainer && !inPanel) {
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

  // Panel mouse handlers — cancel close when entering panel, schedule close when leaving
  const handlePanelEnter = useCallback(() => {
    cancelClose();
  }, [cancelClose]);

  const handlePanelLeave = useCallback(() => {
    handleClose();
  }, [handleClose]);

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
        autoFocus={openedViaKeyboardRef.current}
        triggerRef={containerRef}
        panelRef={panelRef}
        onPanelEnter={handlePanelEnter}
        onPanelLeave={handlePanelLeave}
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
