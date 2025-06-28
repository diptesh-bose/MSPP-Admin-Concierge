const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'compliance.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting database migration...');

async function runQuery(query) {
  return new Promise((resolve, reject) => {
    db.run(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function getTableInfo(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrate() {
  try {
    // Create environments table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT,
        type TEXT DEFAULT 'Sandbox',
        region TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Environments table created/verified');

    // Check and add environment_id to compliance_items
    const complianceColumns = await getTableInfo('compliance_items');
    const hasComplianceEnvironmentId = complianceColumns.some(col => col.name === 'environment_id');
    
    if (!hasComplianceEnvironmentId) {
      console.log('Adding environment_id column to compliance_items...');
      await runQuery('ALTER TABLE compliance_items ADD COLUMN environment_id TEXT');
      console.log('✓ Added environment_id column to compliance_items');
    } else {
      console.log('✓ compliance_items already has environment_id column');
    }

    // Check and add environment_id to audit_logs
    const auditColumns = await getTableInfo('audit_logs');
    const hasAuditEnvironmentId = auditColumns.some(col => col.name === 'environment_id');
    
    if (!hasAuditEnvironmentId) {
      console.log('Adding environment_id column to audit_logs...');
      await runQuery('ALTER TABLE audit_logs ADD COLUMN environment_id TEXT');
      console.log('✓ Added environment_id column to audit_logs');
    } else {
      console.log('✓ audit_logs already has environment_id column');
    }

    // Insert default environments
    await runQuery(`
      INSERT OR IGNORE INTO environments (id, name, display_name, type, region) 
      VALUES 
        ('default', 'Default Environment', 'Default Environment', 'Production', 'US'),
        ('dev', 'Development Environment', 'Development', 'Sandbox', 'US'),
        ('staging', 'Staging Environment', 'Staging', 'Staging', 'US')
    `);
    console.log('✓ Default environments inserted');

    // Update existing compliance items to use default environment
    await runQuery(`
      UPDATE compliance_items 
      SET environment_id = 'default' 
      WHERE environment_id IS NULL
    `);
    console.log('✓ Updated existing compliance items with default environment');

    // Update existing audit logs to use default environment
    await runQuery(`
      UPDATE audit_logs 
      SET environment_id = 'default' 
      WHERE environment_id IS NULL
    `);
    console.log('✓ Updated existing audit logs with default environment');

    console.log('✓ Database migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    db.close();
  }
}

migrate();
