/* Replaces @docusaurus/theme-classic Navbar/Logo: the brand slot shows the product the page
   belongs to (SpecWeave, or SpecWithCode under /code/) and links to that product's home. */
import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useUnprefixedPathname from '@site/src/hooks/useUnprefixedPathname';
import {currentProduct, PRODUCTS} from '../FamilyBar';

export default function NavbarLogo(): ReactNode {
  const product = PRODUCTS[currentProduct(useUnprefixedPathname())];
  return (
    <Link to={product.home} className="navbar__brand">
      <b className="navbar__title text--truncate">{product.name}</b>
    </Link>
  );
}
