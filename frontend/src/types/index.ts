export interface ComplianceCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  order_index: number;
  total_items: number;
  completed_items: number;
  items: ComplianceItem[];
}

export interface ComplianceItem {
  id: number;
  category_id: number;
  environment_id?: string;
  title: string;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  documentation_link?: string;
  cli_commands: string[];
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  completion_details?: {
    completion_method?: string;
    verification_steps?: string[];
    evidence_files?: string[];
    issues_encountered?: string;
    time_taken?: number;
    additional_notes?: string;
  };
  order_index: number;
}

export interface ComplianceSummary {
  overall: {
    total_items: number;
    completed_items: number;
    completion_percentage: number;
  };
  critical: {
    total_critical: number;
    completed_critical: number;
    critical_completion_percentage: number;
  };
  recent_activity: Array<{
    category_id: number;
    completed_count: number;
  }>;
  category_breakdown: Array<{
    category_name: string;
    icon: string;
    total_items: number;
    completed_items: number;
    completion_percentage: number;
  }>;
}

export interface CLICommand {
  id: number;
  name: string;
  category: string;
  description: string;
  command: string;
  parameters: {
    required?: Array<{
      name: string;
      description: string;
    }>;
    optional?: Array<{
      name: string;
      description: string;
    }>;
  };
  example_usage: string;
  documentation_link?: string;
  tags: string[];
}

export interface DashboardOverview {
  compliance_overview: {
    total_items: number;
    completed_items: number;
    completion_percentage: number;
    pending_critical: number;
    health_score: number;
  };
  recent_activity: Array<{
    date: string;
    completed_count: number;
  }>;
  critical_items: Array<{
    category: string;
    title: string;
    importance: string;
    description: string;
  }>;
  environment_metrics: {
    total_environments: number;
    active_users: number;
  };
  compliance_trend: Array<{
    date: string;
    items_completed: number;
  }>;
}

export interface AuditLog {
  id: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  user_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  data?: T;
  message?: string;
}

export interface Environment {
  id: string;
  name: string;
  display_name?: string;
  type: 'Production' | 'Sandbox' | 'Trial' | 'Default' | 'PoC' | 'Developer';
  region?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
