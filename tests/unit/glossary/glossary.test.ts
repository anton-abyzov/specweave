import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseGlossary, findGlossaryFiles } from '../../../src/core/glossary/parse.js';
import { checkGlossary, segments, tokenUsesWord } from '../../../src/core/glossary/check.js';
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

  it('catches every use in code, parameters and UI strings included, but not comment lines', () => {
    write('src/checkout.ts', [
      'const purchase = 1;',
      'function basket() {}',
      'cart.purchase(2);',
      '// purchase history is fine here',
      'const label = "Thanks for your purchase";',
      'function submit(purchase) { return purchase; }',
      '  # purchase in a shell or Python comment',
    ].join('\n') + '\n');
    git('add', '-A');
    const hits = checkGlossary(root).findings
      .filter((f) => f.kind === 'avoided-word' && f.file === 'src/checkout.ts')
      .map((f) => `${f.line} ${f.identifier}`);
    expect(hits).toEqual(['1 purchase', '2 basket', '3 purchase', '5 purchase', '6 purchase']);
  });

  it('checks route pointers against the code, and paths only inside the project', () => {
    const outside = `../${path.basename(root)}-outside.md`;
    write('GLOSSARY.md', `### Order\n- Code: \`POST /orders\`, \`GET /orders/:id\`, \`DELETE /refunds\`, \`${outside}\`, \`Order.id\`, \`Order.refundedAt\`\n`);
    write(outside, 'outside');
    try {
      write('src/routes.ts', "router.post('/orders', create);\nclass Order { id = 0; }\n");
      git('add', '-A');
      const missing = checkGlossary(root).findings.filter((f) => f.kind === 'missing-pointer').map((f) => f.pointer);
      expect(missing).toEqual(['DELETE /refunds', outside, 'Order.refundedAt']);
    } finally {
      fs.rmSync(path.join(root, outside), { force: true });
    }
  });

  it('resolves root-level files and dotfiles as paths, and dotted names as identifiers', () => {
    write('GLOSSARY.md', '### Order\n- Code: `main.c`, `order.h`, `.env.example`, `.env`, `Order.id`, `Makefile`\n');
    write('main.c', 'int main(void) { return 0; }\n');
    write('order.h', 'struct Order { int id; };\n');
    write('.env.example', 'X=1\n');
    write('Makefile', 'all:\n');
    git('add', '-A');
    const missing = checkGlossary(root).findings.filter((f) => f.kind === 'missing-pointer').map((f) => f.pointer);
    expect(missing).toEqual(['.env']);
  });

  it.skipIf(process.platform === 'win32')('never reads a glossary that a symlink or map link places outside the project', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-glossary-outside-'));
    try {
      fs.writeFileSync(path.join(outside, 'GLOSSARY.md'), '### Secret\n');
      fs.symlinkSync(outside, path.join(root, 'linked'), 'dir');
      write('GLOSSARY-MAP.md', '- [Linked](linked/GLOSSARY.md)\n');
      expect(findGlossaryFiles(root)).toEqual(['GLOSSARY.md']);
      fs.rmSync(path.join(root, 'GLOSSARY.md'));
      fs.symlinkSync(path.join(outside, 'GLOSSARY.md'), path.join(root, 'GLOSSARY.md'));
      expect(findGlossaryFiles(root)).toEqual([]);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
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
