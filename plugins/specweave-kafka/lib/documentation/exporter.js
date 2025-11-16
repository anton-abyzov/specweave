import * as fs from "fs";
import * as path from "path";
var ExportFormat = /* @__PURE__ */ ((ExportFormat2) => {
  ExportFormat2["MARKDOWN"] = "markdown";
  ExportFormat2["HTML"] = "html";
  ExportFormat2["PDF"] = "pdf";
  ExportFormat2["JSON"] = "json";
  return ExportFormat2;
})(ExportFormat || {});
class DocumentationExporter {
  /**
   * Export documentation
   */
  static async export(content, options) {
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }
    const timestamp = options.includeTimestamp ? `-${(/* @__PURE__ */ new Date()).toISOString().replace(/:/g, "-").split(".")[0]}` : "";
    const extension = this.getExtension(options.format);
    const fileName = `${options.fileName}${timestamp}.${extension}`;
    const filePath = path.join(options.outputDir, fileName);
    switch (options.format) {
      case "markdown" /* MARKDOWN */:
        return this.exportMarkdown(content, filePath);
      case "html" /* HTML */:
        return this.exportHTML(content, filePath, options.customCSS);
      case "pdf" /* PDF */:
        return this.exportPDF(content, filePath, options.customCSS);
      case "json" /* JSON */:
        return this.exportJSON(content, filePath);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }
  /**
   * Get file extension for format
   */
  static getExtension(format) {
    switch (format) {
      case "markdown" /* MARKDOWN */:
        return "md";
      case "html" /* HTML */:
        return "html";
      case "pdf" /* PDF */:
        return "pdf";
      case "json" /* JSON */:
        return "json";
      default:
        return "txt";
    }
  }
  /**
   * Export as Markdown
   */
  static exportMarkdown(content, filePath) {
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  }
  /**
   * Export as HTML
   */
  static exportHTML(content, filePath, customCSS) {
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
    fs.writeFileSync(filePath, html, "utf-8");
    return filePath;
  }
  /**
   * Export as PDF
   */
  static exportPDF(content, filePath, customCSS) {
    const htmlPath = filePath.replace(".pdf", ".html");
    this.exportHTML(content, htmlPath, customCSS);
    console.warn(
      `PDF export requires additional setup (puppeteer, wkhtmltopdf, etc.). HTML file exported to: ${htmlPath}. Use a tool like puppeteer to convert to PDF.`
    );
    return htmlPath;
  }
  /**
   * Export as JSON
   */
  static exportJSON(content, filePath) {
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  }
  /**
   * Convert Markdown to HTML (simplified)
   */
  static markdownToHTML(markdown) {
    let html = markdown;
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const tableRegex = /\|(.+)\|\n\|(.+)\|\n((?:\|.+\|\n?)+)/gm;
    html = html.replace(tableRegex, (match) => {
      const lines = match.trim().split("\n");
      const headers = lines[0].split("|").filter((c) => c.trim()).map((h) => `<th>${h.trim()}</th>`).join("");
      const rows = lines.slice(2).map((line) => {
        const cells = line.split("|").filter((c) => c.trim()).map((c) => `<td>${c.trim()}</td>`).join("");
        return `<tr>${cells}</tr>`;
      }).join("");
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });
    html = html.replace(/```(.*?)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
    html = html.replace(/\n\n/g, "</p><p>");
    html = `<p>${html}</p>`;
    return html;
  }
  /**
   * Get default CSS for HTML export
   */
  static getDefaultCSS() {
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
  static async exportMultiple(content, baseOptions) {
    const formats = ["markdown" /* MARKDOWN */, "html" /* HTML */, "json" /* JSON */];
    const results = [];
    for (const format of formats) {
      const filePath = await this.export(content, {
        ...baseOptions,
        format
      });
      results.push(filePath);
    }
    return results;
  }
}
var exporter_default = DocumentationExporter;
export {
  DocumentationExporter,
  ExportFormat,
  exporter_default as default
};
