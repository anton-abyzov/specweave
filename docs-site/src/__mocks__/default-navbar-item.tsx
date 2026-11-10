import React from 'react';

export default function DefaultNavbarItem({href, 'aria-label': label}: {href?: string; 'aria-label'?: string}) {
  return <a href={href} aria-label={label} />;
}
