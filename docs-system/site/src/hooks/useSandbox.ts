import { useState, useCallback, useRef } from 'react';

interface ConsoleLog {
  method: 'log' | 'warn' | 'error' | 'info';
  args: any[];
  timestamp: number;
}

interface SandboxState {
  isRunning: boolean;
  consoleLogs: ConsoleLog[];
  error: Error | null;
}

export function useSandbox() {
  const [state, setState] = useState<SandboxState>({
    isRunning: false,
    consoleLogs: [],
    error: null,
  });
  
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const runIdRef = useRef(0);

  const handleConsole = useCallback((method: ConsoleLog['method'], args: any[]) => {
    setState(prev => ({
      ...prev,
      consoleLogs: [
        ...prev.consoleLogs,
        { method, args, timestamp: Date.now() }
      ],
    }));
  }, []);

  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error,
      isRunning: false,
    }));
  }, []);

  const run = useCallback((code: string, dependencies: Record<string, string> = {}) => {
    runIdRef.current += 1;
    
    setState({
      isRunning: true,
      consoleLogs: [],
      error: null,
    });

    return { runId: runIdRef.current };
  }, []);

  const stop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
    }));
    
    // Clean up iframe if needed
    if (iframeRef.current) {
      iframeRef.current.srcdoc = '';
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isRunning: false,
      consoleLogs: [],
      error: null,
    });
    runIdRef.current = 0;
  }, []);

  const clearConsole = useCallback(() => {
    setState(prev => ({
      ...prev,
      consoleLogs: [],
    }));
  }, []);

  return {
    ...state,
    iframeRef,
    run,
    stop,
    reset,
    clearConsole,
    handleConsole,
    handleError,
  };
}
