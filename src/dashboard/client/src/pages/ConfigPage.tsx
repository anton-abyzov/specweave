import { useState } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { useProject } from '../hooks/useProject.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { Badge } from '../components/ui/Badge.js';

interface ValidationError {
  path: string;
  message: string;
}

export function ConfigPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  useSSEEvent('config-changed', () => setRefreshKey((k) => k + 1));
  const { data, loading, error, refetch } = useProjectApi<Record<string, unknown>>(`/api/config?_r=${refreshKey}`);
  const { activeProject } = useProject();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

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
    // Clear validation error for this path
    setValidationErrors(prev => prev.filter(e => e.path !== dotPath));
  };

  const handleValidateAndSave = async () => {
    if (!hasEdits) return;
    setSaving(true);
    setSaveMsg(null);
    setValidationErrors([]);

    try {
      // Build partial config object from dot-path edits
      const partial: Record<string, unknown> = {};
      for (const [dotPath, value] of Object.entries(edits)) {
        setNestedValue(partial, dotPath, value);
      }

      const projectParam = activeProject ? `?project=${activeProject.id}` : '';

      // Step 1: Validate
      const validateRes = await fetch(`/api/config/validate${projectParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const validateJson = await validateRes.json();

      if (validateJson.errors && validateJson.errors.length > 0) {
        setValidationErrors(validateJson.errors);
        setSaveMsg('Validation failed. Fix errors before saving.');
        setSaving(false);
        return;
      }

      // Step 2: Save
      const res = await fetch(`/api/config${projectParam}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (json.ok) {
        setSaveMsg('Saved successfully');
        setEdits({});
        setValidationErrors([]);
        refetch();
        setTimeout(() => setSaveMsg(null), 3000);
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
    setValidationErrors([]);
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
            <span className={`text-xs ${saveMsg.startsWith('Error') || saveMsg.startsWith('Validation') ? 'text-rose-400' : 'text-emerald-400'}`}>
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
                onClick={handleValidateAndSave}
                disabled={saving}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Save Success/Error Banner */}
      {saveMsg && !hasEdits && saveMsg === 'Saved successfully' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400">Configuration saved successfully</span>
        </div>
      )}

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-xs text-rose-400 font-medium">Validation errors</span>
          </div>
          {validationErrors.map((err, i) => (
            <div key={i} className="text-xs text-rose-300 pl-4">
              <span className="font-mono text-rose-400">{err.path}</span>: {err.message}
            </div>
          ))}
        </div>
      )}

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
                validationError={validationErrors.find(e => e.path === key)?.message}
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
              {validationErrors.some(e => e.path.startsWith(key + '.')) && (
                <Badge label="errors" variant="error" />
              )}
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expandedSections.has(key) ? 'rotate-180' : ''}`}
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
                validationErrors={validationErrors}
                depth={0}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EditableSection({ data, path, edits, onChange, validationErrors, depth }: {
  data: Record<string, unknown>;
  path: string;
  edits: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
  validationErrors: ValidationError[];
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
                validationErrors={validationErrors}
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
            validationError={validationErrors.find(e => e.path === dotPath)?.message}
          />
        );
      })}
    </div>
  );
}

function EditableField({ path, label, value, original, onChange, edited, validationError }: {
  path: string;
  label: string;
  value: unknown;
  original: unknown;
  onChange: (value: unknown) => void;
  edited: boolean;
  validationError?: string;
}) {
  if (typeof original === 'boolean' || typeof value === 'boolean') {
    return (
      <div className="py-1">
        <div className="flex items-center justify-between">
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
        {validationError && <p className="text-[10px] text-rose-400 mt-0.5">{validationError}</p>}
      </div>
    );
  }

  if (typeof original === 'number' || typeof value === 'number') {
    return (
      <div className="py-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">{label}</span>
          <input
            type="number"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 0)}
            className={`bg-gray-800 border text-xs text-amber-400 font-mono rounded px-2 py-1 w-24 text-right ${
              validationError ? 'border-rose-500' : edited ? 'border-amber-500/50' : 'border-gray-700'
            } focus:ring-indigo-500 focus:border-indigo-500`}
          />
        </div>
        {validationError && <p className="text-[10px] text-rose-400 mt-0.5 text-right">{validationError}</p>}
      </div>
    );
  }

  if (Array.isArray(original) || Array.isArray(value)) {
    return (
      <ArrayField
        path={path}
        label={label}
        value={(Array.isArray(value) ? value : Array.isArray(original) ? original : []) as unknown[]}
        edited={edited}
        onChange={onChange}
        validationError={validationError}
      />
    );
  }

  // String or null
  return (
    <div className="py-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">{label}</span>
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={`bg-gray-800 border text-xs text-gray-300 rounded px-2 py-1 w-48 text-right ${
            validationError ? 'border-rose-500' : edited ? 'border-amber-500/50' : 'border-gray-700'
          } focus:ring-indigo-500 focus:border-indigo-500`}
        />
      </div>
      {validationError && <p className="text-[10px] text-rose-400 mt-0.5 text-right">{validationError}</p>}
    </div>
  );
}

function ArrayField({ path, label, value, edited, onChange, validationError }: {
  path: string;
  label: string;
  value: unknown[];
  edited: boolean;
  onChange: (value: unknown) => void;
  validationError?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem] = useState('');

  const handleRemove = (index: number) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setNewItem('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="py-1">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center justify-between w-full group"
      >
        <span className="text-xs text-gray-500 font-mono">{label}</span>
        <div className="flex items-center gap-2">
          {edited && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          <span className="text-xs text-gray-400 font-mono">[{value.length} items]</span>
          <svg
            className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 ml-4 space-y-1">
          {value.length === 0 && (
            <p className="text-[10px] text-gray-600">No items</p>
          )}
          {value.map((item, i) => (
            <div key={i} className="flex items-center gap-2 group/item">
              <span className="text-xs text-gray-300 font-mono flex-1 truncate">{String(item)}</span>
              <button
                onClick={() => handleRemove(i)}
                className="text-[10px] text-gray-600 hover:text-rose-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
              >
                remove
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add item..."
              className="bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1 flex-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newItem.trim()}
              className="px-2 py-1 text-[10px] text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}
      {validationError && <p className="text-[10px] text-rose-400 mt-0.5">{validationError}</p>}
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
