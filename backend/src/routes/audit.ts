import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/database';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get audit logs
router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50, action, resource_type, start_date, end_date } = req.query;
  const db = getDatabase();
  
  const offset = (Number(page) - 1) * Number(limit);
  
  let query = `
    SELECT 
      id,
      action,
      resource_type,
      resource_id,
      user_id,
      details,
      ip_address,
      user_agent,
      created_at
    FROM audit_logs
  `;
  
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }
  
  if (resource_type) {
    conditions.push('resource_type = ?');
    params.push(resource_type);
  }
  
  if (start_date) {
    conditions.push('created_at >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    conditions.push('created_at <= ?');
    params.push(end_date);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);
  
  const [logs, totalCount] = await Promise.all([
    db.all(query, params),
    db.get(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
    `, params.slice(0, -2)) // Remove limit and offset for count
  ]);

  const formattedLogs = logs.map((log: any) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null
  }));

  res.json({
    status: 'success',
    data: {
      logs: formattedLogs,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total_items: totalCount.count,
        total_pages: Math.ceil(totalCount.count / Number(limit))
      }
    }
  });
}));

// Get audit summary statistics
router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const { days = 30 } = req.query;
  const db = getDatabase();
  
  const [
    totalActions,
    actionsByType,
    activityTrend,
    topUsers,
    recentActivity
  ] = await Promise.all([
    // Total actions in period
    db.get(`
      SELECT COUNT(*) as total
      FROM audit_logs
      WHERE created_at > datetime('now', '-${days} days')
    `),
    
    // Actions by type
    db.all(`
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY action
      ORDER BY count DESC
    `),
    
    // Daily activity trend
    db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as activity_count
      FROM audit_logs
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `),
    
    // Top users by activity
    db.all(`
      SELECT 
        user_id,
        COUNT(*) as action_count
      FROM audit_logs
      WHERE created_at > datetime('now', '-${days} days')
        AND user_id IS NOT NULL
      GROUP BY user_id
      ORDER BY action_count DESC
      LIMIT 10
    `),
    
    // Recent activity
    db.all(`
      SELECT 
        action,
        resource_type,
        resource_id,
        user_id,
        created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 20
    `)
  ]);

  res.json({
    status: 'success',
    data: {
      summary: {
        total_actions: totalActions.total,
        period_days: Number(days)
      },
      actions_by_type: actionsByType,
      activity_trend: activityTrend,
      top_users: topUsers,
      recent_activity: recentActivity
    }
  });
}));

// Create audit log entry
router.post('/logs', asyncHandler(async (req: Request, res: Response) => {
  const {
    action,
    resource_type,
    resource_id,
    user_id,
    details,
    ip_address,
    user_agent
  } = req.body;
  
  if (!action || !resource_type) {
    res.status(400).json({
      status: 'fail',
      message: 'Action and resource_type are required'
    });
    return;
  }
  
  const db = getDatabase();
  
  const result = await db.run(`
    INSERT INTO audit_logs 
    (action, resource_type, resource_id, user_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    action,
    resource_type,
    resource_id || null,
    user_id || null,
    details ? JSON.stringify(details) : null,
    ip_address || req.ip,
    user_agent || req.get('User-Agent')
  ]);

  const newLog = await db.get(`
    SELECT 
      id,
      action,
      resource_type,
      resource_id,
      user_id,
      details,
      ip_address,
      user_agent,
      created_at
    FROM audit_logs
    WHERE id = ?
  `, [result.lastID]);

  res.status(201).json({
    status: 'success',
    data: {
      ...newLog,
      details: newLog.details ? JSON.parse(newLog.details) : null
    }
  });
}));

// Get audit log statistics for dashboard
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  
  const [
    todayStats,
    weekStats,
    monthStats,
    resourceTypeStats
  ] = await Promise.all([
    // Today's activity
    db.get(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE DATE(created_at) = DATE('now')
    `),
    
    // This week's activity
    db.get(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE created_at > datetime('now', '-7 days')
    `),
    
    // This month's activity
    db.get(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE created_at > datetime('now', '-30 days')
    `),
    
    // Activity by resource type
    db.all(`
      SELECT 
        resource_type,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY resource_type
      ORDER BY count DESC
    `)
  ]);

  res.json({
    status: 'success',
    data: {
      activity_stats: {
        today: todayStats.count,
        this_week: weekStats.count,
        this_month: monthStats.count
      },
      resource_type_breakdown: resourceTypeStats
    }
  });
}));

// Export audit logs (for compliance reporting)
router.get('/export', asyncHandler(async (req: Request, res: Response) => {
  const { format = 'json', start_date, end_date } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT 
      id,
      action,
      resource_type,
      resource_id,
      user_id,
      details,
      ip_address,
      user_agent,
      created_at
    FROM audit_logs
  `;
  
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (start_date) {
    conditions.push('created_at >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    conditions.push('created_at <= ?');
    params.push(end_date);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  const logs = await db.all(query, params);
  
  const formattedLogs = logs.map((log: any) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null
  }));

  if (format === 'csv') {
    // Convert to CSV format
    const csvHeaders = 'ID,Action,Resource Type,Resource ID,User ID,Created At,Details\n';
    const csvRows = formattedLogs.map((log: any) => 
      `${log.id},"${log.action}","${log.resource_type}","${log.resource_id || ''}","${log.user_id || ''}","${log.created_at}","${JSON.stringify(log.details || {})}"`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvHeaders + csvRows);
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
    res.json({
      export_date: new Date().toISOString(),
      period: {
        start: start_date || 'beginning',
        end: end_date || 'now'
      },
      total_records: logs.length,
      data: formattedLogs
    });
  }
}));

export default router;
