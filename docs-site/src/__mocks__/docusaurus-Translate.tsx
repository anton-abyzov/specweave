// Test stand-in for @docusaurus/Translate: renders the English message with {placeholders} filled.
import React, {type ReactNode} from 'react';

type Values = Record<string, ReactNode>;

function fill(message: string, values?: Values): ReactNode {
  if (!values) return message;
  const parts = message.split(/(\{\w+\})/g).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return key && key in values ? <React.Fragment key={i}>{values[key]}</React.Fragment> : part;
  });
  return parts.every((p) => typeof p === 'string' || typeof p === 'number') ? parts.join('') : <>{parts}</>;
}

export function translate({message}: {message: string; id?: string; description?: string}, values?: Record<string, string | number>): string {
  return String(fill(message, values as Values));
}

export default function Translate({children, values}: {children: string; id?: string; description?: string; values?: Values}): ReactNode {
  return fill(children, values);
}
