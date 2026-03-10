import React from 'react';
import {
  Zap, Shield, Code, Layout, GitBranch, Terminal,
  Check, Copy, ArrowRight, ChevronRight, Star, Heart,
  Users, BarChart3, Clock, Globe, Layers, Puzzle,
  BookOpen, Lightbulb, Rocket, Settings, Target, Eye,
  FileText, Package, RefreshCw, Search, Lock, Sparkles,
  Play, Download, ExternalLink, Menu, X, ChevronDown,
} from 'lucide-react';

// Docusaurus 3 uses @svgr/webpack: SVG imports are React components, not URLs.
// Rendering them via <BrandSvg /> instead of <img src={...}> ensures they work
// on all machines (not just cached local builds).
import AzureSvg from './brands/azure.svg';
import ClaudeSvg from './brands/claude.svg';
import CopilotSvg from './brands/copilot.svg';
import CursorSvg from './brands/cursor.svg';
import DiscordSvg from './brands/discord.svg';
import GithubSvg from './brands/github.svg';
import JiraSvg from './brands/jira.svg';
import YoutubeSvg from './brands/youtube.svg';

const brandMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  azure: AzureSvg,
  claude: ClaudeSvg,
  copilot: CopilotSvg,
  cursor: CursorSvg,
  discord: DiscordSvg,
  github: GithubSvg,
  jira: JiraSvg,
  youtube: YoutubeSvg,
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
    const BrandComponent = brandMap[brand];
    if (!BrandComponent) return null;
    return (
      <BrandComponent
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
