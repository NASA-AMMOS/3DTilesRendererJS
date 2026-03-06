import { useState, useCallback, useRef, useEffect } from 'react';
import { MonacoEditor } from './MonacoEditor';
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

const METHOD_COLORS: Record<string, string> = {
  log: 'text-gray-300',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

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
  const [consoleOpen, setConsoleOpen] = useState(false);
  const runIdRef = useRef(0);
  const hasAutoRun = useRef(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (consoleOpen && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, consoleOpen]);

  const handleRun = useCallback(() => {
    runIdRef.current += 1;
    setConsoleLogs([]);
    setIsRunning(true);
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setCode(initialCode);
    setConsoleLogs([]);
    setIsRunning(false);
  }, [initialCode]);

  const handleConsole = useCallback((method: ConsoleLog['method'], args: string[]) => {
    setConsoleLogs(prev => [...prev, { method, args, timestamp: Date.now() }]);
  }, []);

  const handleError = useCallback((err: Error) => {
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

  const errorCount = consoleLogs.filter(l => l.method === 'error').length;
  const warnCount = consoleLogs.filter(l => l.method === 'warn').length;

  return (
    <div className="sandbox-container" onKeyDown={handleKeyDown}>
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

      <div className="sandbox-toolbar">
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
        <span className={`ml-2 text-xs ${isRunning ? 'text-green-400' : 'text-[var(--color-text-secondary)]'}`}>
          {isRunning ? 'Running' : ''}
        </span>
      </div>

      <div className="sandbox-body">
        <div className="sandbox-editor">
          <MonacoEditor
            value={code}
            onChange={setCode}
            language="javascript"
          />
        </div>

        <div className="sandbox-preview-wrapper">
          <div className={`sandbox-preview ${consoleOpen ? 'with-console' : ''}`}>
            <ThreePreview
              code={code}
              isRunning={isRunning}
              runId={runIdRef.current}
              onConsole={handleConsole}
              onError={handleError}
              htmlElements={htmlElements}
            />
          </div>

          <div className={`sandbox-console ${consoleOpen ? 'open' : ''}`}>
            <div
              className="sandbox-console-header"
              onClick={() => setConsoleOpen(!consoleOpen)}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-3 h-3 transition-transform ${consoleOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span className="font-medium">Console</span>
                {consoleLogs.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-border)]">
                    {consoleLogs.length}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                    {errorCount} error{errorCount > 1 ? 's' : ''}
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                    {warnCount} warn{warnCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {consoleOpen && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setConsoleLogs([]); }}
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--color-border)] transition-colors"
                    title="Clear console"
                  >
                    Clear
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConsoleOpen(false); }}
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--color-border)] transition-colors"
                    title="Minimize"
                  >
                    Minimize
                  </button>
                </div>
              )}
            </div>

            {consoleOpen && (
              <div className="sandbox-console-body">
                {consoleLogs.length === 0 ? (
                  <div className="text-gray-500 italic text-[11px] px-3 py-2">No console output.</div>
                ) : (
                  consoleLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`px-3 py-0.5 text-[11px] font-mono border-b border-[#2a2a3a] ${METHOD_COLORS[log.method]}`}
                    >
                      {log.args.join(' ')}
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
