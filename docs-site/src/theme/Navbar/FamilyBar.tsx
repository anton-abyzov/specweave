// Weave family bar: the three products, the current one marked. Rendered by ./index.tsx.
import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';

export type FamilyProduct = 'specweave' | 'specwithcode';

/** /code and /code/... belong to SpecWithCode; every other page here is SpecWeave. */
export function currentProduct(pathname: string): FamilyProduct {
  return /^\/code(\/|$)/.test(pathname) ? 'specwithcode' : 'specweave';
}

export default function FamilyBar({pathname}: {pathname: string}): ReactNode {
  const current = currentProduct(pathname);
  return (
    <div className="sw-family">
      <nav className="wv-family sw-family__inner" aria-label="Products">
        <Link to="/" aria-current={current === 'specweave' ? 'true' : undefined}>
          SpecWeave <span className="wv-family__what">spec and handoff CLI</span>
        </Link>
        <Link to="/code/" aria-current={current === 'specwithcode' ? 'true' : undefined}>
          SpecWithCode <span className="wv-family__what">desktop workspace</span>
        </Link>
        <a href="https://verified-skill.com">
          Verified Skill <span className="wv-family__what">skill registry</span>
        </a>
      </nav>
    </div>
  );
}
