import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { ExampleFile } from './types';

function toExampleRelativePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/(example\/.+)$/);
  if (match) return match[1];
  return path.basename(filePath);
}

export async function loadExamples(examplesDir: string): Promise<ExampleFile[]> {
  const pattern = path.join(examplesDir, '**/*.{js,jsx}').replace(/\\/g, '/');
  const files = await glob(pattern, { nodir: true });

  const examples: ExampleFile[] = [];

  for (const file of files) {
    const relative = path.relative(examplesDir, file).replace(/\\/g, '/');

    // Skip helper/utility files inside src/ subdirectories
    if (relative.includes('/src/') || relative.startsWith('src/')) continue;

    // Skip jsx files (R3F components) that aren't top-level examples
    if (/\/components\//.test(relative) || /\/plugins\//.test(relative)) continue;

    const example = parseExampleFile(file, examplesDir);
    if (example) {
      examples.push(example);
    }
  }

  return examples;
}

function parseExampleFile(filePath: string, examplesDir: string): ExampleFile | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  const metadata = extractMetadata(content);

  if (!metadata.title) {
    metadata.title = path.basename(filePath, ext)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  const relativePath = path.relative(process.cwd(), filePath);
  const relativeToExamples = path.relative(examplesDir, filePath).replace(/\\/g, '/');

  // Determine framework from directory: three/, r3f/, babylonjs/
  const firstDir = relativeToExamples.split('/')[0];
  const framework = (['three', 'r3f', 'babylonjs'].includes(firstDir)
    ? firstDir
    : 'three') as ExampleFile['framework'];

  const category = metadata.category || firstDir || 'general';

  // Detect local imports (relative paths like ./src/... or ../../src/...)
  const localImportPattern = /^\s*import\s+.*from\s+['"]\.\.?\/[^'"]+['"]/gm;
  const hasLocalImports = localImportPattern.test(content);

  // Auto-detect npm dependencies from import statements
  const deps = detectDependencies(content);

  // Parse paired HTML file for DOM element IDs
  const htmlElements = parseHtmlElements(filePath);

  // Detect thumbnail image
  const thumbnail = findThumbnail(filePath, examplesDir);

  return {
    id: generateId(filePath),
    title: metadata.title,
    description: metadata.description || '',
    code: content,
    category,
    dependencies: metadata.dependencies?.length ? metadata.dependencies : deps,
    sourceFile: toExampleRelativePath(filePath),
    framework,
    hasLocalImports,
    htmlElements,
    thumbnail,
  };
}

function detectDependencies(code: string): string[] {
  const deps = new Set<string>();
  const importRegex = /^\s*import\s+.*?from\s+['"]([^'"./][^'"]*)['"]/gm;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const specifier = match[1];
    // Extract package name (handle scoped packages and subpaths)
    const parts = specifier.split('/');
    const pkgName = specifier.startsWith('@')
      ? parts.slice(0, 2).join('/')
      : parts[0];
    deps.add(pkgName);
  }
  return Array.from(deps);
}

function parseHtmlElements(jsFilePath: string): string[] {
  const htmlPath = jsFilePath.replace(/\.jsx?$/, '.html');
  if (!fs.existsSync(htmlPath)) return [];

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const ids: string[] = [];
  const idRegex = /<(?:div|span|p|section)\s[^>]*id=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function findThumbnail(jsFilePath: string, examplesDir: string): string | undefined {
  const baseName = path.basename(jsFilePath, path.extname(jsFilePath));
  const dir = path.dirname(jsFilePath);
  const exts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

  // Check same directory: wmtsTiles.png next to wmtsTiles.js
  for (const ext of exts) {
    const candidate = path.join(dir, baseName + ext);
    if (fs.existsSync(candidate)) {
      return `thumbnails/${baseName}${ext}`;
    }
  }

  // Check screenshots subdirectory: example/screenshots/wmtsTiles.png
  const screenshotsDir = path.join(examplesDir, 'screenshots');
  if (fs.existsSync(screenshotsDir)) {
    for (const ext of exts) {
      const candidate = path.join(screenshotsDir, baseName + ext);
      if (fs.existsSync(candidate)) {
        return `thumbnails/${baseName}${ext}`;
      }
    }
  }

  return undefined;
}

function extractMetadata(content: string): {
  title?: string;
  description?: string;
  dependencies?: string[];
  category?: string;
} {
  const metadata: {
    title?: string;
    description?: string;
    dependencies?: string[];
    category?: string;
  } = {};

  const normalizedContent = content.replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n').slice(0, 20);
  for (const line of lines) {
    const tagMatch = line.match(/^\/\/\s*@(\w+):\s*(.+)$/);
    if (tagMatch) {
      processMetaTag(metadata, tagMatch[1], tagMatch[2]);
    }
  }

  return metadata;
}

function processMetaTag(
  metadata: { title?: string; description?: string; dependencies?: string[]; category?: string },
  tag: string,
  value: string
): void {
  switch (tag.toLowerCase()) {
    case 'title':
      metadata.title = value.trim();
      break;
    case 'description':
    case 'desc':
      metadata.description = value.trim();
      break;
    case 'deps':
    case 'dependencies':
      metadata.dependencies = value.split(',').map(d => d.trim());
      break;
    case 'category':
      metadata.category = value.trim();
      break;
  }
}

function generateId(filePath: string): string {
  return path.basename(filePath, path.extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
