/**
 * SpendRecordWriter and SpendRecordReader tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SpendRecordWriter } from '../../../src/core/cost/spend-record-writer.js';
import { SpendRecordReader } from '../../../src/core/cost/spend-record-reader.js';
import { createSpendRecord } from '../../../src/core/cost/spend-record.js';

describe('SpendRecordWriter', () => {
  let tmpDir: string;
  let writer: SpendRecordWriter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-test-'));
    writer = new SpendRecordWriter(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes record to monthly-partitioned JSONL file', () => {
    const record = createSpendRecord({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      input_tokens: 1000,
      output_tokens: 500,
      cost_usd: 0.01,
      cost_source: 'calculated',
    });
    // Override timestamp for predictable partition
    (record as any).timestamp = '2026-03-31T10:00:00.000Z';

    writer.write(record);

    const filePath = path.join(tmpDir, '2026-03.jsonl');
    expect(fs.existsSync(filePath)).toBe(true);

    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.provider).toBe('anthropic');
    expect(parsed.input_tokens).toBe(1000);
  });

  it('appends multiple records to same file', () => {
    const record1 = createSpendRecord({
      provider: 'anthropic',
      model: 'claude-opus-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.002,
      cost_source: 'calculated',
    });
    const record2 = createSpendRecord({
      provider: 'openai',
      model: 'gpt-4o',
      input_tokens: 200,
      output_tokens: 100,
      cost_usd: 0.003,
      cost_source: 'calculated',
    });
    (record1 as any).timestamp = '2026-03-15T10:00:00.000Z';
    (record2 as any).timestamp = '2026-03-20T10:00:00.000Z';

    writer.write(record1);
    writer.write(record2);

    const filePath = path.join(tmpDir, '2026-03.jsonl');
    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('creates directory if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'spend');
    const nestedWriter = new SpendRecordWriter(nestedDir);

    const record = createSpendRecord({
      provider: 'google',
      model: 'gemini-2.5-pro',
      input_tokens: 50,
      output_tokens: 25,
      cost_usd: 0.001,
      cost_source: 'calculated',
    });
    (record as any).timestamp = '2026-04-01T10:00:00.000Z';

    nestedWriter.write(record);

    expect(fs.existsSync(path.join(nestedDir, '2026-04.jsonl'))).toBe(true);
  });
});

describe('SpendRecordReader', () => {
  let tmpDir: string;
  let writer: SpendRecordWriter;
  let reader: SpendRecordReader;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-read-test-'));
    writer = new SpendRecordWriter(tmpDir);
    reader = new SpendRecordReader(tmpDir);

    // Write test records across two months
    const records = [
      { ts: '2026-03-15T10:00:00.000Z', provider: 'anthropic', model: 'claude-sonnet-4-6', input: 100, output: 50, cost: 0.001 },
      { ts: '2026-03-20T10:00:00.000Z', provider: 'openai', model: 'gpt-4o', input: 200, output: 100, cost: 0.003 },
      { ts: '2026-03-25T10:00:00.000Z', provider: 'google', model: 'gemini-2.5-pro', input: 300, output: 150, cost: 0.005 },
      { ts: '2026-04-02T10:00:00.000Z', provider: 'anthropic', model: 'claude-opus-4-6', input: 400, output: 200, cost: 0.01 },
      { ts: '2026-04-05T10:00:00.000Z', provider: 'mistral', model: 'mistral-large-latest', input: 500, output: 250, cost: 0.02 },
    ];

    for (const r of records) {
      const record = createSpendRecord({
        provider: r.provider,
        model: r.model,
        input_tokens: r.input,
        output_tokens: r.output,
        cost_usd: r.cost,
        cost_source: 'calculated',
      });
      (record as any).timestamp = r.ts;
      writer.write(record);
    }
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads records within a date range', () => {
    const records = reader.readRange(
      new Date('2026-03-20T00:00:00Z'),
      new Date('2026-03-25T23:59:59Z'),
    );
    expect(records).toHaveLength(2);
    expect(records[0].provider).toBe('openai');
    expect(records[1].provider).toBe('google');
  });

  it('reads records spanning multiple months', () => {
    const records = reader.readRange(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-04-30T23:59:59Z'),
    );
    expect(records).toHaveLength(5);
  });

  it('returns empty array when no records match', () => {
    const records = reader.readRange(
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-02-28T23:59:59Z'),
    );
    expect(records).toHaveLength(0);
  });

  it('reads all records when no range specified', () => {
    const records = reader.readAll();
    expect(records).toHaveLength(5);
  });
});
