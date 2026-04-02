/**
 * ProviderBreakdown — per-provider cost summary with expandable model details
 */

import { useState } from 'react';

interface ProviderData {
  total_cost: number;
  total_tokens: number;
  sessions: number;
  models: Record<string, { cost: number; tokens: number; sessions: number }>;
}

interface ProviderBreakdownProps {
  data: Record<string, ProviderData> | null | undefined;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-indigo-500/20 text-indigo-400',
  openai: 'bg-emerald-500/20 text-emerald-400',
  google: 'bg-amber-500/20 text-amber-400',
  mistral: 'bg-red-500/20 text-red-400',
  groq: 'bg-violet-500/20 text-violet-400',
  together: 'bg-cyan-500/20 text-cyan-400',
  'aws-bedrock': 'bg-orange-500/20 text-orange-400',
  'azure-openai': 'bg-blue-500/20 text-blue-400',
};

function formatCost(cost: number): string {
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

export function ProviderBreakdown({ data }: ProviderBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        No multi-provider spend data
      </div>
    );
  }

  const sorted = Object.entries(data).sort((a, b) => b[1].total_cost - a[1].total_cost);

  return (
    <div className="space-y-2">
      {sorted.map(([provider, info]) => (
        <div key={provider}>
          <button
            className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-800/50 transition-colors"
            onClick={() => setExpanded(expanded === provider ? null : provider)}
          >
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${PROVIDER_COLORS[provider] || 'bg-gray-500/20 text-gray-400'}`}>
                {provider}
              </span>
              <span className="text-xs text-gray-500">{info.sessions} sessions</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">{formatTokens(info.total_tokens)} tokens</span>
              <span className="text-white font-medium">{formatCost(info.total_cost)}</span>
              <span className="text-gray-600">{expanded === provider ? '▲' : '▼'}</span>
            </div>
          </button>

          {expanded === provider && (
            <div className="ml-6 mt-1 space-y-1">
              {Object.entries(info.models)
                .sort((a, b) => b[1].cost - a[1].cost)
                .map(([model, modelInfo]) => (
                  <div key={model} className="flex items-center justify-between py-1 px-2 text-xs text-gray-400">
                    <span className="truncate max-w-48">{model}</span>
                    <div className="flex items-center gap-3">
                      <span>{formatTokens(modelInfo.tokens)}</span>
                      <span className="text-gray-300">{formatCost(modelInfo.cost)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
