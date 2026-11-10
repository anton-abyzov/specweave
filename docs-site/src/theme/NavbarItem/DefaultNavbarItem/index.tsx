/* WRAP mode: keep the original navbar item, but send app visitors to the app repository. */
import React, {type ReactNode} from 'react';
import DefaultNavbarItem from '@theme-original/NavbarItem/DefaultNavbarItem';
import type {Props} from '@theme/NavbarItem/DefaultNavbarItem';
import useUnprefixedPathname from '@site/src/hooks/useUnprefixedPathname';
import {currentProduct} from '../../Navbar/FamilyBar';

export default function DefaultNavbarItemWrapper(props: Props): ReactNode {
  const pathname = useUnprefixedPathname();
  const appGitHub = props.className?.split(/\s+/).includes('header-github-link')
    && currentProduct(pathname) === 'specwithcode';
  return <DefaultNavbarItem {...props} {...(appGitHub ? {
    href: 'https://github.com/anton-abyzov/specwithcode',
    'aria-label': 'SpecWithCode on GitHub',
  } : {})} />;
}
