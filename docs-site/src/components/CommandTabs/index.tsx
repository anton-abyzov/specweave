import {useState} from 'react';
import styles from './CommandTabs.module.css';

interface CommandTabsProps {
  /** Natural language invocation (chat-style) */
  natural: string;
  /** Claude Code slash command */
  claude: string;
  /** Other AI tools CLI command */
  other: string;
}

const tabs = [
  {id: 'natural', label: 'Natural Language', icon: ChatIcon},
  {id: 'claude', label: 'Claude Code', icon: TerminalIcon},
  {id: 'other', label: 'Other AI Tools', icon: CodeIcon},
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function CommandTabs({natural, claude, other}: CommandTabsProps) {
  const [active, setActive] = useState<TabId>('natural');

  const values: Record<TabId, string> = {natural, claude, other};

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabBar} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={`${styles.tab} ${active === t.id ? styles.tabActive : ''}`}
            onClick={() => setActive(t.id)}
          >
            <span className={styles.tabIcon}><t.icon /></span>
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {active === 'natural' ? (
        <div className={styles.bubblePanel} role="tabpanel">
          <div className={styles.bubble}>
            <span className={styles.bubbleQuote}>"{natural}"</span>
          </div>
        </div>
      ) : (
        <div className={styles.codePanel} role="tabpanel">
          <pre className={styles.codePre}><code>{values[active]}</code></pre>
          <CopyButton text={values[active]} />
        </div>
      )}
    </div>
  );
}

/* ---------- tiny inline icons ---------- */

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 3.5h11a1 1 0 011 1v6a1 1 0 01-1 1h-3l-3 2.5v-2.5h-5a1 1 0 01-1-1v-6a1 1 0 011-1z" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l3 2-3 2" />
      <path d="M9 10h3" />
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 3.5l-4 4.5 4 4.5" />
      <path d="M10.5 3.5l4 4.5-4 4.5" />
    </svg>
  );
}

function CopyButton({text}: {text: string}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: ignore
    }
  };

  return (
    <button className={styles.copyButton} onClick={handleCopy} title="Copy" aria-label="Copy to clipboard">
      {copied ? (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-6" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="8" height="8" rx="1" />
          <path d="M3 11V3h8" />
        </svg>
      )}
    </button>
  );
}
