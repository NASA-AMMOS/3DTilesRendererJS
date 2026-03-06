import { useRef, useEffect } from 'react';
import clsx from 'clsx';

interface ConsoleLog {
  method: 'log' | 'warn' | 'error' | 'info';
  args: any[];
  timestamp: number;
}

interface ConsolePanelProps {
  logs: ConsoleLog[];
  error: Error | null;
}

export function ConsolePanel({ logs, error }: ConsolePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatArg = (arg: any): string => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs p-2"
    >
      {logs.length === 0 && !error ? (
        <div className="text-gray-500 italic p-2">
          Console output will appear here...
        </div>
      ) : (
        <>
          {logs.map((log, i) => (
            <div
              key={i}
              className={clsx(
                'console-log py-1 px-2 border-b border-[#333] flex gap-2',
                {
                  'warn': log.method === 'warn',
                  'error': log.method === 'error',
                }
              )}
            >
              <span className="text-gray-500 flex-shrink-0">
                [{formatTime(log.timestamp)}]
              </span>
              <span className={clsx({
                'text-yellow-400': log.method === 'warn',
                'text-red-400': log.method === 'error',
                'text-blue-400': log.method === 'info',
              })}>
                {log.args.map(formatArg).join(' ')}
              </span>
            </div>
          ))}
          {error && (
            <div className="console-log error py-1 px-2 text-red-400">
              <strong>Error:</strong> {error.message}
              {error.stack && (
                <pre className="mt-1 text-red-300 opacity-75 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
