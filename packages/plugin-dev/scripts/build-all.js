#!/usr/bin/env node

// Builds every bundled plugin into src/assets/bundled-plugins (`plugins:build`,
// used by the E2E/CI frontend build). The plugin list is derived from the
// plugin-dev directories the same way packages/build-packages.js derives it for
// production builds, so both ship the same plugins. A hand-kept list drifted:
// it missed seven plugins that production builds include.

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { ensurePluginDeps } = require('./install-deps');

const execAsync = promisify(exec);

const PLUGIN_DEV_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(__dirname, '../../../src/assets/bundled-plugins');
// Same exclusions as packages/build-packages.js: the boilerplate is a template
// and the issue-provider kit is bundled into the issue-provider plugins.
const NOT_BUNDLED = new Set(['boilerplate-solid-js', 'issue-provider-kit']);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  if (process.argv.includes('--silent')) return;
  console.log(`${color}${message}${colors.reset}`);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readManifest(pluginPath) {
  // manifest.json may live at the root or inside src/
  for (const manifestPath of [
    path.join(pluginPath, 'manifest.json'),
    path.join(pluginPath, 'src', 'manifest.json'),
  ]) {
    try {
      return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    } catch {
      // Try next candidate
    }
  }
  return null;
}

async function getPlugins() {
  const entries = await fs.readdir(PLUGIN_DEV_DIR, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || NOT_BUNDLED.has(entry.name)) {
      continue;
    }
    const pluginPath = path.join(PLUGIN_DEV_DIR, entry.name);
    let packageJson;
    try {
      packageJson = JSON.parse(
        await fs.readFile(path.join(pluginPath, 'package.json'), 'utf8'),
      );
    } catch {
      // Not a package (node_modules, scripts)
      continue;
    }

    const buildScript = packageJson.scripts && packageJson.scripts.build;
    // A placeholder build script means a simple plugin copied as-is
    const hasRealBuildScript =
      !!buildScript && !buildScript.includes("echo 'No build needed");

    const files = ['manifest.json', 'plugin.js', 'icon.svg'];
    const requiredFiles = [...files];
    const manifest = await readManifest(pluginPath);
    if (!manifest || manifest.iFrame !== false) {
      // No manifest.json found — assume index.html is needed
      files.push('index.html');
      requiredFiles.push('index.html');
    }
    if (manifest && manifest.jsonSchemaCfg) {
      files.push(manifest.jsonSchemaCfg);
      requiredFiles.push(manifest.jsonSchemaCfg);
    }
    if (manifest && manifest.i18n && manifest.i18n.languages) {
      for (const lang of manifest.i18n.languages) {
        requiredFiles.push(`i18n/${lang}.json`);
      }
    }

    plugins.push({
      name: entry.name,
      path: pluginPath,
      isBuilt: hasRealBuildScript,
      files,
      requiredFiles,
    });
  }

  return plugins.sort((a, b) => a.name.localeCompare(b.name));
}

async function copyToAssets(plugin) {
  const targetDir = path.join(ASSETS_DIR, plugin.name);
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  // Prefer dist if it exists, otherwise fall back to the plugin root (simple plugins)
  const distPath = path.join(plugin.path, 'dist');
  if (await pathExists(distPath)) {
    // Copy the full dist to preserve all chunks/assets
    await fs.cp(distPath, targetDir, { recursive: true });
  } else {
    for (const file of plugin.files) {
      const src = path.join(plugin.path, file);
      if (!(await pathExists(src))) {
        throw new Error(`Missing expected file: ${file}`);
      }
      await fs.copyFile(src, path.join(targetDir, file));
    }
    const i18nSrc = path.join(plugin.path, 'i18n');
    if (await pathExists(i18nSrc)) {
      await fs.cp(i18nSrc, path.join(targetDir, 'i18n'), { recursive: true });
    }
  }

  const missing = [];
  for (const file of plugin.requiredFiles) {
    if (!(await pathExists(path.join(targetDir, file)))) {
      missing.push(file);
    }
  }
  if (missing.length) {
    throw new Error(`Missing required asset(s): ${missing.join(', ')}`);
  }
}

async function buildPlugin(plugin) {
  const startTime = Date.now();
  log(`\n📦 Building ${plugin.name}...`, colors.cyan);

  try {
    if (plugin.isBuilt) {
      log(`  Building...`, colors.yellow);
      await execAsync('npm run build', { cwd: plugin.path });
    }
    await copyToAssets(plugin);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = plugin.isBuilt ? 'Built and copied to assets' : 'Copied to assets';
    log(`✅ ${plugin.name} - ${result} (${duration}s)`, colors.green);

    return { plugin: plugin.name, success: true, duration };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`❌ ${plugin.name} - Build failed (${duration}s): ${error.message}`, colors.red);
    if (error.stdout) {
      log(`  stdout: ${error.stdout}`, colors.red);
    }
    if (error.stderr) {
      log(`  stderr: ${error.stderr}`, colors.red);
    }

    return { plugin: plugin.name, success: false, error: error.message, duration };
  }
}

async function buildAll() {
  log('\n🚀 Building all plugins...', colors.bright);
  const startTime = Date.now();

  // One install for the whole plugin-dev workspace; plugins build in parallel.
  ensurePluginDeps({ log, silent: process.argv.includes('--silent') });

  const plugins = await getPlugins();
  const results = await Promise.all(plugins.map(buildPlugin));

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  log('\n📊 Build Summary:', colors.bright);
  log(`  Total plugins: ${plugins.length}`);
  log(`  Successful: ${successful}`, colors.green);
  if (failed.length > 0) {
    // console.error, not log(): a failure must show even with --silent
    console.error(
      `${colors.red}  Failed: ${failed.length}\n${failed
        .map((r) => `    - ${r.plugin}: ${r.error}`)
        .join('\n')}${colors.reset}`,
    );
  }
  log(`  Total time: ${totalDuration}s`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildAll().catch((error) => {
    // console.error, not log(): a failure must show even with --silent
    console.error(`${colors.red}\n❌ Build failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { buildAll, getPlugins };
