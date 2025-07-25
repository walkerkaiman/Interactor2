#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Syncs module manifests between backend modules and shared manifests
 * This ensures the frontend always has access to the latest module definitions
 */

const BACKEND_MODULES_DIR = path.join(__dirname, '../backend/src/modules');
const SHARED_MANIFESTS_DIR = path.join(__dirname, '../shared/manifests');

function syncManifests() {
  console.log('🔄 Syncing module manifests...');

  // Ensure shared manifests directory exists
  if (!fs.existsSync(SHARED_MANIFESTS_DIR)) {
    fs.mkdirSync(SHARED_MANIFESTS_DIR, { recursive: true });
  }

  // Scan backend modules directory
  if (!fs.existsSync(BACKEND_MODULES_DIR)) {
    console.log('⚠️  Backend modules directory not found, skipping sync');
    return;
  }

  const moduleDirs = fs.readdirSync(BACKEND_MODULES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let syncedCount = 0;
  let errorCount = 0;

  for (const moduleDir of moduleDirs) {
    const manifestPath = path.join(BACKEND_MODULES_DIR, moduleDir, 'manifest.json');
    const sharedManifestPath = path.join(SHARED_MANIFESTS_DIR, `${moduleDir}.json`);

    try {
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Validate manifest structure
        if (!manifest.name || !manifest.type || !manifest.category) {
          console.warn(`⚠️  Invalid manifest for ${moduleDir}: missing required fields`);
          continue;
        }

        // Copy to shared directory
        fs.writeFileSync(sharedManifestPath, JSON.stringify(manifest, null, 2));
        console.log(`✅ Synced ${moduleDir}`);
        syncedCount++;
      } else {
        console.warn(`⚠️  No manifest found for ${moduleDir}`);
      }
    } catch (error) {
      console.error(`❌ Error syncing ${moduleDir}:`, error.message);
      errorCount++;
    }
  }

  // Clean up orphaned manifests
  const sharedManifests = fs.readdirSync(SHARED_MANIFESTS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

  for (const manifestName of sharedManifests) {
    const moduleDir = path.join(BACKEND_MODULES_DIR, manifestName);
    if (!fs.existsSync(moduleDir)) {
      const orphanedManifest = path.join(SHARED_MANIFESTS_DIR, `${manifestName}.json`);
      fs.unlinkSync(orphanedManifest);
      console.log(`🗑️  Removed orphaned manifest: ${manifestName}`);
    }
  }

  console.log(`\n📊 Sync complete:`);
  console.log(`   ✅ Synced: ${syncedCount} manifests`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total manifests: ${fs.readdirSync(SHARED_MANIFESTS_DIR).length}`);
}

// Run sync if called directly
if (require.main === module) {
  syncManifests();
}

module.exports = { syncManifests }; 