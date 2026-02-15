import { useState } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { Badge } from '../components/ui/Badge.js';
import { BarChart } from '../components/charts/BarChart.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { useCommand } from '../hooks/useCommand.js';
import { CommandOutput } from '../components/ui/CommandOutput.js';

interface PluginInfo {
  name: string;
  version: string;
  skillCount: number;
  commandCount: number;
}

interface SkillUsage {
  name: string;
  plugin: string;
  count: number;
  successCount: number;
  failureCount: number;
  avgDuration?: number;
  lastUsed: string;
}

interface LspStatus {
  checked: string;
  status: string;
  missing: Array<{
    language: string;
    type: string;
    binaryInstall: string;
    message: string;
  }>;
  stats: {
    totalLanguages: number;
    checkedLanguages: number;
    binaryMissing: number;
    pluginMissing: number;
  };
}

interface LspWarmup {
  warmedUp: string[];
  failed: string[];
  elapsed: number;
  timestamp: string;
}

interface FullPluginData {
  plugins: PluginInfo[];
  skills: SkillUsage[];
  lsp: LspStatus | null;
  warmup: LspWarmup | null;
  triggerCount: number;
}

export function PluginsPage() {
  const { data, loading } = useProjectApi<FullPluginData>('/api/plugins/full');
  const { execute, running, output, status: cmdStatus, reset } = useCommand();
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);

  if (loading) return <PageLoader />;

  const plugins = data?.plugins || [];
  const skills = data?.skills || [];
  const lsp = data?.lsp;
  const warmup = data?.warmup;
  const triggerCount = data?.triggerCount || 0;

  const totalSkills = plugins.reduce((s, p) => s + p.skillCount, 0);
  const totalCommands = plugins.reduce((s, p) => s + p.commandCount, 0);

  const getPluginSkills = (pluginName: string): SkillUsage[] => {
    return skills.filter(s => s.plugin === pluginName).sort((a, b) => b.count - a.count);
  };

  const togglePlugin = (name: string) => {
    setExpandedPlugin(prev => prev === name ? null : name);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Plugins & LSP</h2>
        <div className="flex gap-2">
          <button
            onClick={() => execute('lsp-status')}
            disabled={running}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            Check LSP
          </button>
          <button
            onClick={() => execute('refresh-marketplace')}
            disabled={running}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            {running ? 'Running...' : 'Refresh Marketplace'}
          </button>
        </div>
      </div>

      {/* Command Output */}
      <CommandOutput lines={output} status={cmdStatus} onDismiss={reset} />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label="Plugins" value={plugins.length} />
        <StatBox label="Total Skills" value={totalSkills} />
        <StatBox label="Total Commands" value={totalCommands} />
        <StatBox label="Trigger Keywords" value={triggerCount} />
      </div>

      {/* Installed Plugins - Expandable Cards */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">Installed Plugins</h3>
        </div>
        {plugins.length === 0 ? (
          <div className="p-5 text-gray-500 text-xs">No plugins installed</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {plugins.map((p) => {
              const isExpanded = expandedPlugin === p.name;
              const pluginSkills = getPluginSkills(p.name);
              return (
                <div key={p.name}>
                  <button
                    onClick={() => togglePlugin(p.name)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-300">{p.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{p.version}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge label={`${p.skillCount} skills`} variant="info" />
                      <Badge label={`${p.commandCount} cmds`} variant="default" />
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-800/20">
                      {pluginSkills.length === 0 ? (
                        <p className="text-xs text-gray-600 py-2">No skill usage data for this plugin</p>
                      ) : (
                        <div className="space-y-1 mt-1">
                          <div className="grid grid-cols-[1fr,80px,80px,120px] gap-2 px-2 py-1">
                            <span className="text-[10px] text-gray-600 uppercase">Skill</span>
                            <span className="text-[10px] text-gray-600 uppercase text-right">Invocations</span>
                            <span className="text-[10px] text-gray-600 uppercase text-right">Success</span>
                            <span className="text-[10px] text-gray-600 uppercase text-right">Last Used</span>
                          </div>
                          {pluginSkills.map(skill => (
                            <div key={skill.name} className="grid grid-cols-[1fr,80px,80px,120px] gap-2 px-2 py-1.5 bg-gray-800/40 rounded">
                              <span className="text-xs text-gray-300 font-mono truncate">{skill.name}</span>
                              <span className="text-xs text-gray-400 text-right font-mono">{skill.count}</span>
                              <span className="text-xs text-right font-mono">
                                <span className="text-emerald-400">{skill.successCount}</span>
                                {skill.failureCount > 0 && (
                                  <span className="text-rose-400">/{skill.failureCount}</span>
                                )}
                              </span>
                              <span className="text-[10px] text-gray-500 text-right">
                                {skill.lastUsed ? timeAgo(skill.lastUsed) : '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill Usage Leaderboard */}
      {skills.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Skill Usage Leaderboard</h3>
          <BarChart
            items={skills
              .sort((a, b) => b.count - a.count)
              .slice(0, 20)
              .map((s) => ({ label: s.name, value: s.count, color: '#10b981' }))}
            maxBars={20}
          />
        </div>
      )}

      {/* LSP Status */}
      {lsp && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">LSP Status</h3>
            <div className="flex items-center gap-2">
              <Badge label={lsp.status} variant={lsp.status === 'ok' ? 'success' : 'warning'} />
              {lsp.checked && (
                <span className="text-[10px] text-gray-600">
                  Checked: {new Date(lsp.checked).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatBox label="Total Languages" value={lsp.stats.totalLanguages} />
            <StatBox label="Checked" value={lsp.stats.checkedLanguages} />
            <StatBox label="Binary Missing" value={lsp.stats.binaryMissing} />
            <StatBox label="Plugin Missing" value={lsp.stats.pluginMissing} />
          </div>
          {lsp.missing.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-gray-500">Missing Languages</h4>
              {lsp.missing.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge label={m.type} variant={m.type === 'binary' ? 'warning' : 'default'} />
                    <span className="text-xs text-gray-300">{m.language}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-gray-500">{m.binaryInstall}</code>
                    {m.message && (
                      <span className="text-[10px] text-gray-600 max-w-[200px] truncate">{m.message}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LSP Warmup */}
      {warmup && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">LSP Warmup Status</h3>
            <span className="text-[10px] text-gray-600">
              {warmup.elapsed ? `${(warmup.elapsed / 1000).toFixed(1)}s` : ''} |{' '}
              {warmup.timestamp ? new Date(warmup.timestamp).toLocaleString() : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {warmup.warmedUp.map((lang) => (
              <Badge key={lang} label={lang} variant="success" />
            ))}
            {warmup.failed.map((lang) => (
              <Badge key={lang} label={lang} variant="error" />
            ))}
          </div>
          {warmup.warmedUp.length === 0 && warmup.failed.length === 0 && (
            <p className="text-gray-600 text-xs">No warmup data</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-gray-300">{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function timeAgo(ts: string): string {
  if (!ts) return '-';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
