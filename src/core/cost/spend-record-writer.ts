/**
 * SpendRecordWriter — JSONL persistence for spend records
 *
 * Appends SpendRecords to monthly-partitioned JSONL files:
 * .specweave/state/spend/YYYY-MM.jsonl
 *
 * Uses O_APPEND for atomic writes (safe for concurrent processes).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SpendRecord } from './spend-record.js';

export class SpendRecordWriter {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  /**
   * Append a SpendRecord to the appropriate monthly JSONL file
   */
  write(record: SpendRecord): void {
    fs.mkdirSync(this.dir, { recursive: true });

    const partition = record.timestamp.slice(0, 7); // YYYY-MM
    const filePath = path.join(this.dir, `${partition}.jsonl`);
    const line = JSON.stringify(record) + '\n';

    // O_APPEND ensures atomic line writes even with concurrent processes
    fs.appendFileSync(filePath, line, { flag: 'a' });
  }
}
