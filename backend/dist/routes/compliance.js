"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database/database");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.get('/categories', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDatabase)();
    const environmentId = req.query.environment_id;
    let environmentFilter = '';
    let environmentJoin = '';
    let params = [];
    if (environmentId) {
        environmentFilter = 'WHERE (i.environment_id = ? OR i.environment_id IS NULL)';
        environmentJoin = '';
        params = [environmentId];
    }
    const categories = await db.all(`
    SELECT 
      c.id,
      c.name,
      c.description,
      c.icon,
      c.order_index,
      COUNT(i.id) as total_items,
      COUNT(CASE WHEN i.is_completed = 1 THEN 1 END) as completed_items
    FROM compliance_categories c
    LEFT JOIN compliance_items i ON c.id = i.category_id ${environmentFilter}
    GROUP BY c.id
    ORDER BY c.order_index
  `, params);
    const categoriesWithItems = await Promise.all(categories.map(async (category) => {
        let itemParams = [category.id];
        let itemFilter = 'WHERE category_id = ?';
        if (environmentId) {
            itemFilter += ' AND (environment_id = ? OR environment_id IS NULL)';
            itemParams.push(environmentId);
        }
        const items = await db.all(`
        SELECT 
          id,
          title,
          description,
          importance,
          documentation_link,
          cli_commands,
          is_completed,
          completed_at,
          completed_by,
          notes,
          completion_details,
          environment_id,
          order_index
        FROM compliance_items 
        ${itemFilter}
        ORDER BY order_index, id
      `, itemParams);
        return {
            ...category,
            items: items.map(item => ({
                ...item,
                cli_commands: item.cli_commands ? JSON.parse(item.cli_commands) : [],
                is_completed: Boolean(item.is_completed)
            }))
        };
    }));
    res.json({
        status: 'success',
        data: categoriesWithItems
    });
}));
router.get('/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDatabase)();
    const environmentId = req.query.environment_id;
    let environmentFilter = '';
    let params = [];
    if (environmentId) {
        environmentFilter = 'WHERE (environment_id = ? OR environment_id IS NULL)';
        params = [environmentId];
    }
    const [totalStats, criticalStats, recentActivity] = await Promise.all([
        db.get(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_items,
        ROUND(
          (COUNT(CASE WHEN is_completed = 1 THEN 1 END) * 100.0 / COUNT(*)), 
          1
        ) as completion_percentage
      FROM compliance_items
      ${environmentFilter}
    `, params),
        db.get(`
      SELECT 
        COUNT(*) as total_critical,
        COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_critical,
        ROUND(
          (COUNT(CASE WHEN is_completed = 1 THEN 1 END) * 100.0 / COUNT(*)), 
          1
        ) as critical_completion_percentage
      FROM compliance_items
      WHERE importance = 'critical' ${environmentId ? 'AND (environment_id = ? OR environment_id IS NULL)' : ''}
    `, environmentId ? [environmentId] : []),
        db.all(`
      SELECT 
        category_id,
        COUNT(*) as completed_count
      FROM compliance_items
      WHERE is_completed = 1 
        AND completed_at > datetime('now', '-30 days')
        ${environmentId ? 'AND (environment_id = ? OR environment_id IS NULL)' : ''}
      GROUP BY category_id
    `, environmentId ? [environmentId] : [])
    ]);
    const categoryBreakdown = await db.all(`
    SELECT 
      c.name as category_name,
      c.icon,
      COUNT(i.id) as total_items,
      COUNT(CASE WHEN i.is_completed = 1 THEN 1 END) as completed_items,
      ROUND(
        (COUNT(CASE WHEN i.is_completed = 1 THEN 1 END) * 100.0 / COUNT(i.id)), 
        1
      ) as completion_percentage
    FROM compliance_categories c
    LEFT JOIN compliance_items i ON c.id = i.category_id ${environmentId ? 'AND (i.environment_id = ? OR i.environment_id IS NULL)' : ''}
    GROUP BY c.id, c.name, c.icon
    ORDER BY c.order_index
  `, environmentId ? [environmentId] : []);
    res.json({
        status: 'success',
        data: {
            overall: totalStats,
            critical: criticalStats,
            recent_activity: recentActivity,
            category_breakdown: categoryBreakdown
        }
    });
}));
router.patch('/items/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { is_completed, notes, completed_by, completion_details } = req.body;
    const db = (0, database_1.getDatabase)();
    const item = await db.get('SELECT id, environment_id FROM compliance_items WHERE id = ?', [id]);
    if (!item) {
        res.status(404).json({
            status: 'fail',
            message: 'Compliance item not found'
        });
        return;
    }
    const updateData = {};
    const params = [];
    const setParts = [];
    if (typeof is_completed === 'boolean') {
        updateData.is_completed = is_completed;
        updateData.completed_at = is_completed ? new Date().toISOString() : null;
        updateData.completed_by = is_completed ? (completed_by || 'Admin') : null;
        setParts.push('is_completed = ?', 'completed_at = ?', 'completed_by = ?');
        params.push(is_completed ? 1 : 0, updateData.completed_at, updateData.completed_by);
    }
    if (notes !== undefined) {
        updateData.notes = notes;
        setParts.push('notes = ?');
        params.push(notes);
    }
    if (completion_details) {
        updateData.completion_details = JSON.stringify(completion_details);
        setParts.push('completion_details = ?');
        params.push(updateData.completion_details);
    }
    if (setParts.length === 0) {
        res.status(400).json({
            status: 'fail',
            message: 'No valid fields to update'
        });
        return;
    }
    setParts.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await db.run(`UPDATE compliance_items SET ${setParts.join(', ')} WHERE id = ?`, params);
    await db.run(`
    INSERT INTO audit_logs (action, resource_type, resource_id, environment_id, user_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
        is_completed ? 'completed' : 'updated',
        'compliance_item',
        id,
        item.environment_id,
        completed_by || 'Admin',
        JSON.stringify({
            previous_status: !is_completed,
            new_status: is_completed,
            notes: notes || null,
            completion_details: completion_details || null,
            timestamp: new Date().toISOString()
        })
    ]);
    const updatedItem = await db.get(`
    SELECT 
      id,
      title,
      description,
      importance,
      documentation_link,
      cli_commands,
      is_completed,
      completed_at,
      completed_by,
      notes,
      completion_details,
      order_index
    FROM compliance_items 
    WHERE id = ?
  `, [id]);
    res.json({
        status: 'success',
        data: {
            ...updatedItem,
            cli_commands: updatedItem.cli_commands ? JSON.parse(updatedItem.cli_commands) : [],
            completion_details: updatedItem.completion_details ? JSON.parse(updatedItem.completion_details) : null,
            is_completed: Boolean(updatedItem.is_completed)
        }
    });
}));
router.get('/trends', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDatabase)();
    const trends = await db.all(`
    SELECT 
      DATE(completed_at) as date,
      COUNT(*) as completed_items
    FROM compliance_items
    WHERE is_completed = 1 
      AND completed_at > datetime('now', '-30 days')
    GROUP BY DATE(completed_at)
    ORDER BY date
  `);
    const importanceStats = await db.all(`
    SELECT 
      importance,
      COUNT(*) as total,
      COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed,
      ROUND(
        (COUNT(CASE WHEN is_completed = 1 THEN 1 END) * 100.0 / COUNT(*)), 
        1
      ) as percentage
    FROM compliance_items
    GROUP BY importance
    ORDER BY 
      CASE importance
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2  
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END
  `);
    res.json({
        status: 'success',
        data: {
            completion_trends: trends,
            importance_breakdown: importanceStats
        }
    });
}));
exports.default = router;
//# sourceMappingURL=compliance.js.map