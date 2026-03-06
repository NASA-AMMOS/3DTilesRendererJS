import { useRef, useEffect } from 'react';

interface ThreePreviewProps {
  code: string;
  isRunning: boolean;
  runId: number;
  onConsole: (method: 'log' | 'warn' | 'error' | 'info', args: any[]) => void;
  onError: (error: Error) => void;
}

const SANDBOX_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #1a1a2e; }
    canvas { display: block; width: 100%; height: 100%; }
    #container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="container">
    <canvas id="canvas"></canvas>
  </div>
  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <script>
    // Override console to send messages to parent
    const originalConsole = { ...console };
    ['log', 'warn', 'error', 'info'].forEach(method => {
      console[method] = (...args) => {
        originalConsole[method](...args);
        try {
          parent.postMessage({ 
            type: 'console', 
            method, 
            args: args.map(arg => {
              if (arg instanceof Error) return arg.message;
              if (typeof arg === 'object') {
                try { return JSON.stringify(arg); }
                catch { return String(arg); }
              }
              return arg;
            })
          }, '*');
        } catch (e) {}
      };
    });

    // Error handler
    window.onerror = (msg, url, line, col, error) => {
      parent.postMessage({ 
        type: 'error', 
        message: msg,
        stack: error?.stack
      }, '*');
      return true;
    };

    window.onunhandledrejection = (e) => {
      parent.postMessage({ 
        type: 'error', 
        message: e.reason?.message || String(e.reason),
        stack: e.reason?.stack
      }, '*');
    };

    // Setup Three.js globals
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('container');
    
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Resize handler
    window.addEventListener('resize', () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Mock module system - libraries are loaded via script tags
    const mockModules = {
      'three': THREE,
      'THREE': THREE,
    };

    // Receive code from parent
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'run') {
        try {
          // Preprocess code: remove/transform import statements
          let code = event.data.code;
          
          // Remove import statements (libraries loaded via script tags)
          code = code.replace(/^\\s*import\\s+.*?from\\s+['"][^'"]+['"];?\\s*$/gm, '');
          code = code.replace(/^\\s*import\\s+['"][^'"]+['"];?\\s*$/gm, '');
          code = code.replace(/^\\s*import\\s*\\{[^}]*\\}\\s*from\\s*['"][^'"]+['"];?\\s*$/gm, '');
          code = code.replace(/^\\s*import\\s+\\*\\s+as\\s+\\w+\\s+from\\s+['"][^'"]+['"];?\\s*$/gm, '');
          
          // Remove export statements
          code = code.replace(/^\\s*export\\s+(default\\s+)?/gm, '');
          
          // Create async function to allow await
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const fn = new AsyncFunction('THREE', 'renderer', 'canvas', 'container', code);
          await fn(THREE, renderer, canvas, container);
        } catch (error) {
          parent.postMessage({ 
            type: 'error', 
            message: error.message,
            stack: error.stack
          }, '*');
        }
      }
    });

    // Signal ready
    parent.postMessage({ type: 'ready' }, '*');
  </script>
</body>
</html>
`;

export function ThreePreview({
  code,
  isRunning,
  runId,
  onConsole,
  onError,
}: ThreePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;

      switch (event.data.type) {
        case 'ready':
          readyRef.current = true;
          // Run code if we're supposed to be running
          if (isRunning && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              { type: 'run', code },
              '*'
            );
          }
          break;
        case 'console':
          onConsole(event.data.method, event.data.args);
          break;
        case 'error':
          onError(new Error(event.data.message));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [code, isRunning, onConsole, onError]);

  // Run code when isRunning changes or runId changes
  useEffect(() => {
    if (isRunning && readyRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'run', code },
        '*'
      );
    }
  }, [isRunning, runId]);

  // Reset iframe when stopped
  useEffect(() => {
    if (!isRunning) {
      readyRef.current = false;
    }
  }, [isRunning]);

  return (
    <div className="w-full h-full relative">
      {isRunning ? (
        <iframe
          ref={iframeRef}
          key={runId}
          srcDoc={SANDBOX_HTML}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          title="Three.js Preview"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e] text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">▶</div>
            <div>Click "Run" to start preview</div>
          </div>
        </div>
      )}
    </div>
  );
}
