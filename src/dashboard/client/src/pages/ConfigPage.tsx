import { useState } from 'react';
import { useProjectApi } from '../hooks/useProjectApi';
import { useProject } from '../hooks/useProject';
import { PageLoader } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';

export function ConfigPage() {
  const { data, loading, error, refetch } = useProjectApi<Record<string, unknown>>('/api/config');
  const { activeProject } = useProject();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return null;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const hasEdits = Object.keys(edits).length > 0;

  const handleFieldChange = (dotPath: string, value: unknown) => {
    setEdits((prev) => ({ ...prev, [dotPath]: value }));
  };

  const handleSave = async () => {
    if (!hasEdits) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // Build partial config object from dot-path edits
      const partial: Record<string, unknown> = {};
      for (const [dotPath, value] of Object.entries(edits)) {
        setNestedValue(partial, dotPath, value);
      }
      const projectParam = activeProject ? `?project=${activeProject.id}` : '';
      const res = await fetch(`/api/config${projectParam}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (json.ok) {
        setSaveMsg('Saved');
        setEdits({});
        refetch();
        setTimeout(() => setSaveMsg(null), 2000);
      } else {
        setSaveMsg(`Error: ${json.error}`);
      }
    } catch (err) {
      setSaveMsg(`Error: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setEdits({});
    setSaveMsg(null);
  };

  const sections = Object.entries(data).filter(([_, v]) => typeof v === 'object' && v !== null);
  const scalars = Object.entries(data).filter(([_, v]) => typeof v !== 'object' || v === null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Configuration</h2>
          <span className="text-xs text-gray-500">.specweave/config.json</span>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
              {saveMsg}
            </span>
          )}
          {hasEdits && (
            <>
              <Badge label={`${Object.keys(edits).length} changes`} variant="warning" />
              <button
                onClick={handleDiscard}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scalar values */}
      {scalars.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">General</h3>
          <div className="space-y-3">
            {scalars.map(([key, value]) => (
              <EditableField
                key={key}
                path={key}
                label={key}
                value={edits[key] !== undefined ? edits[key] : value}
                original={value}
                onChange={(v) => handleFieldChange(key, v)}
                edited={edits[key] !== undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {sections.map(([key, value]) => (
        <div key={key} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection(key)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-300 capitalize">{key}</h3>
              {countSectionEdits(edits, key) > 0 && (
                <Badge label={`${countSectionEdits(edits, key)} edited`} variant="warning" />
              )}
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.has(key) ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.has(key) && (
            <div className="px-5 py-3 border-t border-gray-800">
              <EditableSection
                data={value as Record<string, unknown>}
                path={key}
                edits={edits}
                onChange={handleFieldChange}
                depth={0}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EditableSection({ data, path, edits, onChange, depth }: {
  data: Record<string, unknown>;
  path: string;
  edits: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
  depth: number;
}) {
  if (depth > 4) return <span className="text-xs text-gray-600">...</span>;

  return (
    <div className="space-y-3" style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      {Object.entries(data).map(([key, value]) => {
        const dotPath = `${path}.${key}`;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return (
            <div key={key}>
              <span className="text-xs text-gray-400 font-mono font-medium">{key}</span>
              <EditableSection
                data={value as Record<string, unknown>}
                path={dotPath}
                edits={edits}
                onChange={onChange}
                depth={depth + 1}
              />
            </div>
          );
        }
        return (
          <EditableField
            key={key}
            path={dotPath}
            label={key}
            value={edits[dotPath] !== undefined ? edits[dotPath] : value}
            original={value}
            onChange={(v) => onChange(dotPath, v)}
            edited={edits[dotPath] !== undefined}
          />
        );
      })}
    </div>
  );
}

function EditableField({ path, label, value, original, onChange, edited }: {
  path: string;
  label: string;
  value: unknown;
  original: unknown;
  onChange: (value: unknown) => void;
  edited: boolean;
}) {
  if (typeof original === 'boolean' || typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-gray-500 font-mono">{label}</span>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            value ? 'bg-indigo-600' : 'bg-gray-700'
          } ${edited ? 'ring-1 ring-amber-500/50' : ''}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            value ? 'left-[18px]' : 'left-0.5'
          }`} />
        </button>
      </div>
    );
  }

  if (typeof original === 'number' || typeof value === 'number') {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-gray-500 font-mono">{label}</span>
        <input
          type="number"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 0)}
          className={`bg-gray-800 border text-xs text-amber-400 font-mono rounded px-2 py-1 w-24 text-right ${
            edited ? 'border-amber-500/50' : 'border-gray-700'
          } focus:ring-indigo-500 focus:border-indigo-500`}
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-gray-500 font-mono">{label}</span>
        <span className="text-xs text-gray-400 font-mono">[{(value as unknown[]).length} items]</span>
      </div>
    );
  }

  // String or null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500 font-mono">{label}</span>
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-gray-800 border text-xs text-gray-300 rounded px-2 py-1 w-48 text-right ${
          edited ? 'border-amber-500/50' : 'border-gray-700'
        } focus:ring-indigo-500 focus:border-indigo-500`}
      />
    </div>
  );
}

/** Count how many edits are under a section prefix */
function countSectionEdits(edits: Record<string, unknown>, prefix: string): number {
  return Object.keys(edits).filter(k => k.startsWith(prefix + '.')).length;
}

/** Set a nested value from a dot-path like "sync.github.owner" */
function setNestedValue(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const parts = dotPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}
