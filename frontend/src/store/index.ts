import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import api from '../lib/api';
import type { 
  ComplianceCategory, 
  ComplianceSummary, 
  CLICommand, 
  DashboardOverview,
  AuditLog,
  Environment,
  ApiResponse 
} from '../types';

interface AppState {
  // Environment data
  environments: Environment[];
  selectedEnvironmentId: string | null;
  loadingEnvironments: boolean;
  
  // Compliance data
  complianceCategories: ComplianceCategory[];
  complianceSummary: ComplianceSummary | null;
  loadingCompliance: boolean;
  
  // CLI commands
  cliCommands: CLICommand[];
  cliCommandsByCategory: Record<string, CLICommand[]>;
  loadingCLI: boolean;
  
  // Dashboard data
  dashboardOverview: DashboardOverview | null;
  loadingDashboard: boolean;
  
  // Audit logs
  auditLogs: AuditLog[];
  loadingAudit: boolean;
  
  // UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  fetchEnvironments: () => Promise<void>;
  setSelectedEnvironment: (environmentId: string | null) => void;
  
  fetchComplianceCategories: () => Promise<void>;
  fetchComplianceSummary: () => Promise<void>;
  updateComplianceItem: (itemId: number, updates: any) => Promise<void>;
  
  fetchCLICommands: () => Promise<void>;
  fetchCLICommandsByCategory: () => Promise<void>;
  
  fetchDashboardOverview: () => Promise<void>;
  
  fetchAuditLogs: (params?: any) => Promise<void>;
  
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    environments: [],
    selectedEnvironmentId: null,
    loadingEnvironments: false,
    
    complianceCategories: [],
    complianceSummary: null,
    loadingCompliance: false,
    
    cliCommands: [],
    cliCommandsByCategory: {},
    loadingCLI: false,
    
    dashboardOverview: null,
    loadingDashboard: false,
    
    auditLogs: [],
    loadingAudit: false,
    
    sidebarOpen: true,
    theme: 'system',
    
    // Environment actions
    fetchEnvironments: async () => {
      set({ loadingEnvironments: true });
      try {
        const response = await api.get<ApiResponse<Environment[]>>('/environments');
        if (response.data.status === 'success' && response.data.data) {
          const environments = response.data.data;
          set({ environments });
          
          // Auto-select the first environment if none is selected
          const { selectedEnvironmentId } = get();
          if (!selectedEnvironmentId && environments.length > 0) {
            set({ selectedEnvironmentId: environments[0].id });
          }
        }
      } catch (error) {
        console.error('Failed to fetch environments:', error);
      } finally {
        set({ loadingEnvironments: false });
      }
    },

    setSelectedEnvironment: (environmentId: string | null) => {
      set({ selectedEnvironmentId: environmentId });
      // Refetch compliance data when environment changes
      get().fetchComplianceCategories();
      get().fetchComplianceSummary();
      get().fetchDashboardOverview();
    },
    
    // Compliance actions
    fetchComplianceCategories: async () => {
      set({ loadingCompliance: true });
      try {
        const { selectedEnvironmentId } = get();
        const url = selectedEnvironmentId 
          ? `/compliance/categories?environment_id=${selectedEnvironmentId}`
          : '/compliance/categories';
        const response = await api.get<ApiResponse<ComplianceCategory[]>>(url);
        if (response.data.status === 'success' && response.data.data) {
          set({ complianceCategories: response.data.data });
        }
      } catch (error) {
        console.error('Failed to fetch compliance categories:', error);
      } finally {
        set({ loadingCompliance: false });
      }
    },
    
    fetchComplianceSummary: async () => {
      try {
        const { selectedEnvironmentId } = get();
        const url = selectedEnvironmentId 
          ? `/compliance/summary?environment_id=${selectedEnvironmentId}`
          : '/compliance/summary';
        const response = await api.get<ApiResponse<ComplianceSummary>>(url);
        if (response.data.status === 'success' && response.data.data) {
          set({ complianceSummary: response.data.data });
        }
      } catch (error) {
        console.error('Failed to fetch compliance summary:', error);
      }
    },
    
    updateComplianceItem: async (itemId: number, updates: any) => {
      try {
        console.log('Store: Updating compliance item', itemId, 'with updates:', updates);
        const response = await api.patch<ApiResponse<any>>(`/compliance/items/${itemId}`, updates);
        console.log('Store: Update response:', response.data);
        if (response.data.status === 'success') {
          // Refresh compliance data
          console.log('Store: Refreshing compliance data...');
          await get().fetchComplianceCategories();
          await get().fetchComplianceSummary();
          await get().fetchDashboardOverview();
          console.log('Store: Compliance data refreshed');
        }
      } catch (error) {
        console.error('Failed to update compliance item:', error);
        throw error;
      }
    },
    
    // CLI actions
    fetchCLICommands: async () => {
      set({ loadingCLI: true });
      try {
        const response = await api.get<ApiResponse<CLICommand[]>>('/cli/commands');
        if (response.data.status === 'success' && response.data.data) {
          set({ cliCommands: response.data.data });
        }
      } catch (error) {
        console.error('Failed to fetch CLI commands:', error);
      } finally {
        set({ loadingCLI: false });
      }
    },
    
    fetchCLICommandsByCategory: async () => {
      set({ loadingCLI: true });
      try {
        const response = await api.get<ApiResponse<Record<string, CLICommand[]>>>('/cli/commands/grouped');
        if (response.data.status === 'success' && response.data.data) {
          set({ cliCommandsByCategory: response.data.data });
        }
      } catch (error) {
        console.error('Failed to fetch CLI commands by category:', error);
      } finally {
        set({ loadingCLI: false });
      }
    },
    
    // Dashboard actions
    fetchDashboardOverview: async () => {
      set({ loadingDashboard: true });
      try {
        const response = await api.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
        if (response.data.status === 'success' && response.data.data) {
          set({ dashboardOverview: response.data.data });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard overview:', error);
      } finally {
        set({ loadingDashboard: false });
      }
    },
    
    // Audit actions
    fetchAuditLogs: async (params = {}) => {
      set({ loadingAudit: true });
      try {
        const response = await api.get<ApiResponse<{ logs: AuditLog[] }>>('/audit/logs', { params });
        if (response.data.status === 'success' && response.data.data) {
          set({ auditLogs: response.data.data.logs });
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        set({ loadingAudit: false });
      }
    },
    
    // UI actions
    setSidebarOpen: (open: boolean) => {
      set({ sidebarOpen: open });
    },
    
    setTheme: (theme: 'light' | 'dark' | 'system') => {
      set({ theme });
      // Apply theme to document
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System theme
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
      localStorage.setItem('theme', theme);
    },
  }))
);

// Initialize theme on app start
const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
if (savedTheme) {
  useAppStore.getState().setTheme(savedTheme);
} else {
  useAppStore.getState().setTheme('system');
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const currentTheme = useAppStore.getState().theme;
  if (currentTheme === 'system') {
    useAppStore.getState().setTheme('system');
  }
});
