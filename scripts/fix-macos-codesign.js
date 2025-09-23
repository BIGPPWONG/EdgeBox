#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findAppBundles(dir) {
  const apps = [];
  if (!fs.existsSync(dir)) return apps;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      if (item.endsWith('.app')) {
        apps.push(itemPath);
      } else {
        apps.push(...findAppBundles(itemPath));
      }
    }
  }
  return apps;
}

function resignApps() {
  console.log('🔍 Finding .app bundles...');
  const apps = findAppBundles('out');

  if (apps.length === 0) {
    console.log('ℹ️ No .app bundles found');
    return;
  }

  console.log(`📝 Found ${apps.length} .app bundles to re-sign:`);
  apps.forEach(app => console.log(`  - ${app}`));

  for (const app of apps) {
    try {
      console.log(`✍️ Re-signing: ${app}`);
      execSync(`codesign --force --deep --sign "-" "${app}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Failed to sign ${app}:`, error.message);
    }
  }
}

function recreateZips() {
  console.log('🔍 Looking for zip distributions...');
  const makeDir = path.join('out', 'make');

  if (!fs.existsSync(makeDir)) {
    console.log('ℹ️ No make directory found');
    return;
  }

  // 递归查找所有 .zip 文件
  function findZipFiles(dir) {
    const zipFiles = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        zipFiles.push(...findZipFiles(itemPath));
      } else if (item.endsWith('.zip')) {
        zipFiles.push(itemPath);
      }
    }
    return zipFiles;
  }

  const zipFiles = findZipFiles(makeDir);

  if (zipFiles.length === 0) {
    console.log('ℹ️ No zip files found');
    return;
  }

  for (const zipPath of zipFiles) {
    const zipName = path.basename(zipPath);
    const zipDir = path.dirname(zipPath);
    const tempDir = path.join(zipDir, 'temp_' + Date.now());

    try {
      console.log(`🗜️ Processing zip: ${zipName}`);

      // 创建临时目录并解压
      fs.mkdirSync(tempDir);
      execSync(`cd "${tempDir}" && unzip -q "../${zipName}"`, { stdio: 'pipe' });

      // 查找并重新签名 .app 文件
      const apps = findAppBundles(tempDir);
      if (apps.length > 0) {
        console.log(`📝 Found ${apps.length} .app bundles in zip to re-sign`);
        for (const app of apps) {
          console.log(`✍️ Re-signing in zip: ${path.relative(tempDir, app)}`);
          execSync(`codesign --force --deep --sign "-" "${app}"`, { stdio: 'pipe' });
        }

        // 删除旧的zip文件并创建新的
        fs.unlinkSync(zipPath);
        console.log(`📦 Recreating zip: ${zipName}`);
        execSync(`cd "${tempDir}" && zip -r "../${zipName}" .`, { stdio: 'pipe' });
        console.log(`✅ Successfully updated: ${zipPath}`);
      } else {
        console.log(`ℹ️ No .app bundles found in ${zipName}`);
      }

      // 清理临时目录
      execSync(`rm -rf "${tempDir}"`);

    } catch (error) {
      console.error(`❌ Failed to process zip ${zipName}:`, error.message);
      // 清理临时目录
      if (fs.existsSync(tempDir)) {
        execSync(`rm -rf "${tempDir}"`);
      }
    }
  }
}

if (process.platform === 'darwin') {
  console.log('🍎 Running macOS codesign fix...');
  resignApps();
  recreateZips();
  console.log('✅ macOS codesign fix completed!');
} else {
  console.log('ℹ️ Skipping codesign fix (not macOS)');
}