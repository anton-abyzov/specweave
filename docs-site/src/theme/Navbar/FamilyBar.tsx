// Weave family bar: the three products, the current one underlined by the thread. Rendered by ./index.tsx.
import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';

export type FamilyProduct = 'specweave' | 'specwithcode';

/** /code and /code/... belong to SpecWithCode; every other page here is SpecWeave. */
export function currentProduct(pathname: string): FamilyProduct {
  return /^\/code(\/|$)/.test(pathname) ? 'specwithcode' : 'specweave';
}

/** Name and home of the product a page belongs to; the navbar brand slot shows it. */
export const PRODUCTS: Record<FamilyProduct, {name: string; home: string}> = {
  specweave: {name: 'SpecWeave', home: '/'},
  specwithcode: {name: 'SpecWithCode', home: '/code/'},
};

export default function FamilyBar({pathname}: {pathname: string}): ReactNode {
  const current = currentProduct(pathname);
  return (
    <div className="wv-shell-bar">
      <nav className="wv-family wv-shell__inner" aria-label={translate({id: 'navbar.family.ariaLabel', message: 'Products', description: 'Accessible label for the product family bar at the top of every page'})}>
        <Link to="/" aria-current={current === 'specweave' ? 'true' : undefined}>
          SpecWeave <span className="wv-family__what"><Translate id="navbar.family.specweave.what" description="Short description shown after the product name SpecWeave in the family bar">spec and handoff CLI</Translate></span>
        </Link>
        <Link to="/code/" aria-current={current === 'specwithcode' ? 'true' : undefined}>
          SpecWithCode <span className="wv-family__what"><Translate id="navbar.family.specwithcode.what" description="Short description shown after the product name SpecWithCode in the family bar">desktop workspace</Translate></span>
        </Link>
        <a href="https://verified-skill.com">
          Verified Skill <span className="wv-family__what"><Translate id="navbar.family.verifiedSkill.what" description="Short description shown after the product name Verified Skill in the family bar">skill registry</Translate></span>
        </a>
      </nav>
    </div>
  );
}
