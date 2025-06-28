import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function cleanupDlpCommand() {
  // Connect to the database
  const dbPath = process.env.DATABASE_URL || './data/compliance.db';
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    // Remove the invalid CLI command
    const deleteCliCmd = await db.run('DELETE FROM cli_commands WHERE command = ?', 'pac dlp list');
    console.log(`Deleted ${deleteCliCmd.changes} CLI command entries for 'pac dlp list'`);

    // Update the compliance item to remove the invalid command from cli_commands array
    const item = await db.get('SELECT * FROM compliance_items WHERE title = ?', 'Create and Review DLP Policies');

    if (item) {
      const commands = JSON.parse(item.cli_commands || '[]');
      const updatedCommands = commands.filter((cmd: string) => cmd !== 'pac dlp list');
      
      const updated = await db.run('UPDATE compliance_items SET cli_commands = ? WHERE id = ?', 
        JSON.stringify(updatedCommands), item.id);
      
      console.log(`Updated compliance item (${updated.changes} rows affected)`);
      console.log(`New CLI commands: ${JSON.stringify(updatedCommands)}`);
    } else {
      console.log('Compliance item not found');
    }

    console.log('Successfully removed invalid pac dlp list command from database');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}

cleanupDlpCommand();
