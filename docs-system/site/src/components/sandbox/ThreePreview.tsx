import { useRef, useEffect, useMemo } from 'react';

interface ThreePreviewProps {
  code: string;
  isRunning: boolean;
  runId: number;
  onConsole: (method: 'log' | 'warn' | 'error' | 'info', args: string[]) => void;
  onError: (error: Error) => void;
  htmlElements?: string[];
}

function buildSandboxHTML(code: string, htmlElements: string[] = []): string {
  const envProcessed = code.replace(
    /import\.meta\.env\.(\w+)/g,
    '(window.__ENV__?.["$1"] ?? "")'
  );

  const domElements = htmlElements
    .map(id => `<div id="${id}"></div>`)
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    html, body {
      overflow: hidden;
      font-family: Arial, Helvetica, sans-serif;
      user-select: none;
      width: 100%;
      height: 100%;
    }
    canvas {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      outline: none;
    }
    #info {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      text-align: center;
      padding: 5px;
      pointer-events: none;
      line-height: 1.5em;
    }
    #info, #info a { color: white; }
    #info a { pointer-events: all; }
    #footer {
      position: absolute;
      bottom: 0;
      width: 100%;
      display: flex;
      padding: 5px;
      box-sizing: border-box;
      pointer-events: none;
    }
    #credits {
      flex: 1;
      color: white;
      font-size: 12px;
      opacity: 0.5;
      padding: 5px;
      line-height: 1.25em;
      overflow: hidden;
      white-space: pre;
      text-overflow: ellipsis;
      padding-right: 25px;
    }
    .lil-gui { --width: 250px; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
      "three/": "https://unpkg.com/three@0.170.0/",
      "3d-tiles-renderer": "https://esm.sh/3d-tiles-renderer@0.4.21",
      "3d-tiles-renderer/plugins": "https://esm.sh/3d-tiles-renderer@0.4.21/plugins"
    }
  }
  </script>
</head>
<body>
    ${domElements}
    <div id="footer"><div id="credits"></div></div>

  <script>
    window.__ENV__ = {};

    var originalConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
    ['log', 'warn', 'error', 'info'].forEach(function(method) {
      console[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        originalConsole[method].apply(console, args);
        try {
          parent.postMessage({
            type: 'console',
            method: method,
            args: args.map(function(arg) {
              if (arg instanceof Error) return arg.message;
              if (typeof arg === 'object') {
                try { return JSON.stringify(arg); }
                catch(e) { return String(arg); }
              }
              return String(arg);
            })
          }, '*');
        } catch (e) {}
      };
    });

    window.onerror = function(msg, url, line, col, error) {
      parent.postMessage({
        type: 'error',
        message: String(msg),
        stack: error ? error.stack : ''
      }, '*');
      return true;
    };

    window.onunhandledrejection = function(e) {
      parent.postMessage({
        type: 'error',
        message: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled rejection',
        stack: e.reason ? e.reason.stack : ''
      }, '*');
    };
  </script>

  <script type="module">
${envProcessed}
  </script>
</body>
</html>`;
}

export function ThreePreview({
  code,
  isRunning,
  runId,
  onConsole,
  onError,
  htmlElements,
}: ThreePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;
      switch (event.data.type) {
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
  }, [onConsole, onError]);

  const sandboxDoc = useMemo(
    () => (isRunning ? buildSandboxHTML(code, htmlElements) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRunning, runId],
  );

  return (
    <div className="w-full h-full relative">
      {isRunning ? (
        <iframe
          ref={iframeRef}
          key={runId}
          srcDoc={sandboxDoc}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Three.js Preview"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e] text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">&#9654;</div>
            <div>Click &quot;Run&quot; to start preview</div>
          </div>
        </div>
      )}
    </div>
  );
}
