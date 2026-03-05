import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
}

export default function CodeBlock({ code, language, showCopy = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (non-secure context or permission denied)
    }
  }, [code]);

  return (
    <div className={styles.container}>
      {language && <span className={styles.language}>{language}</span>}
      {showCopy && (
        <button
          className={styles.copyButton}
          onClick={handleCopy}
          type="button"
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      )}
      <pre className={styles.pre}>
        <code className={styles.code}>{code}</code>
      </pre>
    </div>
  );
}
