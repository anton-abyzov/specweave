/**
 * SpendRecordReader — reads and filters spend records from JSONL files
 *
 * Supports date-range queries across monthly-partitioned files.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SpendRecord } from './spend-record.js';

export class SpendRecordReader {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  /**
   * Read spend records within a date range
   */
  readRange(from: Date, to: Date): SpendRecord[] {
    const files = this.getRelevantFiles(from, to);
    const records: SpendRecord[] = [];

    for (const file of files) {
      const filePath = path.join(this.dir, file);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          const record: SpendRecord = JSON.parse(line);
          const ts = new Date(record.timestamp);
          if (ts >= from && ts <= to) {
            records.push(record);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    return records;
  }

  /**
   * Read all spend records from all files
   */
  readAll(): SpendRecord[] {
    if (!fs.existsSync(this.dir)) return [];

    const files = fs.readdirSync(this.dir)
      .filter(f => f.endsWith('.jsonl'))
      .sort();

    const records: SpendRecord[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(this.dir, file), 'utf-8');
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          records.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }
    }

    return records;
  }

  /**
   * Determine which monthly files might contain records in the given range
   */
  private getRelevantFiles(from: Date, to: Date): string[] {
    const files: string[] = [];
    const current = new Date(from);
    current.setUTCDate(1); // Start of month

    while (current <= to) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      files.push(`${year}-${month}.jsonl`);
      current.setUTCMonth(current.getUTCMonth() + 1);
    }

    return files;
  }
}
