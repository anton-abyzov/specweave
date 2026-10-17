import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseGlossary, findGlossaryFiles } from '../../../src/core/glossary/parse.js';
import { checkGlossary, segments, tokenUsesWord, countsAsIdentifier } from '../../../src/core/glossary/check.js';
import { glossaryCommand } from '../../../src/cli/commands/glossary.js';

const GLOSSARY = `# Glossary

### Order
A customer's request to buy one or more products.
- Avoid: purchase, basket
- Data: \`orders\` table in \`db/schema.sql\`
- Code: \`Order\` in \`src/orders/order.ts\`, \`OrderLine\`
- UI: "Order"

### Customer
Someone who places an Order.
- Avoid: client, user
- Code: \`Customer\`

**Shipment**: The physical delivery of an Order.
_Avoid_: delivery, parcel
`;

let root: string;
const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-glossary-'));
  git('init', '-q');
  write('.specweave/config.json', '{}');
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('parseGlossary', () => {
  it('reads ### entries with levels and Pocock-style **Term**: entries', () => {
    const terms = parseGlossary(GLOSSARY, 'GLOSSARY.md');
    expect(terms.map((t) => t.term)).toEqual(['Order', 'Customer', 'Shipment']);
    expect(terms[0]).toMatchObject({
      line: 3,
      definition: "A customer's request to buy one or more products.",
      avoid: ['purchase', 'basket'],
      levels: { Data: '`orders` table in `db/schema.sql`', UI: '"Order"' },
    });
    expect(terms[2]).toMatchObject({ definition: 'The physical delivery of an Order.', avoid: ['delivery', 'parcel'] });
  });

  it('ignores headings and avoid lines inside code fences', () => {
    const terms = parseGlossary('### Order\n```\n### Not a term\n- Avoid: x\n```\n- Avoid: purchase\n', 'G.md');
    expect(terms).toHaveLength(1);
    expect(terms[0].avoid).toEqual(['purchase']);
  });

  it('follows GLOSSARY-MAP.md links inside the project only', () => {
    write('GLOSSARY-MAP.md', '- [Billing](billing/GLOSSARY.md)\n- [Outside](../x/GLOSSARY.md)\n- [Missing](gone/GLOSSARY.md)\n');
    write('billing/GLOSSARY.md', '### Invoice\n');
    write('GLOSSARY.md', '### Order\n');
    expect(findGlossaryFiles(root)).toEqual(['GLOSSARY.md', 'billing/GLOSSARY.md']);
  });
});

describe('identifier matching', () => {
  it('splits camel, snake and kebab tokens', () => {
    expect(segments('PurchaseItem')).toEqual(['purchase', 'item']);
    expect(segments('line_items')).toEqual(['line', 'items']);
    expect(segments('HTTPClient')).toEqual(['http', 'client']);
  });

  it('matches whole segments and simple plurals only', () => {
    expect(tokenUsesWord('PurchaseItem', ['purchase'])).toBe(true);
    expect(tokenUsesWord('purchases_total', ['purchase'])).toBe(true);
    expect(tokenUsesWord('BasketEntries', ['basket'])).toBe(true);
    expect(tokenUsesWord('purchased', ['purchase'])).toBe(false);
    expect(tokenUsesWord('repurchaseWindow', ['purchase'])).toBe(false);
    expect(tokenUsesWord('lineItemId', ['line', 'item'])).toBe(true);
  });

  it('counts bare lowercase words only in schema files', () => {
    expect(countsAsIdentifier('purchase', 'src/a.ts')).toBe(false);
    expect(countsAsIdentifier('Purchase', 'src/a.ts')).toBe(true);
    expect(countsAsIdentifier('purchase', 'db/schema.sql')).toBe(true);
    expect(countsAsIdentifier('purchases', 'prisma/migrations/001/migration.sql')).toBe(true);
  });
});

describe('checkGlossary', () => {
  beforeEach(() => {
    write('GLOSSARY.md', GLOSSARY);
    write('src/orders/order.ts', 'export class Order {}\nexport class OrderLine {}\n');
    write('src/cart.ts', '// a purchase in prose is fine\nexport function addPurchaseItem(basket_id: string) {}\n');
    write('db/schema.sql', 'create table orders (id int);\ncreate table purchases (id int);\n');
    write('README.md', 'The PurchaseItem table is gone.\n');
    git('add', '-A');
  });

  it('lists avoided words used as identifiers with file:line, and pointers that do not resolve', () => {
    const result = checkGlossary(root);
    expect(result.terms).toBe(3);
    const avoided = result.findings.filter((f) => f.kind === 'avoided-word').map((f) => `${f.file}:${f.line} ${f.identifier}`);
    expect(avoided.sort()).toEqual(['db/schema.sql:2 purchases', 'src/cart.ts:2 addPurchaseItem', 'src/cart.ts:2 basket_id']);
    const missing = result.findings.filter((f) => f.kind === 'missing-pointer').map((f) => `${f.term} ${f.pointer}`);
    expect(missing).toEqual(['Customer Customer']);
  });

  it('reports an avoid word that is another term', () => {
    write('GLOSSARY.md', '### Order\n- Avoid: customer\n\n### Customer\n');
    git('add', '-A');
    expect(checkGlossary(root).findings).toEqual([
      expect.objectContaining({ kind: 'avoid-is-a-term', term: 'Order', word: 'customer' }),
    ]);
  });

  it('exit 0 by default, 1 with --strict, and 0 with nothing to report', async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true; });
    expect(await glossaryCommand('check', { cwd: root })).toBe(0);
    expect(out.join('')).toContain('src/cart.ts:2  addPurchaseItem uses "purchase", which Order avoids (GLOSSARY.md:3)');
    expect(await glossaryCommand('check', { cwd: root, strict: true })).toBe(1);
    write('src/cart.ts', 'export function addOrderLine(orderId: string) {}\n');
    write('db/schema.sql', 'create table orders (id int);\n');
    write('src/customer.ts', 'export class Customer {}\n');
    git('add', '-A');
    expect(await glossaryCommand('check', { cwd: root, strict: true })).toBe(0);
    expect(out.join('')).toContain('No drift');
  });

  it('says how to start when there is no glossary', async () => {
    fs.rmSync(path.join(root, 'GLOSSARY.md'));
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true; });
    expect(await glossaryCommand('check', { cwd: root, strict: true })).toBe(0);
    expect(out.join('')).toContain('sw-glossary');
  });
});
