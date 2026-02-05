---
description: Import Figma designs into your project using Figma REST API or MCP server integration.
---

# /sw-figma:import

Import Figma designs into your project using Figma REST API or MCP server integration.

You are a Figma integration expert who automates design imports with comprehensive metadata extraction.

## Your Task

Import Figma designs (files, frames, components, styles) into your project with full metadata, assets, and specifications.

### 1. Figma API Overview

**REST API Capabilities**:
- Fetch files, frames, components, and styles
- Export images (PNG, JPG, SVG, PDF)
- Access design tokens (colors, typography, spacing)
- Read component metadata and descriptions
- Retrieve version history

**API Endpoints**:
```
GET /v1/files/:file_key                    # Get file metadata
GET /v1/files/:file_key/nodes              # Get specific nodes
GET /v1/images/:file_key                   # Export images
GET /v1/files/:file_key/components         # Get components
GET /v1/files/:file_key/styles             # Get styles
GET /v1/teams/:team_id/projects            # List projects
GET /v1/files/:file_key/versions           # Version history
```

**Authentication**:
```bash
# Personal Access Token (recommended for server-side)
curl -H "X-Figma-Token: YOUR_TOKEN" https://api.figma.com/v1/files/:file_key

# OAuth 2.0 (recommended for user-facing apps)
# Authorization: Bearer YOUR_OAUTH_TOKEN
```

### 2. Setup Configuration

**Environment Variables (.env)**:
```bash
# Required
FIGMA_ACCESS_TOKEN=figd_XXXXXXXXXXXXXXXXXXXX

# Optional (MCP server)
FIGMA_MCP_ENABLED=true
FIGMA_MCP_SERVER_PATH=/path/to/figma-mcp-server
```

**Configuration File (figma.config.json)**:
```json
{
  "fileKey": "ABC123XYZ456",
  "fileUrl": "https://www.figma.com/file/ABC123XYZ456/ProjectName",
  "importSettings": {
    "components": true,
    "styles": true,
    "assets": true,
    "exportFormats": ["svg", "png@2x"],
    "skipHidden": true,
    "includeMetadata": true
  },
  "exportPaths": {
    "components": "./src/components/figma",
    "assets": "./public/assets/figma",
    "tokens": "./src/design-tokens",
    "metadata": "./.figma/metadata.json"
  },
  "naming": {
    "componentPrefix": "Figma",
    "useKebabCase": true,
    "preserveFigmaNames": false
  },
  "mcp": {
    "enabled": false,
    "serverPath": null,
    "cacheDir": "./.figma/cache"
  }
}
```

### 3. Figma REST API Integration

**TypeScript/JavaScript Implementation**:

```typescript
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface FigmaConfig {
  accessToken: string;
  fileKey: string;
  exportFormats?: string[];
}

class FigmaImporter {
  private baseUrl = 'https://api.figma.com/v1';
  private headers: Record<string, string>;
  private fileKey: string;

  constructor(config: FigmaConfig) {
    this.headers = {
      'X-Figma-Token': config.accessToken,
    };
    this.fileKey = config.fileKey;
  }

  /**
   * Fetch file metadata and structure
   */
  async fetchFile() {
    const response = await axios.get(
      `${this.baseUrl}/files/${this.fileKey}`,
      { headers: this.headers }
    );

    return response.data;
  }

  /**
   * Fetch specific nodes by ID
   */
  async fetchNodes(nodeIds: string[]) {
    const ids = nodeIds.join(',');
    const response = await axios.get(
      `${this.baseUrl}/files/${this.fileKey}/nodes?ids=${ids}`,
      { headers: this.headers }
    );

    return response.data.nodes;
  }

  /**
   * Export images for nodes
   */
  async exportImages(
    nodeIds: string[],
    options: {
      format?: 'png' | 'jpg' | 'svg' | 'pdf';
      scale?: number;
      useAbsoluteBounds?: boolean;
    } = {}
  ) {
    const { format = 'png', scale = 2, useAbsoluteBounds = false } = options;
    const ids = nodeIds.join(',');

    const response = await axios.get(
      `${this.baseUrl}/images/${this.fileKey}?ids=${ids}&format=${format}&scale=${scale}&use_absolute_bounds=${useAbsoluteBounds}`,
      { headers: this.headers }
    );

    return response.data.images;
  }

  /**
   * Fetch all components in file
   */
  async fetchComponents() {
    const response = await axios.get(
      `${this.baseUrl}/files/${this.fileKey}/components`,
      { headers: this.headers }
    );

    return response.data.meta.components;
  }

  /**
   * Fetch all styles (colors, text, effects, grids)
   */
  async fetchStyles() {
    const response = await axios.get(
      `${this.baseUrl}/files/${this.fileKey}/styles`,
      { headers: this.headers }
    );

    return response.data.meta.styles;
  }

  /**
   * Download image from URL
   */
  async downloadImage(imageUrl: string, outputPath: string) {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, response.data);

    return outputPath;
  }

  /**
   * Traverse Figma node tree recursively
   */
  traverseNodes(node: any, callback: (node: any) => void) {
    callback(node);

    if (node.children) {
      node.children.forEach((child: any) => {
        this.traverseNodes(child, callback);
      });
    }
  }

  /**
   * Extract design tokens from file
   */
  async extractDesignTokens() {
    const file = await this.fetchFile();
    const styles = await this.fetchStyles();

    const tokens = {
      colors: {},
      typography: {},
      spacing: {},
      effects: {},
    };

    // Extract color tokens
    styles.forEach((style: any) => {
      if (style.style_type === 'FILL') {
        const node = this.findNodeById(file.document, style.node_id);
        if (node?.fills?.[0]) {
          const color = node.fills[0];
          if (color.type === 'SOLID') {
            tokens.colors[style.name] = this.rgbaToHex(color.color);
          }
        }
      }

      // Extract text styles
      if (style.style_type === 'TEXT') {
        const node = this.findNodeById(file.document, style.node_id);
        if (node?.style) {
          tokens.typography[style.name] = {
            fontFamily: node.style.fontFamily,
            fontSize: node.style.fontSize,
            fontWeight: node.style.fontWeight,
            lineHeight: node.style.lineHeightPx,
            letterSpacing: node.style.letterSpacing,
          };
        }
      }

      // Extract effect styles (shadows, blurs)
      if (style.style_type === 'EFFECT') {
        const node = this.findNodeById(file.document, style.node_id);
        if (node?.effects) {
          tokens.effects[style.name] = node.effects;
        }
      }
    });

    return tokens;
  }

  /**
   * Find node by ID in tree
   */
  private findNodeById(node: any, id: string): any {
    if (node.id === id) return node;

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, id);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Convert RGBA to HEX
   */
  private rgbaToHex(color: { r: number; g: number; b: number; a?: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}

// Usage
async function importFigmaDesigns() {
  const importer = new FigmaImporter({
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    fileKey: 'ABC123XYZ456',
  });

  // Fetch file structure
  const file = await importer.fetchFile();
  console.log('File:', file.name);

  // Fetch components
  const components = await importer.fetchComponents();
  console.log(`Found ${components.length} components`);

  // Export component images
  const componentIds = components.map((c: any) => c.node_id);
  const images = await importer.exportImages(componentIds, {
    format: 'svg',
    scale: 1,
  });

  // Download images
  for (const [nodeId, imageUrl] of Object.entries(images)) {
    const component = components.find((c: any) => c.node_id === nodeId);
    const outputPath = `./assets/${component.name}.svg`;
    await importer.downloadImage(imageUrl as string, outputPath);
    console.log(`Exported: ${outputPath}`);
  }

  // Extract design tokens
  const tokens = await importer.extractDesignTokens();
  await fs.writeFile(
    './src/design-tokens/figma-tokens.json',
    JSON.stringify(tokens, null, 2)
  );
}

importFigmaDesigns().catch(console.error);
```

### 4. MCP Server Integration

**MCP Server for Figma** (Recommended for Claude Code):

MCP (Model Context Protocol) servers provide structured access to Figma via Claude Code.

**Available MCP Servers**:
1. **@modelcontextprotocol/server-figma** (Official)
2. **figma-mcp-server** (Community)
3. **claude-figma-bridge** (Custom)

**Setup MCP Server**:

```bash
# Install MCP server
npm install -g @modelcontextprotocol/server-figma

# Configure in Claude Code settings
# ~/.claude/config.json
{
  "mcpServers": {
    "figma": {
      "command": "mcp-server-figma",
      "args": [],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_XXXXXXXXXXXXXXXXXXXX"
      }
    }
  }
}
```

**Using MCP in Claude Code**:

Once MCP server is configured, Claude Code can directly access Figma:

```typescript
// Claude Code will use MCP tools automatically
// Example: mcp__figma__getFile, mcp__figma__exportImages

// In your prompt:
// "Import all components from Figma file ABC123XYZ456 and export as SVG"

// Claude Code will invoke:
// - mcp__figma__getFile({ fileKey: "ABC123XYZ456" })
// - mcp__figma__exportImages({ nodeIds: [...], format: "svg" })
```

**MCP Server Benefits**:
- No need to manage API tokens in code
- Automatic rate limiting
- Built-in caching
- Structured tool interface
- Better error handling

### 5. Import Workflow

**Step 1: Analyze Figma File**
```typescript
// Discover structure
const file = await importer.fetchFile();

// Find components, frames, pages
const components = [];
const frames = [];

importer.traverseNodes(file.document, (node) => {
  if (node.type === 'COMPONENT') {
    components.push({
      id: node.id,
      name: node.name,
      description: node.description,
      componentPropertyDefinitions: node.componentPropertyDefinitions,
    });
  }

  if (node.type === 'FRAME') {
    frames.push({
      id: node.id,
      name: node.name,
      width: node.absoluteBoundingBox.width,
      height: node.absoluteBoundingBox.height,
    });
  }
});

console.log(`Components: ${components.length}, Frames: ${frames.length}`);
```

**Step 2: Export Assets**
```typescript
// Export all components as SVG
const componentIds = components.map(c => c.id);
const svgImages = await importer.exportImages(componentIds, {
  format: 'svg',
  scale: 1,
});

// Export all frames as PNG@2x
const frameIds = frames.map(f => f.id);
const pngImages = await importer.exportImages(frameIds, {
  format: 'png',
  scale: 2,
});
```

**Step 3: Save Metadata**
```typescript
const metadata = {
  fileKey: importer.fileKey,
  fileName: file.name,
  version: file.version,
  lastModified: file.lastModified,
  components: components.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    exportedAs: `./assets/components/${c.name}.svg`,
  })),
  frames: frames.map(f => ({
    id: f.id,
    name: f.name,
    dimensions: { width: f.width, height: f.height },
    exportedAs: `./assets/frames/${f.name}@2x.png`,
  })),
  importedAt: new Date().toISOString(),
};

await fs.writeFile(
  './.figma/metadata.json',
  JSON.stringify(metadata, null, 2)
);
```

### 6. CLI Command

**NPM Script (package.json)**:
```json
{
  "scripts": {
    "figma:import": "tsx scripts/figma-import.ts",
    "figma:import:watch": "tsx scripts/figma-import.ts --watch",
    "figma:sync": "tsx scripts/figma-sync.ts"
  }
}
```

**CLI with Arguments**:
```typescript
// scripts/figma-import.ts
import yargs from 'yargs';

const argv = yargs(process.argv.slice(2))
  .option('file-key', {
    type: 'string',
    description: 'Figma file key',
    required: true,
  })
  .option('components', {
    type: 'boolean',
    description: 'Import components',
    default: true,
  })
  .option('assets', {
    type: 'boolean',
    description: 'Export assets',
    default: true,
  })
  .option('tokens', {
    type: 'boolean',
    description: 'Extract design tokens',
    default: true,
  })
  .option('format', {
    type: 'string',
    description: 'Export format (svg, png, jpg)',
    default: 'svg',
  })
  .parseSync();

const importer = new FigmaImporter({
  accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  fileKey: argv.fileKey,
});

if (argv.components) {
  const components = await importer.fetchComponents();
  console.log(`Importing ${components.length} components...`);
}

if (argv.assets) {
  // Export logic
}

if (argv.tokens) {
  const tokens = await importer.extractDesignTokens();
  // Save tokens
}
```

**Usage**:
```bash
# Import everything
npm run figma:import -- --file-key ABC123XYZ456

# Import only components
npm run figma:import -- --file-key ABC123XYZ456 --no-assets --no-tokens

# Export as PNG
npm run figma:import -- --file-key ABC123XYZ456 --format png
```

### 7. Rate Limiting and Caching

**Rate Limits** (Figma API):
- 30 requests per minute per IP
- 1000 requests per hour per token

**Implement Caching**:
```typescript
import NodeCache from 'node-cache';

class CachedFigmaImporter extends FigmaImporter {
  private cache: NodeCache;

  constructor(config: FigmaConfig) {
    super(config);
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL
  }

  async fetchFile() {
    const cacheKey = `file:${this.fileKey}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      console.log('Using cached file data');
      return cached;
    }

    const file = await super.fetchFile();
    this.cache.set(cacheKey, file);
    return file;
  }
}
```

**Rate Limiting**:
```typescript
import Bottleneck from 'bottleneck';

class RateLimitedFigmaImporter extends FigmaImporter {
  private limiter: Bottleneck;

  constructor(config: FigmaConfig) {
    super(config);

    // 30 requests per minute
    this.limiter = new Bottleneck({
      minTime: 2000, // 2s between requests
      maxConcurrent: 1,
    });
  }

  async fetchFile() {
    return this.limiter.schedule(() => super.fetchFile());
  }

  async exportImages(...args: any[]) {
    return this.limiter.schedule(() => super.exportImages(...args));
  }
}
```

### 8. Error Handling

**Common API Errors**:
- 401 Unauthorized: Invalid access token
- 403 Forbidden: No permission to access file
- 404 Not Found: File or node doesn't exist
- 429 Too Many Requests: Rate limit exceeded
- 500 Server Error: Figma API issue

**Error Handling Pattern**:
```typescript
async function importWithRetry(fileKey: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const importer = new FigmaImporter({
        accessToken: process.env.FIGMA_ACCESS_TOKEN!,
        fileKey,
      });

      return await importer.fetchFile();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401) {
          throw new Error('Invalid Figma access token');
        }

        if (status === 403) {
          throw new Error('No permission to access this file');
        }

        if (status === 429) {
          const retryAfter = error.response?.headers['retry-after'] || 60;
          console.log(`Rate limited. Retrying after ${retryAfter}s...`);
          await sleep(retryAfter * 1000);
          continue;
        }

        if (status === 500 && i < retries - 1) {
          console.log(`Server error. Retrying (${i + 1}/${retries})...`);
          await sleep(2000);
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

## Workflow

1. Ask about Figma file URL and access requirements
2. Extract file key from URL
3. Verify Figma access token (from .env or prompt)
4. Fetch file metadata and analyze structure
5. Ask about import preferences (components, assets, tokens)
6. Set up directory structure for exports
7. Export assets with specified formats and scales
8. Extract design tokens and metadata
9. Save all data to configured paths
10. Generate import report with statistics

## When to Use

- Starting new projects with Figma designs
- Syncing design systems with code
- Automating asset exports from Figma
- Extracting design tokens for theme configuration
- Migrating from manual Figma exports to automated workflow
- Setting up CI/CD for design-to-code pipeline

## Best Practices

1. **Security**: Store access tokens in .env (never commit)
2. **Caching**: Cache file data to reduce API calls
3. **Rate Limiting**: Respect Figma API limits (30 req/min)
4. **Versioning**: Track Figma file versions in metadata
5. **Organization**: Structure exports by component type
6. **Documentation**: Include component descriptions from Figma
7. **Automation**: Use watch mode for continuous sync
8. **Testing**: Validate exports before committing

Import Figma designs with production-ready automation!
