/**
 * Build documentation data from source files
 * 
 * Usage: npx tsx docs-system/scripts/build-docs.ts
 */

import * as path from 'path';
import * as fs from 'fs';

// Dynamic import for ES module compatibility
async function main() {
  const { buildDocsData } = await import('../parser/index.js');

  // Get project root (parent of docs-system)
  // Use process.cwd() and go up one level from docs-system
  const cwd = process.cwd();
  const rootDir = cwd.endsWith('docs-system') 
    ? path.resolve(cwd, '..') 
    : cwd;

  console.log('🔍 Building documentation...');
  console.log('Project root:', rootDir, '\n');

  // Convert Windows paths to forward slashes for glob
  const toGlobPath = (p: string) => p.replace(/\\/g, '/');

  try {
    await buildDocsData({
      sourcePatterns: [
        toGlobPath(path.join(rootDir, 'src/**/*.js')),
        '!' + toGlobPath(path.join(rootDir, 'src/**/*.test.js')),
        '!' + toGlobPath(path.join(rootDir, 'src/**/node_modules/**')),
      ],
      examplesDir: path.join(rootDir, 'example'),
      outputDir: path.join(rootDir, 'docs-system/data'),
    });

    // Copy data to site public folder for development
    const dataDir = path.join(rootDir, 'docs-system/data');
    const publicDir = path.join(rootDir, 'docs-system/site/public');

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Copy api.json
    const apiJsonPath = path.join(dataDir, 'api.json');
    if (fs.existsSync(apiJsonPath)) {
      fs.copyFileSync(apiJsonPath, path.join(publicDir, 'api.json'));
      console.log('Copied api.json to site/public/');
    }

    // Copy examples.json
    const examplesJsonPath = path.join(dataDir, 'examples.json');
    if (fs.existsSync(examplesJsonPath)) {
      fs.copyFileSync(examplesJsonPath, path.join(publicDir, 'examples.json'));
      console.log('Copied examples.json to site/public/');
    }

    // Copy thumbnail images to site/public/thumbnails/
    const screenshotsDir = path.join(rootDir, 'example', 'screenshots');
    const thumbsPublicDir = path.join(publicDir, 'thumbnails');
    if (fs.existsSync(screenshotsDir)) {
      if (!fs.existsSync(thumbsPublicDir)) {
        fs.mkdirSync(thumbsPublicDir, { recursive: true });
      }
      const thumbFiles = fs.readdirSync(screenshotsDir)
        .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
      for (const f of thumbFiles) {
        fs.copyFileSync(
          path.join(screenshotsDir, f),
          path.join(thumbsPublicDir, f),
        );
      }
      if (thumbFiles.length > 0) {
        console.log(`Copied ${thumbFiles.length} thumbnails to site/public/thumbnails/`);
      }
    }

    console.log('\n✅ Documentation build complete!');
    console.log('\nNext steps:');
    console.log('  1. cd docs-system/site');
    console.log('  2. npm install');
    console.log('  3. npm run dev');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();
