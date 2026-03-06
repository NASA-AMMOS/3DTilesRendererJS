import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ParamTable } from './ParamTable';
import { TypeBadge } from './TypeBadge';
import { TableOfContents } from './TableOfContents';
import { CodeBlock } from './CodeBlock';

const GITHUB_REPO = 'https://github.com/NASA-AMMOS/3DTilesRendererJS';
const GITHUB_BRANCH = 'master';

const THREE_JS_CLASS_CATEGORIES: Record<string, string> = {
  EventDispatcher: 'core',
  Object3D: 'core',
  BufferGeometry: 'core',
  Raycaster: 'core',
  LineSegments: 'objects',
  Mesh: 'objects',
  Group: 'objects',
  BatchedMesh: 'objects',
  InstancedMesh: 'objects',
  Sprite: 'objects',
  Points: 'objects',
  Line: 'objects',
  LOD: 'objects',
  DataTexture: 'textures',
  Texture: 'textures',
  CompressedTexture: 'textures',
  Frustum: 'math',
  Vector3: 'math',
  Matrix4: 'math',
  Box3: 'math',
  Sphere: 'math',
  Quaternion: 'math',
  Euler: 'math',
  ShaderMaterial: 'materials',
  Material: 'materials',
  MeshBasicMaterial: 'materials',
  MeshStandardMaterial: 'materials',
  Scene: 'scenes',
  Camera: 'cameras',
  PerspectiveCamera: 'cameras',
  OrthographicCamera: 'cameras',
  WebGLRenderer: 'renderers',
  Loader: 'loaders',
};

export function getThreeJsDocsUrl(className: string): string | null {
  const category = THREE_JS_CLASS_CATEGORIES[className];
  if (!category) return null;
  return `https://threejs.org/docs/#api/en/${category}/${className}`;
}

interface ParsedClass {
  name: string;
  description: string;
  category?: string;
  extends?: string;
  examples: any[];
  constructor?: any;
  properties: any[];
  methods: any[];
  sourceFile: string;
  line: number;
}

interface ClassDocProps {
  data: ParsedClass;
  allClassNames?: string[];
}

function getGitHubSourceUrl(sourceFile: string, line: number): string {
  let filePath = sourceFile.replace(/\\/g, '/');
  // Strip absolute path prefix up to and including project root
  const srcIdx = filePath.indexOf('/src/');
  if (srcIdx !== -1) {
    filePath = filePath.substring(srcIdx + 1);
  }
  filePath = filePath.replace(/^\.\//, '');
  return `${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${filePath}#L${line}`;
}

function getSourceDisplayPath(sourceFile: string, line: number): string {
  let filePath = sourceFile.replace(/\\/g, '/');
  const srcIdx = filePath.indexOf('/src/');
  if (srcIdx !== -1) {
    filePath = filePath.substring(srcIdx + 1);
  }
  filePath = filePath.replace(/^\.\//, '');
  return `${filePath}:${line}`;
}

export function ClassDoc({ data, allClassNames = [] }: ClassDocProps) {
  const tocItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];

    if (data.constructor) {
      items.push({ id: 'constructor', label: 'Constructor' });
    }
    if (data.properties.length > 0) {
      items.push({ id: 'properties', label: 'Properties' });
      data.properties.forEach((prop: any) => {
        items.push({ id: `prop-${prop.name}`, label: prop.name });
      });
    }
    if (data.methods.length > 0) {
      items.push({ id: 'methods', label: 'Methods' });
      data.methods.forEach((method: any) => {
        items.push({ id: `method-${method.name}`, label: `${method.name}()` });
      });
    }
    return items;
  }, [data]);

  return (
    <div className="flex gap-6">
      <article className="api-class flex-1 min-w-0">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold font-mono">{data.name}</h1>
            {data.category && (
              <span className="px-2 py-1 text-xs font-medium bg-[var(--color-bg-secondary)] rounded">
                {data.category}
              </span>
            )}
          </div>
          {data.extends && (
            <div className="text-sm text-[var(--color-text-secondary)] mb-4">
              extends{' '}
              {allClassNames.includes(data.extends) ? (
                <Link
                  to={`/api/${data.extends}`}
                  className="text-[var(--color-primary)] hover:underline font-mono"
                >
                  {data.extends}
                </Link>
              ) : getThreeJsDocsUrl(data.extends) ? (
                <a
                  href={getThreeJsDocsUrl(data.extends)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline font-mono"
                  title="View Three.js documentation"
                >
                  {data.extends}
                </a>
              ) : (
                <span className="font-mono">{data.extends}</span>
              )}
            </div>
          )}
          <p className="text-[var(--color-text-secondary)]">
            {data.description || 'No description available.'}
          </p>
          <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Source:{' '}
            <a
              href={getGitHubSourceUrl(data.sourceFile, data.line)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:underline font-mono"
            >
              {getSourceDisplayPath(data.sourceFile, data.line)}
            </a>
          </div>
        </header>

        {/* Constructor */}
        {data.constructor && (
          <section className="api-section" id="constructor">
            <h2 className="text-xl font-semibold mb-4">Constructor</h2>
            <div className="api-method">
              <div className="api-method-signature">
                new {data.name}({data.constructor.params.map((p: any) => p.name).join(', ')})
              </div>
              {data.constructor.description && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  {data.constructor.description}
                </p>
              )}
              {data.constructor.params.length > 0 && (
                <ParamTable params={data.constructor.params} />
              )}
            </div>
          </section>
        )}

        {/* Properties */}
        {data.properties.length > 0 && (
          <section className="api-section" id="properties">
            <h2 className="text-xl font-semibold mb-4">Properties</h2>
            <div className="space-y-2">
              {data.properties.map((prop: any) => (
                <div key={prop.name} className="api-method" id={`prop-${prop.name}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[var(--color-primary)]">
                      {prop.name}
                    </span>
                    <TypeBadge type={prop.type} />
                    {prop.readonly && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded dark:bg-yellow-900 dark:text-yellow-200">
                        readonly
                      </span>
                    )}
                  </div>
                  {prop.description && (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {prop.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Methods */}
        {data.methods.length > 0 && (
          <section className="api-section" id="methods">
            <h2 className="text-xl font-semibold mb-4">Methods</h2>
            <div className="space-y-4">
              {data.methods.map((method: any) => (
                <div key={method.name} className="api-method" id={`method-${method.name}`}>
                  <div className="api-method-signature">
                    {method.isStatic && <span className="text-purple-500">static </span>}
                    {method.isAsync && <span className="text-green-500">async </span>}
                    {method.name}({method.params.map((p: any) => p.name).join(', ')})
                    {method.returns && (
                      <span className="text-[var(--color-text-secondary)]">
                        {' → '}<TypeBadge type={method.returns.type} />
                      </span>
                    )}
                  </div>
                  {method.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] my-2">
                      {method.description}
                    </p>
                  )}
                  {method.params.length > 0 && (
                    <ParamTable params={method.params} />
                  )}
                  {method.returns?.description && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Returns:</span>{' '}
                      <span className="text-[var(--color-text-secondary)]">
                        {method.returns.description}
                      </span>
                    </div>
                  )}

                  {method.examples?.map((example: any, i: number) => (
                    <div key={i} className="mt-4">
                      <CodeBlock
                        code={example.code}
                        title={example.title}
                        language="javascript"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Right sidebar: ON THIS PAGE */}
      <TableOfContents items={tocItems} />
    </div>
  );
}
