/** Documentation scope: internal team docs vs public-facing docs */
export type DocScope = 'internal' | 'public';

/** Default port per scope */
export const SCOPE_PORTS: Record<DocScope, number> = {
  internal: 3015,
  public: 3016,
};

/** Docusaurus site directory name per scope */
export const SCOPE_SITE_DIRS: Record<DocScope, string> = {
  internal: 'docs-site-internal',
  public: 'docs-site-public',
};

/** Docs source subdirectory under .specweave/docs/ */
export const SCOPE_DOC_DIRS: Record<DocScope, string> = {
  internal: 'internal',
  public: 'public',
};

export interface DocCategory {
  /** Folder name (e.g., 'strategy') */
  id: string;
  /** Human-readable label (e.g., 'Strategy') */
  label: string;
  /** Short description for landing page */
  description: string;
  /** Emoji icon for the category */
  icon: string;
  /** Number of markdown documents found */
  docCount: number;
}

export interface ProjectMetadata {
  /** Project name */
  name: string;
  /** Project description / tagline */
  description: string;
  /** 1-2 letter initials for logo generation */
  initials: string;
  /** Detected doc categories that actually exist */
  categories: DocCategory[];
  /** Source of the project name detection */
  source: 'config' | 'package' | 'directory';
  /** Path to custom logo file if found */
  logoPath?: string;
}

export interface DocusaurusConfig {
  title: string;
  tagline: string;
  url: string;
  baseUrl: string;
  docsPath: string;
  port?: number;
  theme?: 'default' | 'classic' | 'dark';
  excludeFolders?: string[];
  /** Auto-detected project metadata */
  projectMetadata?: ProjectMetadata;
  /** Documentation scope */
  scope?: DocScope;
}

export interface SidebarItem {
  type: 'doc' | 'category';
  label?: string;
  id?: string;
  items?: SidebarItem[];
}

export interface Sidebar {
  docs: SidebarItem[];
}

export interface SetupOptions {
  projectRoot: string;
  targetDir: string;
  docsPath: string;
  config: DocusaurusConfig;
  force?: boolean;
}

export interface ServerOptions {
  port: number;
  openBrowser: boolean;
  host?: string;
}

export interface InstallOptions {
  targetDir: string;
  packages: string[];
  dev?: boolean;
}

export interface NodeVersion {
  version: string;
  major: number;
  minor: number;
  patch: number;
  compatible: boolean;
}

export interface BuildResult {
  success: boolean;
  outputPath: string;
  size: number;
  duration: number;
  errors?: string[];
}

export interface ServerProcess {
  pid: number;
  port: number;
  url: string;
  stop: () => Promise<void>;
}
