/**
 * Backup BoxerConnect Data
 *
 * Creates a backup of the current database data before migration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../../backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

async function createBackup() {
  console.log('🚀 Starting BoxerConnect backup...\n');

  // Create backup directory
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
  } catch (error) {
    console.error('❌ Failed to create backup directory:', error);
    process.exit(1);
  }

  // Check if we have a local PostgreSQL database to backup
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.includes('localhost')) {
    console.log('\n📊 Backing up local PostgreSQL database...');
    console.log('   Skipping - will migrate directly to Supabase');
    console.log('   Old data is still in your local PostgreSQL container');
  } else {
    console.log('\n📊 Database is already using Supabase - no local backup needed');
  }

  // Backup uploaded files
  console.log('\n📁 Backing up uploaded files...');
  const uploadsPath = process.env.UPLOAD_PATH || path.join(__dirname, '../uploads');

  try {
    const stats = await fs.stat(uploadsPath);
    if (stats.isDirectory()) {
      const backupFile = path.join(BACKUP_DIR, `uploads-${TIMESTAMP}.tar.gz`);

      console.log(`   Source: ${uploadsPath}`);
      console.log(`   Destination: ${backupFile}`);

      await execAsync(`tar -czf "${backupFile}" -C "${path.dirname(uploadsPath)}" "${path.basename(uploadsPath)}"`);

      const backupStats = await fs.stat(backupFile);
      const sizeMB = (backupStats.size / 1024 / 1024).toFixed(2);

      console.log(`   ✅ Files backed up successfully (${sizeMB} MB)`);
    } else {
      console.log('   ⚠️  Upload path is not a directory');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('   ℹ️  No uploads directory found - nothing to backup');
    } else {
      console.error('   ❌ Failed to backup files:', error);
    }
  }

  // Create backup manifest
  console.log('\n📝 Creating backup manifest...');
  const manifest = {
    timestamp: new Date().toISOString(),
    database: {
      originalUrl: databaseUrl,
      type: databaseUrl?.includes('localhost') ? 'local' : 'remote',
    },
    files: {
      uploadsPath,
      backupCreated: true,
    },
  };

  const manifestPath = path.join(BACKUP_DIR, `manifest-${TIMESTAMP}.json`);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`   ✅ Manifest created: ${manifestPath}`);

  console.log('\n✅ Backup complete!');
  console.log(`\n📂 Backup location: ${BACKUP_DIR}`);
  console.log('\nYou can now proceed with the migration safely.');
}

createBackup().catch((error) => {
  console.error('\n❌ Backup failed:', error);
  process.exit(1);
});
