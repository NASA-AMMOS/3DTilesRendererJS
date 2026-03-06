/**
 * Capture example thumbnails using Puppeteer.
 *
 * Prerequisites:
 *   npm install -D puppeteer  (in docs-system/)
 *
 * Usage:
 *   # First start the dev server for examples
 *   npx vite --config vite.config.js
 *
 *   # Then in another terminal, run this script
 *   npx tsx docs-system/scripts/capture-thumbnails.ts [--base-url http://localhost:5173]
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function main() {
  let puppeteer: typeof import('puppeteer');
  try {
    puppeteer = await import('puppeteer');
  } catch {
    console.error('Puppeteer is not installed. Run:');
    console.error('  cd docs-system && npm install -D puppeteer');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const baseUrlIdx = args.indexOf('--base-url');
  const baseUrl = baseUrlIdx !== -1 && args[baseUrlIdx + 1]
    ? args[baseUrlIdx + 1]
    : 'http://localhost:5173';

  const cwd = process.cwd();
  const rootDir = cwd.endsWith('docs-system') ? path.resolve(cwd, '..') : cwd;
  const examplesDir = path.join(rootDir, 'example');
  const outputDir = path.join(examplesDir, 'screenshots');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all example HTML files
  const pattern = path.join(examplesDir, '**/*.html').replace(/\\/g, '/');
  const htmlFiles = await glob(pattern, { nodir: true });

  // Filter to only top-level example HTML files (not in src/ or node_modules/)
  const examples = htmlFiles.filter(f => {
    const rel = path.relative(examplesDir, f).replace(/\\/g, '/');
    return !rel.includes('/src/') && !rel.includes('node_modules');
  });

  console.log(`Found ${examples.length} examples to capture\n`);

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 450 });

  let captured = 0;
  let skipped = 0;

  for (const htmlFile of examples) {
    const rel = path.relative(examplesDir, htmlFile).replace(/\\/g, '/');
    const baseName = path.basename(htmlFile, '.html');
    const outputPath = path.join(outputDir, `${baseName}.png`);

    // Skip if already captured (use --force to recapture)
    if (fs.existsSync(outputPath) && !args.includes('--force')) {
      skipped++;
      continue;
    }

    const url = `${baseUrl}/${rel}`;
    console.log(`Capturing: ${rel}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      // Wait for WebGL content to render
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: outputPath, type: 'png' });
      captured++;
      console.log(`  -> ${path.relative(rootDir, outputPath)}`);
    } catch (err) {
      console.warn(`  SKIP (error): ${(err as Error).message}`);
      skipped++;
    }
  }

  await browser.close();

  console.log(`\nDone: ${captured} captured, ${skipped} skipped`);
  console.log(`Screenshots saved to: ${path.relative(rootDir, outputDir)}/`);
  console.log('\nRun the docs build again to include thumbnails:');
  console.log('  npx tsx docs-system/scripts/build-docs.ts');
}

main();
