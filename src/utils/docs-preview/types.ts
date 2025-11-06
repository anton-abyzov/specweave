export interface DocusaurusConfig {
  title: string;
  tagline: string;
  url: string;
  baseUrl: string;
  docsPath: string;
  port?: number;
  theme?: 'default' | 'classic' | 'dark';
  excludeFolders?: string[];
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
