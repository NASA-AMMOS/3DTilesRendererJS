import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { extractFromFile } from './jsdoc-extractor';
import { loadExamples } from './example-loader';
import type { BuildConfig, APIDocumentation, ExamplesDocumentation } from './types';

export * from './types';
export { extractFromFile, extractFromCode } from './jsdoc-extractor';
export { loadExamples } from './example-loader';

/**
 * Build documentation data from source files
 */
export async function buildDocsData(config: BuildConfig): Promise<void> {
  const { sourcePatterns, examplesDir, outputDir } = config;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Parsing source files...');

  // Find all matching source files
  const allClasses: any[] = [];

  for (const pattern of sourcePatterns) {
    const isNegation = pattern.startsWith('!');
    if (isNegation) continue;

    const files = await glob(pattern, { nodir: true });

    for (const file of files) {
      // Check if file should be excluded
      const shouldExclude = sourcePatterns.some(p => {
        if (!p.startsWith('!')) return false;
        const excludePattern = p.slice(1);
        return file.includes(excludePattern.replace('*', ''));
      });

      if (shouldExclude) continue;

      try {
        const classes = extractFromFile(file);
        allClasses.push(...classes);
        if (classes.length > 0) {
          console.log(`  Found ${classes.length} class(es) in ${file}`);
        }
      } catch (error) {
        console.warn(`  Warning: Failed to parse ${file}:`, (error as Error).message);
      }
    }
  }

  // Deduplicate classes by name, keeping the one with most documentation
  const classMap = new Map<string, any>();
  for (const cls of allClasses) {
    const existing = classMap.get(cls.name);
    if (!existing) {
      classMap.set(cls.name, cls);
    } else {
      // Keep the one with more documentation content
      const existingScore = (existing.description?.length || 0) + 
                           (existing.properties?.length || 0) + 
                           (existing.methods?.length || 0) +
                           (existing.examples?.length || 0);
      const newScore = (cls.description?.length || 0) + 
                      (cls.properties?.length || 0) + 
                      (cls.methods?.length || 0) +
                      (cls.examples?.length || 0);
      if (newScore > existingScore) {
        classMap.set(cls.name, cls);
      }
    }
  }
  const uniqueClasses = Array.from(classMap.values());

  // Create API documentation
  const apiDoc: APIDocumentation = {
    version: getPackageVersion(),
    generatedAt: new Date().toISOString(),
    classes: uniqueClasses,
  };

  const apiOutputPath = path.join(outputDir, 'api.json');
  fs.writeFileSync(apiOutputPath, JSON.stringify(apiDoc, null, 2));
  console.log(`API documentation written to ${apiOutputPath}`);
  console.log(`  Total classes: ${uniqueClasses.length} (deduplicated from ${allClasses.length})`);

  // Load examples if directory exists
  if (fs.existsSync(examplesDir)) {
    console.log('\nLoading examples...');
    const examples = await loadExamples(examplesDir);

    const examplesDoc: ExamplesDocumentation = {
      version: getPackageVersion(),
      generatedAt: new Date().toISOString(),
      examples,
    };

    const examplesOutputPath = path.join(outputDir, 'examples.json');
    fs.writeFileSync(examplesOutputPath, JSON.stringify(examplesDoc, null, 2));
    console.log(`Examples documentation written to ${examplesOutputPath}`);
    console.log(`  Total examples: ${examples.length}`);
  }
}

/**
 * Get package version from package.json
 */
function getPackageVersion(): string {
  try {
    // Look for package.json in project root (one level up from docs-system)
    const cwd = process.cwd();
    const rootDir = cwd.endsWith('docs-system') ? path.resolve(cwd, '..') : cwd;
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
    );
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
