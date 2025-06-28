import React, { useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Server,
  Activity
} from 'lucide-react';
import { useAppStore } from '../store';
import { EnvironmentSelector } from '../components/EnvironmentSelector';
import { cn, formatRelativeTime } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  className?: string;
}

function StatCard({ title, value, change, trend, icon, className }: StatCardProps) {
  return (
    <div className={cn("bg-card rounded-lg border border-border p-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className={cn(
              "text-xs font-medium flex items-center gap-1 mt-1",
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {change}
            </p>
          )}
        </div>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { 
    dashboardOverview, 
    loadingDashboard, 
    fetchDashboardOverview,
    fetchEnvironments 
  } = useAppStore();

  useEffect(() => {
    fetchEnvironments();
    fetchDashboardOverview();
  }, [fetchDashboardOverview, fetchEnvironments]);

  if (loadingDashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardOverview) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const { compliance_overview, critical_items, environment_metrics } = dashboardOverview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Power Platform compliance and monitoring overview
          </p>
        </div>
        <EnvironmentSelector className="min-w-[200px]" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Compliance Score"
          value={`${compliance_overview.completion_percentage}%`}
          change={`${compliance_overview.completed_items}/${compliance_overview.total_items} items`}
          trend="up"
          icon={<CheckCircle className="h-6 w-6" />}
          className={cn(
            "border-l-4",
            compliance_overview.completion_percentage >= 80 
              ? "border-l-green-500" 
              : compliance_overview.completion_percentage >= 60
              ? "border-l-yellow-500"
              : "border-l-red-500"
          )}
        />
        
        <StatCard
          title="Health Score"
          value={`${compliance_overview.health_score}%`}
          change="Based on critical items"
          trend={compliance_overview.health_score >= 80 ? 'up' : 'down'}
          icon={<Activity className="h-6 w-6" />}
          className="border-l-4 border-l-blue-500"
        />
        
        <StatCard
          title="Critical Items"
          value={compliance_overview.pending_critical}
          change="Pending attention"
          trend={compliance_overview.pending_critical === 0 ? 'up' : 'down'}
          icon={<AlertTriangle className="h-6 w-6" />}
          className={cn(
            "border-l-4",
            compliance_overview.pending_critical === 0 
              ? "border-l-green-500" 
              : "border-l-red-500"
          )}
        />
        
        <StatCard
          title="Environments"
          value={environment_metrics.total_environments}
          change={`${environment_metrics.active_users} active users`}
          trend="neutral"
          icon={<Server className="h-6 w-6" />}
          className="border-l-4 border-l-purple-500"
        />
      </div>

      {/* Critical Items Alert */}
      {critical_items.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Critical Compliance Items Require Attention
              </h3>
              <p className="text-red-700 dark:text-red-300 mt-1">
                You have {critical_items.length} critical compliance items that need immediate attention.
              </p>
              <div className="mt-4 space-y-2">
                {critical_items.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm text-red-700 dark:text-red-300">
                    • <strong>{item.category}:</strong> {item.title}
                  </div>
                ))}
                {critical_items.length > 3 && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    +{critical_items.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {dashboardOverview.recent_activity.length > 0 ? (
              dashboardOverview.recent_activity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {activity.completed_count} items completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.date)}
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/compliance"
              className="flex items-center justify-between p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
            >
              <div>
                <p className="font-medium">Review Compliance</p>
                <p className="text-sm text-muted-foreground">Check your compliance status</p>
              </div>
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
            </a>
            
            <a
              href="/cli"
              className="flex items-center justify-between p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
            >
              <div>
                <p className="font-medium">CLI Commands</p>
                <p className="text-sm text-muted-foreground">Access Power Platform CLI reference</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </a>
            
            <a
              href="/audit"
              className="flex items-center justify-between p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
            >
              <div>
                <p className="font-medium">Audit Logs</p>
                <p className="text-sm text-muted-foreground">Review system activity</p>
              </div>
              <Server className="h-5 w-5 text-muted-foreground" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
