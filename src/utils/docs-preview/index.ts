export {
  setupDocusaurus,
  quickSetup,
  launchPreview,
  buildStaticSite,
  isSetupNeeded,
  getDocsSitePath,
  getDocsPath
} from './docusaurus-setup.js';

export {
  buildSidebar,
  writeSidebar,
  generateSidebarsJS,
  countDocuments,
  countCategories
} from './sidebar-builder.js';

export {
  generateDocusaurusConfig,
  writeDocusaurusConfig,
  generatePackageJSON,
  writePackageJSON,
  generateCustomCSS,
  writeCustomCSS,
  generateIndexPage,
  writeIndexPage,
  generateIndexModuleCSS,
  writeIndexModuleCSS,
  generateLogoSVG,
  generateFaviconSVG
} from './config-generator.js';

export {
  detectProjectMetadata,
  detectDocCategories
} from './project-detector.js';

export {
  checkNodeVersion,
  checkNpmInstalled,
  installPackages,
  installDocusaurus,
  isDocusaurusInstalled,
  cleanNpmCache,
  getPackageVersion,
  estimateInstallSize,
  estimateInstallTime
} from './package-installer.js';

export {
  findAvailablePort,
  startDevServer,
  openBrowserUrl,
  killAllDocusaurusProcesses,
  killProcessOnPort,
  isDocusaurusRunning,
  getServerUrl
} from './server-manager.js';

export type { DocScope } from './types.js';
export { SCOPE_PORTS, SCOPE_SITE_DIRS, SCOPE_DOC_DIRS } from './types.js';
export * from './types.js';
