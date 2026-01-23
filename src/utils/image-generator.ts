/**
 * Image Generation Utility for Living Docs
 *
 * Uses Pollinations.ai (FREE, no API key) to generate professional images
 * for documentation, features, and visual assets.
 *
 * Supports two documentation contexts:
 * - PUBLIC: Marketing-grade, polished, aspirational visuals
 * - INTERNAL: Functional, clean, diagram-focused visuals
 *
 * @module utils/image-generator
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { createHash } from 'crypto';
import { consoleLogger as logger } from './logger.js';

/**
 * SpecWeave brand colors for consistent styling
 */
export const BRAND_COLORS = {
  primary: '#7c3aed',
  primaryDark: '#6d28d9',
  primaryLight: '#a78bfa',
  primaryDarkest: '#5b21b6',
  // Enterprise palette additions
  neutral: '#64748b',
  neutralLight: '#94a3b8',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
};

/**
 * Documentation context - determines styling approach
 */
export type DocContext = 'public' | 'internal';

/**
 * Section types for context-aware image generation
 */
export type DocSection =
  | 'feature'        // Feature specifications
  | 'architecture'   // System architecture, C4 diagrams
  | 'strategy'       // Business strategy, roadmaps
  | 'operations'     // Runbooks, monitoring, SLOs
  | 'governance'     // Policies, standards, compliance
  | 'api'            // API documentation
  | 'overview'       // High-level overviews
  | 'tutorial'       // Learning content
  | 'reference';     // Technical reference

/**
 * Context for intelligent image generation
 */
export interface ImageContext {
  /** Public (marketing-grade) vs Internal (functional) docs */
  docContext: DocContext;
  /** Section type for appropriate styling */
  section: DocSection;
  /** Main topic/concept for the image */
  topic: string;
  /** Additional keywords for better prompts */
  keywords?: string[];
  /** Company/project name for branding */
  brandName?: string;
  /** Custom color override */
  primaryColor?: string;
}

/**
 * Image generation options
 */
export interface ImageGenerationOptions {
  /** Image width in pixels (256-2048) */
  width?: number;
  /** Image height in pixels (256-2048) */
  height?: number;
  /** AI model to use */
  model?: 'flux' | 'flux-realism' | 'flux-anime' | 'flux-3d' | 'flux-cablyai' | 'turbo';
  /** Seed for reproducible results */
  seed?: number;
  /** Remove watermark */
  nologo?: boolean;
  /** Output directory (relative to project root) */
  outputDir?: string;
  /** Filename (without extension) */
  filename?: string;
  /** Skip if file already exists */
  skipIfExists?: boolean;
}

/**
 * Preset configurations for common doc assets
 */
export const IMAGE_PRESETS = {
  featureHero: {
    width: 800,
    height: 600,
    model: 'flux' as const,
    nologo: true,
    seed: 42,
  },
  sectionHeader: {
    width: 1200,
    height: 400,
    model: 'flux' as const,
    nologo: true,
    seed: 42,
  },
  icon: {
    width: 64,
    height: 64,
    model: 'flux' as const,
    nologo: true,
    seed: 42,
  },
  socialCard: {
    width: 1200,
    height: 630,
    model: 'flux' as const,
    nologo: true,
    seed: 42,
  },
  emptyState: {
    width: 400,
    height: 300,
    model: 'flux-anime' as const,
    nologo: true,
    seed: 42,
  },
};

/**
 * Enterprise style presets - PUBLIC vs INTERNAL
 *
 * PUBLIC: Marketing-grade, polished, aspirational
 * - Rich gradients, glowing effects, dark backgrounds
 * - Dramatic lighting, cinematic feel
 * - Brand colors prominent
 *
 * INTERNAL: Functional, clean, diagram-focused
 * - Clean white/light backgrounds
 * - Minimal decoration, clear lines
 * - Diagram-like, technical accuracy
 */
export const ENTERPRISE_STYLES = {
  public: {
    base: 'professional SaaS aesthetic, premium quality, polished, aspirational',
    background: 'dark gradient background, subtle glow',
    lighting: 'dramatic lighting, cinematic, volumetric',
    colors: `purple violet gradient ${BRAND_COLORS.primary} to ${BRAND_COLORS.primaryLight}`,
    quality: '8k uhd, high resolution, sharp focus, highly detailed',
    model: 'flux' as const,
  },
  internal: {
    base: 'clean technical illustration, functional, clear, informative',
    background: 'clean white background, minimal',
    lighting: 'soft even lighting, no shadows',
    colors: `subtle purple accent ${BRAND_COLORS.primaryLight}, mostly grayscale`,
    quality: 'sharp lines, clean vector style, high clarity',
    model: 'flux' as const,
  },
};

/**
 * Section-specific style modifiers
 */
export const SECTION_STYLES: Record<DocSection, { public: string; internal: string }> = {
  feature: {
    public: 'abstract product visualization, floating UI elements, innovation theme',
    internal: 'isometric feature diagram, modular components, clean layout',
  },
  architecture: {
    public: 'futuristic system architecture, interconnected nodes, data flow visualization',
    internal: 'C4 diagram style, boxes and arrows, technical architecture, blueprint feel',
  },
  strategy: {
    public: 'business growth visualization, ascending charts, success imagery, executive feel',
    internal: 'roadmap timeline, milestone markers, clean planning diagram',
  },
  operations: {
    public: 'control room dashboard, monitoring screens, real-time data flow',
    internal: 'ops dashboard mockup, metrics grid, status indicators, functional layout',
  },
  governance: {
    public: 'security shield, compliance checkmarks, trust and protection theme',
    internal: 'checklist diagram, policy flowchart, governance structure, formal layout',
  },
  api: {
    public: 'API connections visualization, data streams, integration network',
    internal: 'endpoint diagram, request-response flow, technical API documentation style',
  },
  overview: {
    public: 'bird-eye view of system, holistic visualization, big picture theme',
    internal: 'system overview diagram, high-level components, simplified architecture',
  },
  tutorial: {
    public: 'learning journey visualization, step progression, achievement path',
    internal: 'numbered steps diagram, tutorial flow, educational layout, clear progression',
  },
  reference: {
    public: 'reference library visualization, organized knowledge, comprehensive database',
    internal: 'index card layout, categorized reference, clean documentation grid',
  },
};

/**
 * Prompt templates for different asset types (LEGACY - use buildContextAwarePrompt for new code)
 */
export const PROMPT_TEMPLATES = {
  /** Feature illustration - abstract representation of the feature concept */
  feature: (featureName: string, keywords: string[] = []) => {
    const keywordStr = keywords.length > 0 ? `, ${keywords.join(', ')}` : '';
    return `isometric illustration of ${featureName}${keywordStr}, purple accent ${BRAND_COLORS.primary}, white background, clean vector style, professional, minimal, 8k`;
  },

  /** Living docs network visualization */
  livingDocs: () =>
    `interconnected hexagonal document nodes forming network, glowing purple connections ${BRAND_COLORS.primary}, gradient to ${BRAND_COLORS.primaryLight}, professional SaaS, dark background, 8k, minimal vector`,

  /** Agent/automation system */
  agents: () =>
    `interconnected AI agents as geometric avatars in orbital formation, purple violet theme ${BRAND_COLORS.primary}, futuristic holographic, professional, clean dark background, 8k`,

  /** Workflow/process visualization */
  workflow: () =>
    `branching flowchart paths made of glowing circuit lines, purple gradient ${BRAND_COLORS.primary} to ${BRAND_COLORS.primaryLight}, decision trees, minimal geometric, professional, dark background`,

  /** Section header - abstract theme visualization */
  sectionHeader: (theme: string) =>
    `abstract ${theme} visualization, flowing lines, purple gradient ${BRAND_COLORS.primary}, minimal, professional, wide format, 8k`,

  /** Empty state illustration */
  emptyState: (context: string) =>
    `cute illustration of ${context}, minimal flat design, soft pastel colors with purple ${BRAND_COLORS.primaryLight} accent, friendly, vector style`,

  /** Generic feature card */
  featureCard: (concept: string) =>
    `${concept} in abstract form, purple gradient ${BRAND_COLORS.primary} to ${BRAND_COLORS.primaryLight}, professional SaaS, glowing nodes, dark background, 8k, clean minimal`,
};

/**
 * Build a context-aware prompt for enterprise documentation
 *
 * Generates appropriate prompts based on:
 * - Public vs Internal documentation context
 * - Section type (architecture, strategy, operations, etc.)
 * - Topic and keywords
 *
 * @param context - Image generation context
 * @returns Optimized prompt string
 */
export function buildContextAwarePrompt(context: ImageContext): string {
  const { docContext, section, topic, keywords = [], primaryColor } = context;

  // Get style configurations
  const style = ENTERPRISE_STYLES[docContext];
  const sectionStyle = SECTION_STYLES[section][docContext];

  // Build keyword string
  const keywordStr = keywords.length > 0 ? `, ${keywords.join(', ')}` : '';

  // Use custom color or default
  const colorOverride = primaryColor
    ? style.colors.replace(BRAND_COLORS.primary, primaryColor)
    : style.colors;

  // Compose prompt with all style elements
  const promptParts = [
    topic,                    // Main subject
    keywordStr,               // Additional context
    sectionStyle,             // Section-specific style
    style.base,               // Base aesthetic
    style.background,         // Background style
    style.lighting,           // Lighting
    colorOverride,            // Colors
    style.quality,            // Quality modifiers
  ].filter(Boolean);

  return promptParts.join(', ');
}

/**
 * Get recommended preset for a section type
 */
export function getPresetForSection(section: DocSection): typeof IMAGE_PRESETS.featureHero {
  switch (section) {
    case 'overview':
    case 'strategy':
      return { ...IMAGE_PRESETS.sectionHeader, width: 1200, height: 600 };
    case 'architecture':
      return { ...IMAGE_PRESETS.featureHero, width: 1000, height: 800 };
    case 'api':
    case 'reference':
      return { ...IMAGE_PRESETS.featureHero, width: 800, height: 500 };
    case 'tutorial':
      return { ...IMAGE_PRESETS.featureHero, width: 800, height: 600 };
    default:
      return IMAGE_PRESETS.featureHero;
  }
}

/**
 * Build Pollinations.ai URL for image generation
 */
export function buildPollinationsUrl(prompt: string, options: ImageGenerationOptions = {}): string {
  const {
    width = 1024,
    height = 1024,
    model = 'flux',
    seed,
    nologo = true,
  } = options;

  const encodedPrompt = encodeURIComponent(prompt);
  let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}`;

  if (nologo) {
    url += '&nologo=true';
  }
  if (seed !== undefined) {
    url += `&seed=${seed}`;
  }

  return url;
}

/**
 * Generate a cache key for an image based on prompt and options
 */
export function generateCacheKey(prompt: string, options: ImageGenerationOptions = {}): string {
  const hashInput = JSON.stringify({ prompt, ...options });
  return createHash('md5').update(hashInput).digest('hex').substring(0, 12);
}

/**
 * Download an image from URL and save to file
 */
async function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: Failed to download image`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Clean up partial file
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Clean up partial file
      reject(err);
    });
  });
}

/**
 * Generate an image and save it to the specified location
 *
 * @param prompt - The image generation prompt
 * @param options - Generation options
 * @returns Path to the generated image, or null if skipped/failed
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string | null> {
  const {
    outputDir = '.specweave/docs/internal/assets/images',
    filename,
    skipIfExists = true,
    ...urlOptions
  } = options;

  // Generate filename from cache key if not provided
  const cacheKey = generateCacheKey(prompt, urlOptions);
  const finalFilename = filename || `img-${cacheKey}`;
  const outputPath = path.join(outputDir, `${finalFilename}.jpg`);

  // Check if file already exists
  if (skipIfExists && fs.existsSync(outputPath)) {
    logger.debug(`Image already exists, skipping: ${outputPath}`);
    return outputPath;
  }

  // Ensure output directory exists
  const absoluteOutputDir = path.isAbsolute(outputDir) ? outputDir : path.resolve(outputDir);
  if (!fs.existsSync(absoluteOutputDir)) {
    fs.mkdirSync(absoluteOutputDir, { recursive: true });
  }

  const absoluteOutputPath = path.join(absoluteOutputDir, `${finalFilename}.jpg`);

  // Build URL and download
  const url = buildPollinationsUrl(prompt, urlOptions);
  logger.info(`Generating image: ${finalFilename}`);
  logger.debug(`Prompt: ${prompt.substring(0, 100)}...`);

  try {
    await downloadImage(url, absoluteOutputPath);
    logger.info(`Image saved: ${absoluteOutputPath}`);
    return absoluteOutputPath;
  } catch (error) {
    logger.error(`Failed to generate image: ${error}`);
    return null;
  }
}

/**
 * Generate a feature illustration
 *
 * @param featureName - Name of the feature
 * @param featureId - Feature ID (e.g., "FS-001")
 * @param outputDir - Output directory for images
 * @param keywords - Optional keywords to include in prompt
 */
export async function generateFeatureImage(
  featureName: string,
  featureId: string,
  outputDir: string,
  keywords: string[] = []
): Promise<string | null> {
  const prompt = PROMPT_TEMPLATES.feature(featureName, keywords);
  const filename = `feature-${featureId.toLowerCase()}`;

  return generateImage(prompt, {
    ...IMAGE_PRESETS.featureHero,
    outputDir,
    filename,
    skipIfExists: true,
  });
}

/**
 * Generate a section header image
 *
 * @param theme - Theme/topic of the section
 * @param sectionId - Section identifier for filename
 * @param outputDir - Output directory for images
 */
export async function generateSectionHeaderImage(
  theme: string,
  sectionId: string,
  outputDir: string
): Promise<string | null> {
  const prompt = PROMPT_TEMPLATES.sectionHeader(theme);
  const filename = `section-${sectionId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return generateImage(prompt, {
    ...IMAGE_PRESETS.sectionHeader,
    outputDir,
    filename,
    skipIfExists: true,
  });
}

/**
 * Generate images for a living docs feature folder
 *
 * @param featurePath - Path to the feature folder (e.g., .specweave/docs/internal/specs/FS-001)
 * @param featureName - Display name of the feature
 * @param featureId - Feature ID
 * @returns Object with paths to generated images
 */
export async function generateLivingDocsImages(
  featurePath: string,
  featureName: string,
  featureId: string
): Promise<{ featureImage?: string; success: boolean }> {
  const assetsDir = path.join(featurePath, 'assets');

  try {
    // Generate feature hero image
    const featureImage = await generateFeatureImage(
      featureName,
      featureId,
      assetsDir,
      extractKeywords(featureName)
    );

    return {
      featureImage: featureImage || undefined,
      success: !!featureImage,
    };
  } catch (error) {
    logger.error(`Failed to generate living docs images for ${featureId}: ${error}`);
    return { success: false };
  }
}

/**
 * Extract keywords from a feature name for better image generation
 */
function extractKeywords(featureName: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'feature', 'system', 'module', 'component', 'service', 'implementation',
  ]);

  return featureName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 5);
}

/**
 * Get the relative path from a markdown file to an image
 *
 * @param markdownPath - Path to the markdown file
 * @param imagePath - Path to the image file
 * @returns Relative path for markdown embedding
 */
export function getRelativeImagePath(markdownPath: string, imagePath: string): string {
  const markdownDir = path.dirname(markdownPath);
  return path.relative(markdownDir, imagePath);
}

/**
 * Generate markdown image reference
 *
 * @param altText - Alt text for the image
 * @param imagePath - Path to the image (relative or absolute)
 * @returns Markdown image syntax
 */
export function markdownImage(altText: string, imagePath: string): string {
  return `![${altText}](${imagePath})`;
}

/**
 * Generate an enterprise-grade documentation image
 *
 * This is the main entry point for context-aware image generation.
 * It automatically applies appropriate styling based on whether the
 * documentation is public (marketing) or internal (functional).
 *
 * @param context - Image generation context (topic, section, docContext)
 * @param outputDir - Directory to save the image
 * @param filename - Optional filename (auto-generated if not provided)
 * @returns Path to generated image, or null if failed
 *
 * @example
 * // Public feature illustration
 * await generateEnterpriseImage({
 *   docContext: 'public',
 *   section: 'feature',
 *   topic: 'User Authentication',
 *   keywords: ['OAuth', 'SSO', 'security']
 * }, './docs/assets');
 *
 * @example
 * // Internal architecture diagram
 * await generateEnterpriseImage({
 *   docContext: 'internal',
 *   section: 'architecture',
 *   topic: 'Microservices Architecture',
 *   keywords: ['API gateway', 'services', 'database']
 * }, './.specweave/docs/internal/assets');
 */
export async function generateEnterpriseImage(
  context: ImageContext,
  outputDir: string,
  filename?: string
): Promise<string | null> {
  const prompt = buildContextAwarePrompt(context);
  const preset = getPresetForSection(context.section);

  // Generate filename from context if not provided
  const finalFilename = filename || [
    context.docContext,
    context.section,
    context.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30),
  ].join('-');

  logger.info(`Generating ${context.docContext} ${context.section} image: ${context.topic}`);

  return generateImage(prompt, {
    ...preset,
    model: ENTERPRISE_STYLES[context.docContext].model,
    outputDir,
    filename: finalFilename,
    skipIfExists: true,
  });
}

/**
 * Generate a complete set of images for a documentation section
 *
 * Creates hero image and optionally section header for a documentation folder.
 *
 * @param sectionPath - Path to the documentation section folder
 * @param sectionName - Display name of the section
 * @param sectionType - Type of section (architecture, strategy, etc.)
 * @param docContext - Public or internal documentation
 * @param keywords - Keywords extracted from content
 */
export async function generateSectionImages(
  sectionPath: string,
  sectionName: string,
  sectionType: DocSection,
  docContext: DocContext,
  keywords: string[] = []
): Promise<{ heroImage?: string; headerImage?: string; success: boolean }> {
  const assetsDir = path.join(sectionPath, 'assets');
  const results: { heroImage?: string; headerImage?: string; success: boolean } = { success: true };

  try {
    // Generate hero image
    const heroImage = await generateEnterpriseImage(
      {
        docContext,
        section: sectionType,
        topic: sectionName,
        keywords,
      },
      assetsDir,
      `hero-${sectionType}`
    );
    if (heroImage) {
      results.heroImage = heroImage;
    }

    // For public docs, also generate a header banner
    if (docContext === 'public') {
      const headerImage = await generateImage(
        buildContextAwarePrompt({
          docContext: 'public',
          section: sectionType,
          topic: `${sectionName} section banner`,
          keywords,
        }),
        {
          ...IMAGE_PRESETS.sectionHeader,
          outputDir: assetsDir,
          filename: `header-${sectionType}`,
          skipIfExists: true,
        }
      );
      if (headerImage) {
        results.headerImage = headerImage;
      }
    }

    return results;
  } catch (error) {
    logger.error(`Failed to generate section images for ${sectionName}: ${error}`);
    return { success: false };
  }
}

/**
 * Generate images for living docs feature folder (enhanced version)
 *
 * @param featurePath - Path to the feature folder
 * @param featureName - Display name of the feature
 * @param featureId - Feature ID (e.g., "FS-001")
 * @param docContext - Public or internal documentation (default: internal)
 * @returns Object with paths to generated images
 */
export async function generateLivingDocsImagesEnhanced(
  featurePath: string,
  featureName: string,
  featureId: string,
  docContext: DocContext = 'internal'
): Promise<{ featureImage?: string; headerImage?: string; success: boolean }> {
  const assetsDir = path.join(featurePath, 'assets');
  const keywords = extractKeywords(featureName);

  try {
    // Generate feature hero image
    const featureImage = await generateEnterpriseImage(
      {
        docContext,
        section: 'feature',
        topic: featureName,
        keywords,
      },
      assetsDir,
      `feature-${featureId.toLowerCase()}`
    );

    return {
      featureImage: featureImage || undefined,
      success: !!featureImage,
    };
  } catch (error) {
    logger.error(`Failed to generate living docs images for ${featureId}: ${error}`);
    return { success: false };
  }
}

/**
 * Analyze content and extract relevant keywords for image generation
 *
 * @param content - Markdown or text content to analyze
 * @returns Array of relevant keywords
 */
export function extractKeywordsFromContent(content: string): string[] {
  // Technical terms that make good image keywords
  const technicalPatterns = [
    /\b(API|REST|GraphQL|webhook|endpoint)\b/gi,
    /\b(database|SQL|NoSQL|Redis|PostgreSQL|MongoDB)\b/gi,
    /\b(authentication|auth|OAuth|JWT|SSO|security)\b/gi,
    /\b(microservice|container|Kubernetes|Docker|cloud)\b/gi,
    /\b(frontend|backend|fullstack|React|Vue|Angular)\b/gi,
    /\b(machine learning|ML|AI|model|training|inference)\b/gi,
    /\b(CI\/CD|pipeline|deployment|release|automation)\b/gi,
    /\b(monitoring|metrics|logging|observability|dashboard)\b/gi,
    /\b(testing|TDD|unit test|integration|E2E)\b/gi,
    /\b(workflow|process|automation|orchestration)\b/gi,
  ];

  const keywords = new Set<string>();

  for (const pattern of technicalPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(m => keywords.add(m.toLowerCase()));
    }
  }

  // Also extract from headers (## Section Name)
  const headers = content.match(/^#+\s+(.+)$/gm);
  if (headers) {
    headers.forEach(h => {
      const words = h.replace(/^#+\s+/, '').toLowerCase().split(/\s+/);
      words.forEach(w => {
        if (w.length > 3 && !['the', 'and', 'for', 'with'].includes(w)) {
          keywords.add(w);
        }
      });
    });
  }

  return Array.from(keywords).slice(0, 8);
}
