/* Swizzled from @docusaurus/theme-classic@3.9.2 -- WRAP mode.
   On upgrade: npx docusaurus swizzle --list to verify NavbarItem API stability. */

import React, {type ReactNode} from 'react';
import NavbarItem from '@theme-original/NavbarItem';
import type NavbarItemType from '@theme/NavbarItem';
import type {WrapperProps} from '@docusaurus/types';

type Props = WrapperProps<typeof NavbarItemType>;

export default function NavbarItemWrapper(props: Props): ReactNode {
  return <NavbarItem {...props} />;
}
