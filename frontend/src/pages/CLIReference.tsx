import { useEffect, useState } from 'react';
import { 
  Search, 
  Copy, 
  ExternalLink, 
  Terminal, 
  Code, 
  Filter,
  Tag,
  Check
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import type { CLICommand } from '../types';

interface CommandCardProps {
  command: CLICommand;
}

function CommandCard({ command }: CommandCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-lg">{command.name}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {command.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {command.description}
          </p>
        </div>
        {command.documentation_link && (
          <a
            href={command.documentation_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="View documentation"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Command */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-muted-foreground">Command</h4>
          <button
            onClick={() => copyToClipboard(command.command)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="bg-muted/50 rounded-md p-3 font-mono text-sm">
          <code>{command.command}</code>
        </div>
      </div>

      {/* Parameters */}
      {((command.parameters.required?.length || 0) > 0 || (command.parameters.optional?.length || 0) > 0) && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Parameters</h4>
          <div className="space-y-2">
            {command.parameters.required?.map((param, index) => (
              <div key={`req-${index}`} className="text-sm">
                <code className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded text-xs font-mono">
                  --{param.name}
                </code>
                <span className="ml-2 text-muted-foreground">{param.description}</span>
                <span className="ml-2 text-xs text-red-600 dark:text-red-400">(required)</span>
              </div>
            ))}
            {command.parameters.optional?.map((param, index) => (
              <div key={`opt-${index}`} className="text-sm">
                <code className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded text-xs font-mono">
                  --{param.name}
                </code>
                <span className="ml-2 text-muted-foreground">{param.description}</span>
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(optional)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example Usage */}
      {command.example_usage && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">Example Usage</h4>
            <button
              onClick={() => copyToClipboard(command.example_usage)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
          <div className="bg-muted/50 rounded-md p-3 font-mono text-sm">
            <code>{command.example_usage}</code>
          </div>
        </div>
      )}

      {/* Tags */}
      {command.tags && command.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {command.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-accent text-accent-foreground"
            >
              <Tag className="h-2.5 w-2.5 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CLIReference() {
  const { 
    cliCommands, 
    loadingCLI,
    fetchCLICommands,
    fetchCLICommandsByCategory
  } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('grouped');

  useEffect(() => {
    fetchCLICommands();
    fetchCLICommandsByCategory();
  }, [fetchCLICommands, fetchCLICommandsByCategory]);

  // Get unique categories and tags
  const categories = Array.from(new Set(cliCommands.map(cmd => cmd.category))).sort();
  const allTags = Array.from(new Set(cliCommands.flatMap(cmd => cmd.tags || []))).sort();

  // Debug logging
  console.log('CLI Debug - cliCommands count:', cliCommands.length);
  console.log('CLI Debug - categories:', categories);
  console.log('CLI Debug - allTags:', allTags);
  console.log('CLI Debug - selectedCategory:', selectedCategory);
  console.log('CLI Debug - selectedTag:', selectedTag);

  // Filter commands
  const filteredCommands = cliCommands.filter(command => {
    const matchesSearch = !searchTerm || 
      command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      command.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      command.command.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || command.category === selectedCategory;
    const matchesTag = !selectedTag || (command.tags && command.tags.includes(selectedTag));
    
    return matchesSearch && matchesCategory && matchesTag;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTag('');
  };

  if (loadingCLI) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">CLI Reference</h1>
          <p className="text-muted-foreground">
            Power Platform CLI commands for administrative tasks
          </p>
        </div>
        
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-16 bg-muted rounded" />
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
      <div>
        <h1 className="text-3xl font-bold">CLI Reference</h1>
        <p className="text-muted-foreground">
          Power Platform CLI commands for administrative tasks. These commands are for reference only - copy and run them in your terminal.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors",
                viewMode === 'all' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All Commands
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors",
                viewMode === 'grouped' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Grouped by Category
            </button>
          </div>

          {(searchTerm || selectedCategory || selectedTag) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Filter className="h-3 w-3" />
              Clear Filters
            </button>
          )}

          <div className="text-sm text-muted-foreground">
            {filteredCommands.length} command{filteredCommands.length === 1 ? '' : 's'} found
          </div>
        </div>
      </div>

      {/* Commands */}
      {viewMode === 'all' ? (
        <div className="space-y-4">
          {filteredCommands.map((command) => (
            <CommandCard key={command.id} command={command} />
          ))}
          
          {filteredCommands.length === 0 && (
            <div className="text-center py-12">
              <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No commands found matching your criteria</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {categories
            .filter(category => {
              const categoryCommands = filteredCommands.filter(cmd => cmd.category === category);
              return categoryCommands.length > 0;
            })
            .map((category) => {
              const categoryCommands = filteredCommands.filter(cmd => cmd.category === category);
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">{category}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({categoryCommands.length} command{categoryCommands.length === 1 ? '' : 's'})
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categoryCommands.map((command) => (
                      <CommandCard key={command.id} command={command} />
                    ))}
                  </div>
                </div>
              );
            })}
          
          {filteredCommands.length === 0 && (
            <div className="text-center py-12">
              <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No commands found matching your criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
