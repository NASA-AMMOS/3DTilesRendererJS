import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { ExampleFile } from './types';

/**
 * Load example files from directory
 */
export async function loadExamples(examplesDir: string): Promise<ExampleFile[]> {
  // Use forward slashes for glob on Windows
  const pattern = path.join(examplesDir, '**/*.{js,html}').replace(/\\/g, '/');
  const files = await glob(pattern, { nodir: true });

  const examples: ExampleFile[] = [];

  for (const file of files) {
    const example = await parseExampleFile(file);
    if (example) {
      examples.push(example);
    }
  }

  return examples;
}

/**
 * Parse a single example file
 */
async function parseExampleFile(filePath: string): Promise<ExampleFile | null> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);

  // Extract metadata from file header comment
  const metadata = extractMetadata(content, ext);

  if (!metadata.title) {
    // Use filename as title if no metadata
    metadata.title = path.basename(filePath, ext)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // Determine category from metadata or directory structure
  const relativePath = path.relative(process.cwd(), filePath);
  const parts = relativePath.split(path.sep);
  const defaultCategory = parts.length > 2 ? parts[1] : 'general';
  const category = metadata.category || defaultCategory;

  return {
    id: generateId(filePath),
    title: metadata.title,
    description: metadata.description || '',
    code: content,
    category,
    dependencies: metadata.dependencies || [],
    sourceFile: relativePath,
  };
}

/**
 * Extract metadata from file header comment
 * Supports formats:
 * 
 * // @title: Example Title
 * // @description: Example description
 * // @deps: three, lodash
 * 
 * Or HTML:
 * <!-- 
 *   @title: Example Title
 *   @description: Example description
 * -->
 */
function extractMetadata(content: string, ext: string): {
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

  // Match JS single-line comments or HTML comments  
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  if (ext === '.html') {
    // Look for HTML comments with metadata
    const htmlCommentPattern = /<!--([\s\S]*?)-->/;
    const htmlComment = normalizedContent.match(htmlCommentPattern);
    if (htmlComment) {
      const commentContent = htmlComment[1];
      const lines = commentContent.split('\n');
      for (const line of lines) {
        const tagMatch = line.match(/@(\w+):\s*(.+)/);
        if (tagMatch) {
          processMetaTag(metadata, tagMatch[1], tagMatch[2]);
        }
      }
    }
  } else {
    // Look for metadata in first 20 lines of JS files
    const lines = normalizedContent.split('\n').slice(0, 20);
    for (const line of lines) {
      // Match both "// @tag: value" formats
      const tagMatch = line.match(/^\/\/\s*@(\w+):\s*(.+)$/);
      if (tagMatch) {
        processMetaTag(metadata, tagMatch[1], tagMatch[2]);
      }
    }
  }

  return metadata;
}

/**
 * Process a metadata tag
 */
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

/**
 * Generate unique ID from file path
 */
function generateId(filePath: string): string {
  return path.basename(filePath, path.extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
