import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
}: MonacoEditorProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => onChange(v || '')}
      theme={isDark ? 'vs-dark' : 'light'}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        readOnly,
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
        },
      }}
    />
  );
}
