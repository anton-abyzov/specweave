/* Swizzled from @docusaurus/theme-classic@3.9.2 -- WRAP mode.
   Renders the Weave family bar above the original Navbar; nothing of the original is copied.
   On upgrade: npx docusaurus swizzle --list to verify the Navbar API is still stable. */

import React, {type ReactNode} from 'react';
import Navbar from '@theme-original/Navbar';
import type NavbarType from '@theme/Navbar';
import type {WrapperProps} from '@docusaurus/types';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import FamilyBar from './FamilyBar';

type Props = WrapperProps<typeof NavbarType>;

export default function NavbarWrapper(props: Props): ReactNode {
  const {pathname} = useLocation();
  // FamilyBar matches unprefixed paths; drop the locale base (/ru/, /ja/ ...).
  const baseUrl = useBaseUrl('/');
  const unprefixed = pathname.startsWith(baseUrl) ? `/${pathname.slice(baseUrl.length)}` : pathname;
  return (
    <>
      <FamilyBar pathname={unprefixed} />
      <Navbar {...props} />
    </>
  );
}
