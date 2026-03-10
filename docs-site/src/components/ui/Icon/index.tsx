import React from 'react';
import {
  Zap, Shield, Code, Layout, GitBranch, Terminal,
  Check, Copy, ArrowRight, ChevronRight, Star, Heart,
  Users, BarChart3, Clock, Globe, Layers, Puzzle,
  BookOpen, Lightbulb, Rocket, Settings, Target, Eye,
  FileText, Package, RefreshCw, Search, Lock, Sparkles,
  Play, Download, ExternalLink, Menu, X, ChevronDown,
} from 'lucide-react';

// Static imports — dynamic require(`./brands/${brand}.svg`) breaks webpack
// bundling because it can't resolve template literals at build time.
// On machines without browser cache, the SVGs were missing from the bundle.
import azureSvg from './brands/azure.svg';
import claudeSvg from './brands/claude.svg';
import copilotSvg from './brands/copilot.svg';
import cursorSvg from './brands/cursor.svg';
import discordSvg from './brands/discord.svg';
import githubSvg from './brands/github.svg';
import jiraSvg from './brands/jira.svg';
import youtubeSvg from './brands/youtube.svg';

const brandMap: Record<string, string> = {
  azure: azureSvg,
  claude: claudeSvg,
  copilot: copilotSvg,
  cursor: cursorSvg,
  discord: discordSvg,
  github: githubSvg,
  jira: jiraSvg,
  youtube: youtubeSvg,
};

const iconMap: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  zap: Zap, shield: Shield, code: Code, layout: Layout,
  'git-branch': GitBranch, terminal: Terminal,
  check: Check, copy: Copy, 'arrow-right': ArrowRight,
  'chevron-right': ChevronRight, star: Star, heart: Heart,
  users: Users, 'bar-chart-3': BarChart3, clock: Clock,
  globe: Globe, layers: Layers, puzzle: Puzzle,
  'book-open': BookOpen, lightbulb: Lightbulb, rocket: Rocket,
  settings: Settings, target: Target, eye: Eye,
  'file-text': FileText, package: Package, 'refresh-cw': RefreshCw,
  search: Search, lock: Lock, sparkles: Sparkles,
  play: Play, download: Download, 'external-link': ExternalLink,
  menu: Menu, x: X, 'chevron-down': ChevronDown,
};

interface IconProps {
  name?: string;
  brand?: string;
  size?: number;
  className?: string;
}

export default function Icon({ name, brand, size = 24, className }: IconProps) {
  if (brand) {
    const brandSrc = brandMap[brand];
    if (!brandSrc) return null;
    return (
      <img
        src={brandSrc}
        alt={brand}
        width={size}
        height={size}
        className={className}
        style={{ display: 'inline-block' }}
      />
    );
  }

  if (name) {
    const LucideIcon = iconMap[name];
    if (!LucideIcon) return null;
    return <LucideIcon size={size} className={className} />;
  }

  return null;
}
