import React from 'react';

const Link = ({ to, href, children, ...props }: any) => (
  <a href={to || href} {...props}>{children}</a>
);

export default Link;
