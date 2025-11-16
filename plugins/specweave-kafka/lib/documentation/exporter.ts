/**
 * Documentation Exporter
 *
 * Exports generated documentation to multiple formats (Markdown, HTML, PDF)
 *
 * @module exporter
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Export Format
 */
export enum ExportFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
  JSON = 'json',
}

/**
 * Export Options
 */
export interface ExportOptions {
  /** Output directory */
  outputDir: string;
  /** File name (without extension) */
  fileName: string;
  /** Export format */
  format: ExportFormat;
  /** Include timestamp in filename */
  includeTimestamp?: boolean;
  /** Custom CSS for HTML/PDF (optional) */
  customCSS?: string;
}

/**
 * Documentation Exporter
 *
 * Handles exporting documentation to various formats
 */
export class DocumentationExporter {
  /**
   * Export documentation
   */
  static async export(content: string, options: ExportOptions): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    // Build filename
    const timestamp = options.includeTimestamp
      ? `-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}`
      : '';
    const extension = this.getExtension(options.format);
    const fileName = `${options.fileName}${timestamp}.${extension}`;
    const filePath = path.join(options.outputDir, fileName);

    switch (options.format) {
      case ExportFormat.MARKDOWN:
        return this.exportMarkdown(content, filePath);

      case ExportFormat.HTML:
        return this.exportHTML(content, filePath, options.customCSS);

      case ExportFormat.PDF:
        return this.exportPDF(content, filePath, options.customCSS);

      case ExportFormat.JSON:
        return this.exportJSON(content, filePath);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Get file extension for format
   */
  private static getExtension(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.MARKDOWN:
        return 'md';
      case ExportFormat.HTML:
        return 'html';
      case ExportFormat.PDF:
        return 'pdf';
      case ExportFormat.JSON:
        return 'json';
      default:
        return 'txt';
    }
  }

  /**
   * Export as Markdown
   */
  private static exportMarkdown(content: string, filePath: string): string {
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Export as HTML
   */
  private static exportHTML(content: string, filePath: string, customCSS?: string): string {
    // Convert Markdown to HTML (would use marked or similar in real implementation)
    const htmlContent = this.markdownToHTML(content);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kafka Documentation</title>
    <style>
        ${customCSS || this.getDefaultCSS()}
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent}
    </div>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf-8');
    return filePath;
  }

  /**
   * Export as PDF
   */
  private static exportPDF(content: string, filePath: string, customCSS?: string): string {
    // In real implementation, would use puppeteer or similar
    // For now, just export as HTML and note that PDF generation requires additional setup

    const htmlPath = filePath.replace('.pdf', '.html');
    this.exportHTML(content, htmlPath, customCSS);

    console.warn(
      `PDF export requires additional setup (puppeteer, wkhtmltopdf, etc.). ` +
        `HTML file exported to: ${htmlPath}. ` +
        `Use a tool like puppeteer to convert to PDF.`
    );

    return htmlPath;
  }

  /**
   * Export as JSON
   */
  private static exportJSON(content: string, filePath: string): string {
    // Assume content is already JSON string
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Convert Markdown to HTML (simplified)
   */
  private static markdownToHTML(markdown: string): string {
    // Simple Markdown to HTML conversion
    // In production, use marked, markdown-it, or similar

    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Tables (basic)
    const tableRegex = /\|(.+)\|\n\|(.+)\|\n((?:\|.+\|\n?)+)/gm;
    html = html.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n');
      const headers = lines[0]
        .split('|')
        .filter((c) => c.trim())
        .map((h) => `<th>${h.trim()}</th>`)
        .join('');
      const rows = lines
        .slice(2)
        .map((line) => {
          const cells = line
            .split('|')
            .filter((c) => c.trim())
            .map((c) => `<td>${c.trim()}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    // Code blocks
    html = html.replace(/```(.*?)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = `<p>${html}</p>`;

    return html;
  }

  /**
   * Get default CSS for HTML export
   */
  private static getDefaultCSS(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f5f5f5;
      }
      .container {
        max-width: 1000px;
        margin: 40px auto;
        padding: 40px;
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      h1 {
        border-bottom: 3px solid #2196F3;
        padding-bottom: 10px;
        color: #1976D2;
      }
      h2 {
        border-bottom: 2px solid #64B5F6;
        padding-bottom: 8px;
        color: #1976D2;
        margin-top: 30px;
      }
      h3 {
        color: #424242;
        margin-top: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #2196F3;
        color: white;
        font-weight: bold;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      pre {
        background: #2e3440;
        color: #d8dee9;
        padding: 16px;
        border-radius: 4px;
        overflow-x: auto;
      }
      code {
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 14px;
      }
    `;
  }

  /**
   * Batch export to multiple formats
   */
  static async exportMultiple(
    content: string,
    baseOptions: Omit<ExportOptions, 'format'>
  ): Promise<string[]> {
    const formats = [ExportFormat.MARKDOWN, ExportFormat.HTML, ExportFormat.JSON];
    const results: string[] = [];

    for (const format of formats) {
      const filePath = await this.export(content, {
        ...baseOptions,
        format,
      });
      results.push(filePath);
    }

    return results;
  }
}

/**
 * Example Usage: Export Topology Documentation
 *
 * ```typescript
 * import { TopologyGenerator } from './topology-generator';
 * import { DocumentationExporter, ExportFormat } from './exporter';
 *
 * // Generate topology markdown
 * const topology = await TopologyGenerator.generate(admin);
 * const markdown = TopologyGenerator.formatAsMarkdown(topology);
 *
 * // Export as HTML
 * const htmlPath = await DocumentationExporter.export(markdown, {
 *   outputDir: './docs/output',
 *   fileName: 'kafka-topology',
 *   format: ExportFormat.HTML,
 *   includeTimestamp: true,
 * });
 *
 * console.log(`Documentation exported to: ${htmlPath}`);
 * ```
 */

/**
 * Example Usage: Batch Export
 *
 * ```typescript
 * // Export to all formats
 * const paths = await DocumentationExporter.exportMultiple(markdown, {
 *   outputDir: './docs/output',
 *   fileName: 'kafka-topology',
 *   includeTimestamp: false,
 * });
 *
 * console.log('Exported files:', paths);
 * // Output: ['./docs/output/kafka-topology.md', './docs/output/kafka-topology.html', './docs/output/kafka-topology.json']
 * ```
 */

export default DocumentationExporter;
