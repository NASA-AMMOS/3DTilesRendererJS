import { useState, useCallback, useRef, useEffect } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { ConsolePanel } from './ConsolePanel';
import { ThreePreview } from './ThreePreview';

interface ConsoleLog {
  method: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  timestamp: number;
}

interface CodeSandboxProps {
  initialCode: string;
  hasLocalImports?: boolean;
  htmlElements?: string[];
  deployedUrl?: string;
  autoRun?: boolean;
}

export function CodeSandbox({
  initialCode,
  hasLocalImports,
  htmlElements,
  deployedUrl,
  autoRun = false,
}: CodeSandboxProps) {
  const [code, setCode] = useState(initialCode);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'console'>('preview');
  const runIdRef = useRef(0);
  const hasAutoRun = useRef(false);

  useEffect(() => {
    setCode(initialCode);
    hasAutoRun.current = false;
  }, [initialCode]);

  useEffect(() => {
    if (autoRun && !hasAutoRun.current && initialCode && !hasLocalImports) {
      hasAutoRun.current = true;
      runIdRef.current += 1;
      setIsRunning(true);
    }
  }, [autoRun, initialCode, hasLocalImports]);

  const handleRun = useCallback(() => {
    runIdRef.current += 1;
    setConsoleLogs([]);
    setError(null);
    setIsRunning(true);
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setCode(initialCode);
    setConsoleLogs([]);
    setError(null);
    setIsRunning(false);
  }, [initialCode]);

  const handleConsole = useCallback((method: ConsoleLog['method'], args: string[]) => {
    setConsoleLogs(prev => [...prev, { method, args, timestamp: Date.now() }]);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
    setConsoleLogs(prev => [
      ...prev,
      { method: 'error', args: [err.message], timestamp: Date.now() }
    ]);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  }, [handleRun]);

  return (
    <div className="sandbox-container" onKeyDown={handleKeyDown}>
      <div className="sandbox-editor">
        {hasLocalImports && (
          <div className="px-3 py-2 text-xs bg-amber-500/10 text-amber-400 border-b border-amber-500/20">
            This example uses local imports that cannot run in the sandbox.
            {deployedUrl && (
              <>
                {' '}
                <a
                  href={deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-300"
                >
                  View deployed version
                </a>
              </>
            )}
          </div>
        )}

        <div className="editor-toolbar">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="btn-run"
            title="Run (Ctrl+Enter)"
          >
            &#9654; Run
          </button>
          <button
            onClick={handleStop}
            disabled={!isRunning}
            className="btn-stop"
          >
            &#9209; Stop
          </button>
          <button onClick={handleReset} className="btn-reset">
            &#8634; Reset
          </button>
          <span className="ml-auto text-xs text-[var(--color-text-secondary)]">
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>

        <div className="flex-1 min-h-0">
          <MonacoEditor
            value={code}
            onChange={setCode}
            language="javascript"
          />
        </div>
      </div>

      <div className="sandbox-preview">
        <div className="flex border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'console'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Console
            {consoleLogs.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-[var(--color-border)] rounded-full">
                {consoleLogs.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 min-h-0 relative">
          {activeTab === 'preview' ? (
            <ThreePreview
              code={code}
              isRunning={isRunning}
              runId={runIdRef.current}
              onConsole={handleConsole}
              onError={handleError}
              htmlElements={htmlElements}
            />
          ) : (
            <ConsolePanel logs={consoleLogs} error={error} />
          )}
        </div>
      </div>
    </div>
  );
}
