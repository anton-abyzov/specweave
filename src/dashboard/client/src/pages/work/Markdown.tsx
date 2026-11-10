/** Renders the markdown subset specs use, as React elements (no HTML is ever injected). */
import { Fragment, type ReactNode } from 'react';

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*\*)/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const token = match[0];
    const id = `${key}-${n++}`;
    if (token.startsWith('`')) out.push(<code key={id}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) out.push(<strong key={id}>{inline(token.slice(2, -2), id)}</strong>);
    else if (token.startsWith('[')) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      out.push(
        /^https?:\/\//.test(href ?? '') ? (
          <a key={id} href={href} target="_blank" rel="noreferrer noopener">
            {label}
          </a>
        ) : (
          <span key={id} className="wb-md-ref" title={href}>
            {label}
          </span>
        ),
      );
    } else out.push(<em key={id}>{token.slice(1, -1)}</em>);
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/^---\n[\s\S]*?\n---\n/, '').split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  const key = () => `b${blocks.length}`;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++;
      blocks.push(<pre key={key()}>{body.join('\n')}</pre>);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      const Tag = `h${level}` as 'h2';
      blocks.push(<Tag key={key()}>{inline(heading[2], key())}</Tag>);
      i++;
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={key()} />);
      i++;
      continue;
    }
    if (line.trim().startsWith('|') && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      const k = key();
      blocks.push(
        <div className="wb-md-table" key={k}>
          <table>
            <thead>
              <tr>
                {head.map((cell, c) => (
                  <th key={c}>{inline(cell, `${k}h${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{inline(cell, `${k}r${r}c${c}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push(<blockquote key={key()}>{inline(body.join(' '), key())}</blockquote>);
      continue;
    }
    const item = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
    if (item.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const entries: Array<{ depth: number; text: string }> = [];
      while (i < lines.length) {
        const m = lines[i].match(item);
        if (m) entries.push({ depth: Math.floor(m[1].replace(/\t/g, '  ').length / 2), text: m[3] });
        else if (lines[i].trim() && /^\s+/.test(lines[i]) && entries.length)
          entries[entries.length - 1].text += ` ${lines[i].trim()}`;
        else break;
        i++;
      }
      const k = key();
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={k}>
          {entries.map((entry, n) => {
            const box = entry.text.match(/^\[([ xX])\]\s+(.*)$/);
            return (
              <li key={n} style={entry.depth ? { marginLeft: entry.depth * 18 } : undefined} className={box ? 'wb-md-check' : undefined}>
                {box && <span className={box[1] === ' ' ? 'wb-md-box' : 'wb-md-box is-done'} aria-hidden="true" />}
                {inline(box ? box[2] : entry.text, `${k}i${n}`)}
              </li>
            );
          })}
        </List>,
      );
      continue;
    }
    const body: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|\s*(```|~~~)|\s*>|\s*([-*+]|\d+[.)])\s)/.test(lines[i]) &&
      !(lines[i].trim().startsWith('|') && body.length === 0)
    )
      body.push(lines[i++].trim());
    if (!body.length) body.push(lines[i++].trim());
    blocks.push(<p key={key()}>{inline(body.join(' '), key())}</p>);
  }
  return <div className="wb-md">{blocks.length ? blocks : <Fragment />}</div>;
}
