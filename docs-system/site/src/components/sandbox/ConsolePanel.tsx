interface ConsoleLog {
  method: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  timestamp: number;
}

interface ConsolePanelProps {
  logs: ConsoleLog[];
  error: Error | null;
}

const METHOD_STYLES: Record<string, string> = {
  log: 'text-gray-300',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

export function ConsolePanel({ logs, error }: ConsolePanelProps) {
  return (
    <div className="w-full h-full overflow-auto bg-[#1e1e2e] p-3 font-mono text-xs">
      {logs.length === 0 && !error && (
        <div className="text-gray-500 italic">No console output yet.</div>
      )}
      {logs.map((log, i) => (
        <div key={i} className={`py-0.5 ${METHOD_STYLES[log.method] || 'text-gray-300'}`}>
          <span className="text-gray-500 mr-2">[{log.method}]</span>
          {log.args.join(' ')}
        </div>
      ))}
      {error && (
        <div className="py-1 text-red-400 border-t border-red-400/20 mt-2 pt-2">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
