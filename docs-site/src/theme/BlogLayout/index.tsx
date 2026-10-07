// Docusaurus 3.9.2 wrap: give the article index a page heading inside its main.
import React, {type ReactNode} from 'react';
import OriginalBlogLayout from '@theme-original/BlogLayout';
import type {Props} from '@theme/BlogLayout';
import Heading from '@theme/Heading';
import {useLocation} from '@docusaurus/router';

export default function BlogLayoutWrapper({children, ...props}: Props): ReactNode {
  const {pathname} = useLocation();
  const isIndex = /^\/blog\/?$/.test(pathname);
  return (
    <OriginalBlogLayout {...props}>
      {isIndex && <header className="margin-bottom--lg">
        <Heading as="h1">SpecWeave Blog</Heading>
        <p>AI coding workflows, SpecWeave updates and agent skill security.</p>
      </header>}
      {children}
    </OriginalBlogLayout>
  );
}
