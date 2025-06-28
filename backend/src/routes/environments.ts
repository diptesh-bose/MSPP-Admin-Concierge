import { Router } from 'express';
import { getDatabase } from '../database/database';
import { logger } from '../utils/logger';

const router = Router();

// Get all environments
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const environments = await db.all(`
      SELECT 
        id,
        name,
        display_name,
        type,
        region,
        created_by,
        created_at,
        updated_at
      FROM environments 
      ORDER BY 
        CASE type 
          WHEN 'Production' THEN 1 
          WHEN 'Default' THEN 2 
          WHEN 'Sandbox' THEN 3 
          WHEN 'Trial' THEN 4 
          WHEN 'PoC' THEN 5 
          WHEN 'Developer' THEN 6 
          ELSE 7 
        END,
        name
    `);

    res.json({
      status: 'success',
      data: environments
    });
  } catch (error) {
    logger.error('Failed to fetch environments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch environments'
    });
  }
});

// Get environment by ID
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const db = await getDatabase();
    const environment = await db.get(
      'SELECT * FROM environments WHERE id = ?',
      [req.params.id]
    );

    if (!environment) {
      res.status(404).json({
        status: 'error',
        message: 'Environment not found'
      });
      return;
    }

    res.json({
      status: 'success',
      data: environment
    });
  } catch (error) {
    logger.error('Failed to fetch environment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch environment'
    });
  }
});

// Create new environment
router.post('/', async (req, res): Promise<void> => {
  try {
    const { id, name, display_name, type, region, created_by } = req.body;

    if (!id || !name) {
      res.status(400).json({
        status: 'error',
        message: 'Environment ID and name are required'
      });
      return;
    }

    const db = await getDatabase();
    
    // Check if environment already exists
    const existing = await db.get('SELECT id FROM environments WHERE id = ?', [id]);
    if (existing) {
      res.status(409).json({
        status: 'error',
        message: 'Environment already exists'
      });
      return;
    }

    await db.run(
      `INSERT INTO environments (id, name, display_name, type, region, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, display_name, type || 'Sandbox', region, created_by]
    );

    // Log the action
    await db.run(
      `INSERT INTO audit_logs (action, resource_type, resource_id, environment_id, details) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'CREATE',
        'environment',
        id,
        id,
        JSON.stringify({ name, display_name, type, region })
      ]
    );

    const newEnvironment = await db.get('SELECT * FROM environments WHERE id = ?', [id]);

    res.status(201).json({
      status: 'success',
      data: newEnvironment
    });
  } catch (error) {
    logger.error('Failed to create environment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create environment'
    });
  }
});

// Update environment
router.put('/:id', async (req, res): Promise<void> => {
  try {
    const { name, display_name, type, region } = req.body;
    const environmentId = req.params.id;

    const db = await getDatabase();
    
    // Check if environment exists
    const existing = await db.get('SELECT * FROM environments WHERE id = ?', [environmentId]);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Environment not found'
      });
      return;
    }

    await db.run(
      `UPDATE environments 
       SET name = ?, display_name = ?, type = ?, region = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || existing.name, display_name || existing.display_name, 
       type || existing.type, region || existing.region, environmentId]
    );

    // Log the action
    await db.run(
      `INSERT INTO audit_logs (action, resource_type, resource_id, environment_id, details) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'UPDATE',
        'environment',
        environmentId,
        environmentId,
        JSON.stringify({ name, display_name, type, region })
      ]
    );

    const updatedEnvironment = await db.get('SELECT * FROM environments WHERE id = ?', [environmentId]);

    res.json({
      status: 'success',
      data: updatedEnvironment
    });
  } catch (error) {
    logger.error('Failed to update environment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update environment'
    });
  }
});

// Delete environment
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const environmentId = req.params.id;
    const db = await getDatabase();
    
    // Check if environment exists
    const existing = await db.get('SELECT * FROM environments WHERE id = ?', [environmentId]);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Environment not found'
      });
      return;
    }

    // Check if there are compliance items associated with this environment
    const complianceItems = await db.get(
      'SELECT COUNT(*) as count FROM compliance_items WHERE environment_id = ?',
      [environmentId]
    );

    if (complianceItems.count > 0) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot delete environment with associated compliance items'
      });
      return;
    }

    await db.run('DELETE FROM environments WHERE id = ?', [environmentId]);

    // Log the action
    await db.run(
      `INSERT INTO audit_logs (action, resource_type, resource_id, environment_id, details) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        'DELETE',
        'environment',
        environmentId,
        environmentId,
        JSON.stringify({ name: existing.name })
      ]
    );

    res.json({
      status: 'success',
      message: 'Environment deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete environment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete environment'
    });
  }
});

export default router;
