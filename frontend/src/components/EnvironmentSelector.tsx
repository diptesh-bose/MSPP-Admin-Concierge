import React from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useAppStore } from '../store';

interface EnvironmentSelectorProps {
  className?: string;
}

export function EnvironmentSelector({ className }: EnvironmentSelectorProps) {
  const { 
    environments, 
    selectedEnvironmentId, 
    loadingEnvironments,
    setSelectedEnvironment 
  } = useAppStore();

  const handleEnvironmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const environmentId = event.target.value;
    setSelectedEnvironment(environmentId);
  };

  if (loadingEnvironments) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg animate-pulse">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div className="h-4 bg-muted rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <select
          value={selectedEnvironmentId || ''}
          onChange={handleEnvironmentChange}
          className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer appearance-none pr-8"
          disabled={environments.length === 0}
        >
          {environments.length === 0 ? (
            <option value="">No environments</option>
          ) : (
            environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.display_name || env.name}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="h-4 w-4 text-muted-foreground pointer-events-none absolute right-3" />
      </div>
    </div>
  );
}
