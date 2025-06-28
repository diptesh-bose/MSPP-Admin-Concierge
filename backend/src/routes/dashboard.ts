import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/database';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get dashboard overview metrics
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  const { environment_id } = req.query;
  
  // Build WHERE clause for environment filtering
  const whereClause = environment_id ? 'WHERE environment_id = ?' : '';
  const whereParams = environment_id ? [environment_id] : [];
  
  const [
    complianceStats,
    recentActivity,
    criticalItems,
    environmentCount,
    activeUsers
  ] = await Promise.all([
    // Overall compliance statistics
    db.get(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_items,
        ROUND(
          (COUNT(CASE WHEN is_completed = 1 THEN 1 END) * 100.0 / COUNT(*)), 
          1
        ) as completion_percentage,
        COUNT(CASE WHEN importance = 'critical' AND is_completed = 0 THEN 1 END) as pending_critical
      FROM compliance_items
      ${whereClause}
    `, whereParams),
    
    // Recent activity (last 7 days)
    db.all(`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as completed_count
      FROM compliance_items
      WHERE is_completed = 1 
        AND completed_at > datetime('now', '-7 days')
        ${environment_id ? 'AND environment_id = ?' : ''}
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
      LIMIT 7
    `, environment_id ? [environment_id] : []),
    
    // Outstanding critical items
    db.all(`
      SELECT 
        c.name as category,
        i.title,
        i.importance,
        i.description
      FROM compliance_items i
      JOIN compliance_categories c ON i.category_id = c.id
      WHERE i.importance = 'critical' AND i.is_completed = 0
        ${environment_id ? 'AND i.environment_id = ?' : ''}
      ORDER BY i.created_at
      LIMIT 5
    `, environment_id ? [environment_id] : []),
    
    // Simulated environment count (would come from real API in production)
    Promise.resolve({ count: 12 }),
    
    // Simulated active users (would come from real API in production)
    Promise.resolve({ count: 156 })
  ]);

  // Calculate health score based on critical items completion
  const criticalItemsTotal = await db.get(`
    SELECT COUNT(*) as total FROM compliance_items 
    WHERE importance = 'critical' ${environment_id ? 'AND environment_id = ?' : ''}
  `, environment_id ? [environment_id] : []);
  
  const criticalCompleted = await db.get(`
    SELECT COUNT(*) as completed FROM compliance_items 
    WHERE importance = 'critical' AND is_completed = 1 
      ${environment_id ? 'AND environment_id = ?' : ''}
  `, environment_id ? [environment_id] : []);

  const healthScore = criticalItemsTotal.total > 0 
    ? Math.round((criticalCompleted.completed / criticalItemsTotal.total) * 100)
    : 100;

  // Get compliance trend (last 30 days)
  const trend = await db.all(`
    SELECT 
      DATE(completed_at) as date,
      COUNT(*) as items_completed
    FROM compliance_items
    WHERE completed_at > datetime('now', '-30 days')
      ${environment_id ? 'AND environment_id = ?' : ''}
    GROUP BY DATE(completed_at)
    ORDER BY date
  `, environment_id ? [environment_id] : []);

  res.json({
    status: 'success',
    data: {
      compliance_overview: {
        total_items: complianceStats.total_items,
        completed_items: complianceStats.completed_items,
        completion_percentage: complianceStats.completion_percentage,
        pending_critical: complianceStats.pending_critical,
        health_score: healthScore
      },
      recent_activity: recentActivity,
      critical_items: criticalItems,
      environment_metrics: {
        total_environments: environmentCount.count,
        active_users: activeUsers.count
      },
      compliance_trend: trend
    }
  });
}));

// Get alerts and notifications
router.get('/alerts', asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  
  // Get overdue critical items
  const overdueItems = await db.all(`
    SELECT 
      c.name as category,
      c.icon,
      i.title,
      i.importance,
      i.created_at
    FROM compliance_items i
    JOIN compliance_categories c ON i.category_id = c.id
    WHERE i.importance = 'critical' 
      AND i.is_completed = 0
      AND i.created_at < datetime('now', '-7 days')
    ORDER BY i.created_at
  `);

  // Get recent completions to celebrate
  const recentCompletions = await db.all(`
    SELECT 
      c.name as category,
      i.title,
      i.completed_at,
      i.completed_by
    FROM compliance_items i
    JOIN compliance_categories c ON i.category_id = c.id
    WHERE i.is_completed = 1 
      AND i.completed_at > datetime('now', '-24 hours')
    ORDER BY i.completed_at DESC
    LIMIT 5
  `);

  // Simulated system alerts (would come from real monitoring in production)
  const systemAlerts = [
    {
      id: 1,
      type: 'info',
      title: 'Environment Health Check',
      message: 'All environments are operating normally',
      timestamp: new Date().toISOString(),
      category: 'system'
    },
    {
      id: 2,
      type: 'warning',
      title: 'DLP Policy Review Due',
      message: 'DLP policies should be reviewed monthly. Last review was 25 days ago.',
      timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'governance'
    }
  ];

  res.json({
    status: 'success',
    data: {
      overdue_critical: overdueItems,
      recent_completions: recentCompletions,
      system_alerts: systemAlerts
    }
  });
}));

// Get analytics for charts and graphs
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  
  const [
    categoryBreakdown,
    importanceDistribution,
    completionTrend,
    monthlyProgress
  ] = await Promise.all([
    // Completion by category
    db.all(`
      SELECT 
        c.name,
        c.icon,
        COUNT(i.id) as total,
        COUNT(CASE WHEN i.is_completed = 1 THEN 1 END) as completed,
        ROUND((COUNT(CASE WHEN i.is_completed = 1 THEN 1 END) * 100.0 / COUNT(i.id)), 1) as percentage
      FROM compliance_categories c
      LEFT JOIN compliance_items i ON c.id = i.category_id
      GROUP BY c.id, c.name, c.icon
      ORDER BY c.order_index
    `),
    
    // Distribution by importance level
    db.all(`
      SELECT 
        importance,
        COUNT(*) as total,
        COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed
      FROM compliance_items
      GROUP BY importance
    `),
    
    // Daily completion trend (last 30 days)
    db.all(`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as completed_items
      FROM compliance_items
      WHERE completed_at > datetime('now', '-30 days')
      GROUP BY DATE(completed_at)
      ORDER BY date
    `),
    
    // Monthly progress (last 6 months)
    db.all(`
      SELECT 
        strftime('%Y-%m', completed_at) as month,
        COUNT(*) as completed_items
      FROM compliance_items
      WHERE completed_at > datetime('now', '-6 months')
      GROUP BY strftime('%Y-%m', completed_at)
      ORDER BY month
    `)
  ]);

  res.json({
    status: 'success',
    data: {
      category_breakdown: categoryBreakdown,
      importance_distribution: importanceDistribution,
      completion_trend: completionTrend,
      monthly_progress: monthlyProgress
    }
  });
}));

// Get recommendations for the admin
router.get('/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  
  // Get recommendations based on current compliance state
  const pendingCritical = await db.all(`
    SELECT 
      c.name as category,
      i.title,
      i.description,
      i.documentation_link
    FROM compliance_items i
    JOIN compliance_categories c ON i.category_id = c.id
    WHERE i.importance = 'critical' AND i.is_completed = 0
    ORDER BY i.created_at
    LIMIT 3
  `);

  const recommendations = [
    {
      priority: 'high',
      title: 'Complete Critical Compliance Items',
      description: `You have ${pendingCritical.length} critical compliance items pending. These should be addressed immediately to maintain security posture.`,
      action: 'Review and complete critical checklist items',
      category: 'compliance',
      items: pendingCritical
    },
    {
      priority: 'medium',
      title: 'Schedule Regular DLP Policy Reviews',
      description: 'Data Loss Prevention policies should be reviewed monthly to ensure they align with organizational changes.',
      action: 'Set up monthly DLP policy review meetings',
      category: 'governance',
      cli_commands: ['pac connector list']
    },
    {
      priority: 'medium',
      title: 'Monitor Environment Health',
      description: 'Regular monitoring of environment health helps identify issues before they impact users.',
      action: 'Set up automated environment health checks',
      category: 'monitoring',
      cli_commands: ['pac environment list', 'pac analytics list']
    },
    {
      priority: 'low',
      title: 'User Access Audit',
      description: 'Quarterly review of user access and permissions helps maintain security and compliance.',
      action: 'Schedule quarterly access reviews',
      category: 'security',
      cli_commands: ['pac user list --environment-id {env-id}']
    }
  ];

  res.json({
    status: 'success',
    data: recommendations
  });
}));

export default router;
