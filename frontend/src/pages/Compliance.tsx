import { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Shield, 
  Users, 
  Server,
  Database,
  Eye,
  FileText,
  Settings,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store';
import { EnvironmentSelector } from '../components/EnvironmentSelector';
import { cn, formatRelativeTime } from '../lib/utils';
import { ComplianceCompletionModal } from '../components/ComplianceCompletionModal';
import type { ComplianceItem } from '../types';

interface CategorySectionProps {
  category: any;
  expanded: boolean;
  onToggle: () => void;
  onItemUpdate: (itemId: number, updates: any) => void;
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
    default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400';
  }
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'data protection & privacy': return <Shield className="h-6 w-6" />;
    case 'identity & access management': return <Users className="h-6 w-6" />;
    case 'environment management': return <Server className="h-6 w-6" />;
    case 'data governance': return <Database className="h-6 w-6" />;
    case 'monitoring & auditing': return <Eye className="h-6 w-6" />;
    case 'compliance & governance': return <FileText className="h-6 w-6" />;
    default: return <Settings className="h-6 w-6" />;
  }
}

function ComplianceItemCard({ item, onUpdate }: { item: ComplianceItem; onUpdate: (updates: any) => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showAllCommands, setShowAllCommands] = useState(false);

  const handleStatusChange = async (completed: boolean) => {
    console.log('handleStatusChange called:', { completed, itemId: item.id, currentStatus: item.is_completed });
    
    if (completed && !item.is_completed) {
      // Show completion modal for marking as complete
      console.log('Showing completion modal for item:', item.id);
      setShowCompletionModal(true);
    } else {
      // Direct update for unchecking
      console.log('Direct update for unchecking item:', item.id);
      setIsUpdating(true);
      try {
        await onUpdate({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleCompletionSubmit = async (completionData: any) => {
    console.log('handleCompletionSubmit called with:', completionData);
    setIsUpdating(true);
    try {
      await onUpdate(completionData);
      console.log('Completion data updated successfully');
      setShowCompletionModal(false);
    } catch (error) {
      console.error('Failed to update completion data:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotesUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({ notes });
      setShowNotes(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className={cn(
        "border rounded-lg p-4 transition-all duration-200",
        item.is_completed ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-card border-border"
      )}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleStatusChange(!item.is_completed)}
            disabled={isUpdating}
            className="mt-1 text-lg hover:scale-110 transition-transform disabled:opacity-50"
          >
            {item.is_completed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className={cn(
                  "font-medium text-sm",
                  item.is_completed && "line-through text-muted-foreground"
                )}>
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
                
                {item.cli_commands && item.cli_commands.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">CLI Commands:</p>
                    <div className="flex flex-wrap gap-2">
                      {(showAllCommands ? item.cli_commands : item.cli_commands.slice(0, 2)).map((cmd, idx) => (
                        <code key={idx} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {cmd}
                        </code>
                      ))}
                      {item.cli_commands.length > 2 && (
                        <button
                          onClick={() => setShowAllCommands(!showAllCommands)}
                          className="text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer"
                        >
                          {showAllCommands 
                            ? 'Show less' 
                            : `+${item.cli_commands.length - 2} more`
                          }
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {item.completed_at && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Completed {formatRelativeTime(item.completed_at)} {item.completed_by && `by ${item.completed_by}`}
                  </div>
                )}

                {/* Completion Details */}
                {item.completion_details && (
                  <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Completion Details:</p>
                    <div className="text-xs space-y-1">
                      {item.completion_details.completion_method && (
                        <p><span className="font-medium">Method:</span> {item.completion_details.completion_method}</p>
                      )}
                      {item.completion_details.time_taken && (
                        <p><span className="font-medium">Time taken:</span> {item.completion_details.time_taken} minutes</p>
                      )}
                      {item.completion_details.verification_steps && item.completion_details.verification_steps.length > 0 && (
                        <div>
                          <span className="font-medium">Verification steps:</span>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {item.completion_details.verification_steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                  getPriorityColor(item.importance)
                )}>
                  {item.importance === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {item.importance.charAt(0).toUpperCase() + item.importance.slice(1)}
                </span>
              </div>
            </div>
            
            {/* Notes Section */}
            <div className="mt-3">
              {!showNotes ? (
                <button
                  onClick={() => setShowNotes(true)}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {notes ? 'Edit notes' : 'Add notes'}
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your notes..."
                    className="w-full text-xs p-2 border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleNotesUpdate}
                      disabled={isUpdating}
                      className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowNotes(false);
                        setNotes(item.notes || '');
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {notes && !showNotes && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  "{notes}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ComplianceCompletionModal
        item={item}
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onSubmit={handleCompletionSubmit}
      />
    </>
  );
}

function CategorySection({ category, expanded, onToggle, onItemUpdate }: CategorySectionProps) {
  const completedCount = category.items.filter((item: ComplianceItem) => item.is_completed).length;
  const totalCount = category.items.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-primary">
              {getCategoryIcon(category.name)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{category.name}</h2>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} items completed ({completionRate}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            {expanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>
      
      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {category.items.map((item: ComplianceItem) => (
            <ComplianceItemCard
              key={item.id}
              item={item}
              onUpdate={(updates) => onItemUpdate(item.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Compliance() {
  const { 
    complianceCategories, 
    complianceSummary,
    loadingCompliance,
    fetchComplianceCategories,
    fetchComplianceSummary,
    updateComplianceItem,
    fetchEnvironments
  } = useAppStore();
  
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchEnvironments();
    fetchComplianceCategories();
    fetchComplianceSummary();
  }, [fetchComplianceCategories, fetchComplianceSummary, fetchEnvironments]);

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleItemUpdate = async (itemId: number, updates: any) => {
    await updateComplianceItem(itemId, updates);
  };

  if (loadingCompliance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Compliance Checklist</h1>
            <p className="text-muted-foreground">
              Ensure your Power Platform environment meets security and governance standards
            </p>
          </div>
          <EnvironmentSelector className="min-w-[200px]" />
        </div>
        
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 bg-muted rounded" />
                <div className="h-6 bg-muted rounded w-1/3" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
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
          <h1 className="text-3xl font-bold">Compliance Checklist</h1>
          <p className="text-muted-foreground">
            Ensure your Power Platform environment meets security and governance standards
          </p>
        </div>
        <EnvironmentSelector className="min-w-[200px]" />
      </div>

      {/* Summary Stats */}
      {complianceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-primary">
              {complianceSummary.overall.completion_percentage}%
            </div>
            <div className="text-sm text-muted-foreground">Overall Progress</div>
            <div className="text-xs text-muted-foreground mt-1">
              {complianceSummary.overall.completed_items} of {complianceSummary.overall.total_items} items
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-red-600">
              {complianceSummary.critical.critical_completion_percentage}%
            </div>
            <div className="text-sm text-muted-foreground">Critical Items</div>
            <div className="text-xs text-muted-foreground mt-1">
              {complianceSummary.critical.completed_critical} of {complianceSummary.critical.total_critical} completed
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-green-600">
              {complianceSummary.category_breakdown.filter(cat => cat.completion_percentage === 100).length}
            </div>
            <div className="text-sm text-muted-foreground">Categories Complete</div>
            <div className="text-xs text-muted-foreground mt-1">
              of {complianceSummary.category_breakdown.length} total
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-blue-600">
              {complianceSummary.recent_activity.reduce((sum, activity) => sum + activity.completed_count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Recent Activity</div>
            <div className="text-xs text-muted-foreground mt-1">
              Items completed recently
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {complianceCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            expanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            onItemUpdate={handleItemUpdate}
          />
        ))}
        
        {complianceCategories.length === 0 && !loadingCompliance && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No compliance categories found</p>
          </div>
        )}
      </div>
    </div>
  );
}
