/* Swizzled from @docusaurus/theme-classic@3.9.2 -- EJECT mode.
   The Weave shell footer (.wv-footer in weave.css): a brand block and four columns, the same
   structure as verified-skill.com. Only the second column changes with the product.
   On upgrade, compare themeConfig.footer schema for breaking changes and port manually. */
import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useUnprefixedPathname from '@site/src/hooks/useUnprefixedPathname';
import {currentProduct, PRODUCTS, type FamilyProduct} from '../Navbar/FamilyBar';
import styles from './Footer.module.css';

type FooterLink = {label: string; to?: string; href?: string};
type FooterColumn = {title: string; links: FooterLink[]};

function productColumn(product: FamilyProduct): FooterColumn {
  if (product === 'specwithcode') {
    return {
      title: 'SpecWithCode',
      links: [
        {label: translate({id: 'footer.link.app.overview', message: 'SpecWithCode overview', description: 'Footer link label. Keep product names in English'}), to: '/docs/overview/studio'},
        {label: translate({id: 'footer.link.project.downloadSpecwithcode', message: 'Download SpecWithCode', description: 'Footer link label. Keep product names in English'}), to: '/code/download/'},
        {label: translate({id: 'footer.link.app.harnesses', message: 'Harnesses and models', description: 'Footer link label'}), to: '/docs/studio/harnesses/'},
        {label: 'SpecWithCode Browser', to: '/docs/studio/browser'},
        {label: translate({id: 'footer.link.start.tutorials', message: 'Tutorials', description: 'Footer link label'}), to: '/tutorials'},
        {label: translate({id: 'footer.link.project.pricing', message: 'Pricing', description: 'Footer link label'}), to: '/pricing'},
        {label: translate({id: 'footer.link.project.sendFeedback', message: 'Send feedback', description: 'Footer link to the SpecWithCode GitHub issue forms'}), href: 'https://github.com/anton-abyzov/specwithcode/issues/new/choose'},
      ],
    };
  }
  return {
    title: 'SpecWeave',
    links: [
      {label: translate({id: 'footer.link.start.whatIsSpecweave', message: 'What is SpecWeave?', description: 'Footer link label. Keep product names in English'}), to: '/docs/overview/introduction'},
      {label: translate({id: 'footer.link.start.quickStart', message: 'Quick start', description: 'Footer link label'}), to: '/docs/getting-started'},
      {label: translate({id: 'footer.link.start.tutorials', message: 'Tutorials', description: 'Footer link label'}), to: '/tutorials'},
      {label: translate({id: 'footer.link.start.howItWorks', message: 'How it works', description: 'Footer link label'}), to: '/docs/overview/how-it-works'},
      {label: translate({id: 'footer.link.reference.commands', message: 'Commands', description: 'Footer link label'}), to: '/docs/reference/commands'},
      {label: translate({id: 'footer.link.reference.skills', message: 'Skills', description: 'Footer link label'}), to: '/docs/reference/skills'},
      {label: translate({id: 'footer.link.switchTools.integrations', message: 'Integrations', description: 'Footer link label'}), to: '/integrations'},
      {label: translate({id: 'footer.link.reference.changelog', message: 'Changelog', description: 'Footer link label'}), to: '/docs/reference/changelog'},
    ],
  };
}

function getColumns(product: FamilyProduct): FooterColumn[] {
  return [
    {
      title: translate({id: 'footer.column.products', message: 'Products', description: 'Footer column title: the three products of the family'}),
      links: [
        {label: 'SpecWeave', to: '/'},
        {label: 'SpecWithCode', to: '/code/'},
        {label: 'Verified Skill', href: 'https://verified-skill.com'},
      ],
    },
    productColumn(product),
    {
      title: translate({id: 'footer.column.guides', message: 'Guides', description: 'Footer column title'}),
      links: [
        {label: translate({id: 'footer.link.switchTools.handoffAndPickup', message: 'Handoff and pickup', description: 'Footer link label'}), to: '/docs/guides/cross-tool-handoff'},
        {label: translate({id: 'footer.link.switchTools.whatGoesInHandoffMd', message: 'What goes in handoff.md', description: 'Footer link label. Keep product names in English'}), to: '/docs/guides/handoff-md/'},
        {label: translate({id: 'footer.link.switchTools.claudeCodeToCodex', message: 'Claude Code to Codex', description: 'Footer link label. Keep product names in English'}), to: '/docs/guides/switch-claude-code-to-codex/'},
        {label: translate({id: 'footer.link.switchTools.usageLimitReached', message: 'Usage limit reached', description: 'Footer link label'}), to: '/docs/guides/claude-code-usage-limit/'},
        {label: translate({id: 'footer.link.compare.claudeCodeVsCodex', message: 'Claude Code vs Codex', description: 'Footer link label. Keep product names in English'}), to: '/docs/guides/claude-code-vs-codex/'},
        {label: translate({id: 'footer.link.compare.specweaveVsOpenspec', message: 'SpecWeave vs OpenSpec', description: 'Footer link label. Keep product names in English'}), to: '/docs/compare/specweave-vs-openspec/'},
        {label: translate({id: 'footer.link.compare.specweaveVsSpecKit', message: 'SpecWeave vs Spec Kit', description: 'Footer link label. Keep product names in English'}), to: '/docs/compare/specweave-vs-github-spec-kit/'},
        {label: translate({id: 'footer.link.compare.allSpecDrivenTools', message: 'All spec-driven tools', description: 'Footer link label'}), to: '/docs/compare/spec-driven-development-tools/'},
        {label: translate({id: 'footer.link.compare.allComparisons', message: 'All comparisons', description: 'Footer link label'}), to: '/docs/compare/'},
        {label: 'Claude Code skills', href: 'https://verified-skill.com/claude-code-skills'},
      ],
    },
    {
      title: translate({id: 'footer.column.project', message: 'Project', description: 'Footer column title'}),
      links: [
        {label: 'SpecWithCode GitHub', href: 'https://github.com/anton-abyzov/specwithcode'},
        {label: 'SpecWeave GitHub', href: 'https://github.com/anton-abyzov/specweave'},
        {label: 'npm', href: 'https://www.npmjs.com/package/specweave'},
        {label: translate({id: 'footer.link.project.blog', message: 'Blog', description: 'Footer link label'}), to: '/blog'},
        {label: translate({id: 'footer.link.project.privacy', message: 'Privacy', description: 'Footer link label'}), to: '/privacy'},
        {label: translate({id: 'footer.link.project.support', message: 'Support', description: 'Footer link label'}), to: '/support'},
      ],
    },
  ];
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
    </svg>
  );
}

function XTwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31.3 31.3 0 000 12a31.3 31.3 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31.3 31.3 0 0024 12a31.3 31.3 0 00-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  );
}

function getSocialLinks(app: boolean) {
  const repo = app ? 'specwithcode' : 'specweave';
  return [
    {label: 'GitHub', href: `https://github.com/anton-abyzov/${repo}`, icon: GitHubIcon},
    {
      label: translate({
        id: 'footer.social.githubIssues',
        message: 'GitHub Issues',
        description: 'Accessible label for the GitHub Issues icon link in the footer. Keep product names in English',
      }),
      href: `https://github.com/anton-abyzov/${repo}/issues`,
      icon: SupportIcon,
    },
    {label: 'X / Twitter', href: 'https://x.com/aabyzov', icon: XTwitterIcon},
    {label: 'YouTube', href: 'https://www.youtube.com/@antonabyzov', icon: YouTubeIcon},
  ];
}

function Footer(): ReactNode {
  const product = currentProduct(useUnprefixedPathname());
  const brand = PRODUCTS[product];
  const columns = getColumns(product);
  const socialLinks = getSocialLinks(product === 'specwithcode');
  return (
    <footer className="wv-footer">
      <div className="wv-footer__inner wv-shell__inner">
        <div className="wv-footer__brand">
          <Link to={brand.home} className="wv-nav__brand">{brand.name}</Link>
          <p>
            {product === 'specwithcode' ? (
              <Translate id="footer.brand.specwithcode" description="One line under the SpecWithCode name in the footer. Keep product names in English">One chat for your coding agents, on every machine and every plan.</Translate>
            ) : (
              <Translate id="footer.brand.specweave" description="One line under the SpecWeave name in the footer">The plan and every finished task live in git, so any agent can pick up the work.</Translate>
            )}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2>{col.title}</h2>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to}>{link.label}</Link>
                  ) : (
                    <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="wv-footer__legal wv-shell__inner">
        <span>
          <Translate
            id="footer.copyright"
            description="Footer copyright line; {year} is the current year. Keep product names in English"
            values={{year: new Date().getFullYear()}}>
            {'© {year} SpecWeave. SpecWeave CLI: MIT licensed. SpecWithCode: free, MIT licensed.'}
          </Translate>
        </span>
        <span className={styles.socialIcons}>
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label={social.label}
            >
              <social.icon />
            </a>
          ))}
        </span>
      </div>
    </footer>
  );
}

export default React.memo(Footer);
