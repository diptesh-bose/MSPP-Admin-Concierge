import { useEffect, useState } from 'react';
import { 
  Calendar, 
  Filter, 
  Download, 
  Search, 
  Clock,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn, formatRelativeTime } from '../lib/utils';
import type { AuditLog } from '../types';

interface AuditLogCardProps {
  log: AuditLog;
}

function getActionIcon(action: string) {
  switch (action.toLowerCase()) {
    case 'create':
    case 'created':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'update':
    case 'updated':
    case 'modify':
    case 'modified':
      return <Settings className="h-4 w-4 text-blue-600" />;
    case 'delete':
    case 'deleted':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'view':
    case 'viewed':
    case 'access':
    case 'accessed':
      return <Eye className="h-4 w-4 text-gray-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

function getActionColor(action: string) {
  switch (action.toLowerCase()) {
    case 'create':
    case 'created':
      return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
    case 'update':
    case 'updated':
    case 'modify':
    case 'modified':
      return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
    case 'delete':
    case 'deleted':
      return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
    case 'view':
    case 'viewed':
    case 'access':
    case 'accessed':
      return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400';
  }
}

function AuditLogCard({ log }: AuditLogCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1">
            {getActionIcon(log.action)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{log.action}</h3>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                getActionColor(log.action)
              )}>
                {log.resource_type}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
              {log.action} on {log.resource_type} {log.resource_id ? `(${log.resource_id})` : ''}
            </p>
            
            {log.resource_id && (
              <p className="text-xs text-muted-foreground font-mono mb-2">
                Resource: {log.resource_id}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {log.user_id || 'System'}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(log.created_at)}
              </div>
              {log.ip_address && (
                <div>
                  IP: {log.ip_address}
                </div>
              )}
            </div>
            
            {log.details && Object.keys(log.details).length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-primary cursor-pointer hover:underline">
                  View Details
                </summary>
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Audit() {
  const { 
    auditLogs, 
    loadingAudit,
    fetchAuditLogs
  } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    const params: any = {};
    
    if (searchTerm) params.search = searchTerm;
    if (selectedAction) params.action = selectedAction;
    if (selectedResourceType) params.resource_type = selectedResourceType;
    
    // Add date filter
    const now = new Date();
    switch (dateRange) {
      case '1h':
        params.since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        break;
      case '24h':
        params.since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        params.since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        params.since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }
    
    fetchAuditLogs(params);
  }, [searchTerm, selectedAction, selectedResourceType, dateRange, fetchAuditLogs]);

  // Get unique actions and resource types for filters
  const actions = Array.from(new Set(auditLogs.map(log => log.action))).sort();
  const resourceTypes = Array.from(new Set(auditLogs.map(log => log.resource_type))).sort();

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAction('');
    setSelectedResourceType('');
    setDateRange('7d');
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'User', 'IP Address', 'Description'].join(','),
      ...auditLogs.map(log => [
        log.created_at,
        log.action,
        log.resource_type,
        log.resource_id || '',
        log.user_id || '',
        log.ip_address || '',
        `"${log.action} on ${log.resource_type} ${log.resource_id || ''}".replace(/"/g, '""')}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loadingAudit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track and monitor all activities in your Power Platform environment
          </p>
        </div>
        
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 bg-muted rounded mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 bg-muted rounded w-20" />
                    <div className="h-4 bg-muted rounded w-16" />
                  </div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="flex gap-4">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track and monitor all activities in your Power Platform environment
          </p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            
            <select
              value={selectedResourceType}
              onChange={(e) => setSelectedResourceType(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="">All Resources</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {(searchTerm || selectedAction || selectedResourceType || dateRange !== '7d') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Filter className="h-3 w-3" />
              Clear Filters
            </button>
          )}

          <div className="text-sm text-muted-foreground">
            {auditLogs.length} log{auditLogs.length === 1 ? '' : 's'} found
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="space-y-4">
        {auditLogs.map((log) => (
          <AuditLogCard key={log.id} log={log} />
        ))}
        
        {auditLogs.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No audit logs found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
