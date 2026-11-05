import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {unprefixPathname} from '../lib/unprefixPathname';

/** The current pathname without the locale base, so code can match "/code/" in every locale. */
export default function useUnprefixedPathname(): string {
  const {pathname} = useLocation();
  const {siteConfig} = useDocusaurusContext();
  return unprefixPathname(pathname, siteConfig.baseUrl);
}
