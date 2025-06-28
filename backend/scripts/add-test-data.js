const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'compliance.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding test compliance items for different environments...');

db.serialize(() => {
  // Add some compliance items specifically for the dev environment
  db.run(`
    INSERT INTO compliance_items (
      title, description, category_id, importance, environment_id, is_completed, created_at
    ) VALUES 
      ('Dev Environment SSL Configuration', 'Configure SSL certificates for development environment', 1, 'high', 'dev', 0, CURRENT_TIMESTAMP),
      ('Dev Environment User Access Review', 'Review user access permissions in development environment', 2, 'medium', 'dev', 0, CURRENT_TIMESTAMP),
      ('Dev Environment Backup Setup', 'Configure automated backups for development environment', 3, 'medium', 'dev', 1, CURRENT_TIMESTAMP)
  `, (err) => {
    if (err) {
      console.error('Error adding dev environment items:', err);
    } else {
      console.log('✓ Added dev environment compliance items');
    }
  });

  // Add some compliance items specifically for the staging environment
  db.run(`
    INSERT INTO compliance_items (
      title, description, category_id, importance, environment_id, is_completed, created_at
    ) VALUES 
      ('Staging Environment Performance Testing', 'Conduct performance testing on staging environment', 3, 'high', 'staging', 0, CURRENT_TIMESTAMP),
      ('Staging Environment Security Scan', 'Run security vulnerability scan on staging environment', 1, 'critical', 'staging', 0, CURRENT_TIMESTAMP),
      ('Staging Environment Monitoring Setup', 'Configure monitoring and alerting for staging environment', 5, 'high', 'staging', 1, CURRENT_TIMESTAMP)
  `, (err) => {
    if (err) {
      console.error('Error adding staging environment items:', err);
    } else {
      console.log('✓ Added staging environment compliance items');
    }
  });

  // Update some existing default environment items
  db.run(`
    UPDATE compliance_items 
    SET title = 'Production Environment ' || title 
    WHERE environment_id = 'default' AND title NOT LIKE 'Production Environment%'
  `, (err) => {
    if (err) {
      console.error('Error updating default environment items:', err);
    } else {
      console.log('✓ Updated default environment compliance items');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('✓ Test data setup completed successfully');
  }
});
