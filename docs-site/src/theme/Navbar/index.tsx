/* Swizzled from @docusaurus/theme-classic@3.9.2 -- WRAP mode.
   Renders the Weave family bar above the original Navbar; nothing of the original is copied.
   On upgrade: npx docusaurus swizzle --list to verify the Navbar API is still stable. */

import React, {type ReactNode} from 'react';
import Navbar from '@theme-original/Navbar';
import type NavbarType from '@theme/Navbar';
import type {WrapperProps} from '@docusaurus/types';
import useUnprefixedPathname from '@site/src/hooks/useUnprefixedPathname';
import FamilyBar from './FamilyBar';

type Props = WrapperProps<typeof NavbarType>;

export default function NavbarWrapper(props: Props): ReactNode {
  // FamilyBar matches unprefixed paths (no /ru/, /ja/ ... base).
  const pathname = useUnprefixedPathname();
  return (
    <>
      <FamilyBar pathname={pathname} />
      <Navbar {...props} />
    </>
  );
}
