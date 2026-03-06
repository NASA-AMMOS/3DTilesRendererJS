import { useState, useEffect, useCallback } from 'react';
import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = 'javascript', title }: CodeBlockProps) {
  const [html, setHtml] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
    }).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => { cancelled = true; };
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="code-block-wrapper group relative rounded-lg overflow-hidden">
      {title && (
        <div className="text-xs text-[var(--color-text-secondary)] px-4 py-1.5 bg-[#161b22] border-b border-[#30363d]">
          {title}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-[#30363d] text-[#8b949e] opacity-0 group-hover:opacity-100 hover:bg-[#484f58] hover:text-white transition-all"
        title="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      {html ? (
        <div
          className="code-block-content text-sm overflow-x-auto [&>pre]:!p-4 [&>pre]:!m-0 [&>pre]:!rounded-none [&>pre]:!bg-[#0d1117]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="bg-[#0d1117] text-[#e6edf3] p-4 text-sm overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
