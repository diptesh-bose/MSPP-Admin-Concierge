import { useState } from 'react';
import { X, CheckCircle, Plus } from 'lucide-react';
import type { ComplianceItem } from '../types';

interface ComplianceCompletionModalProps {
  item: ComplianceItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: any) => Promise<void>;
}

export function ComplianceCompletionModal({ 
  item, 
  isOpen, 
  onClose, 
  onSubmit 
}: ComplianceCompletionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionMethod, setCompletionMethod] = useState('');
  const [verificationSteps, setVerificationSteps] = useState<string[]>(['']);
  const [issuesEncountered, setIssuesEncountered] = useState('');
  const [timeTaken, setTimeTaken] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const addVerificationStep = () => {
    setVerificationSteps([...verificationSteps, '']);
  };

  const updateVerificationStep = (index: number, value: string) => {
    const updated = [...verificationSteps];
    updated[index] = value;
    setVerificationSteps(updated);
  };

  const removeVerificationStep = (index: number) => {
    if (verificationSteps.length > 1) {
      setVerificationSteps(verificationSteps.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const completionDetails = {
        completion_method: completionMethod,
        verification_steps: verificationSteps.filter(step => step.trim() !== ''),
        issues_encountered: issuesEncountered,
        time_taken: timeTaken ? parseInt(timeTaken) : undefined,
        additional_notes: additionalNotes,
        completed_at: new Date().toISOString()
      };

      console.log('Submitting completion details:', {
        is_completed: true,
        completed_by: 'Admin',
        completion_details: completionDetails
      });

      await onSubmit({
        is_completed: true,
        completed_by: 'Admin', // You can make this dynamic based on user context
        completion_details: completionDetails
      });

      console.log('Completion details submitted successfully');
      onClose();
    } catch (error) {
      console.error('Failed to submit completion details:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Mark Task as Complete</h2>
            <p className="text-sm text-muted-foreground mt-1">{item.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Completion Method */}
          <div>
            <label className="block text-sm font-medium mb-2">
              How was this task completed? *
            </label>
            <select
              value={completionMethod}
              onChange={(e) => setCompletionMethod(e.target.value)}
              required
              className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            >
              <option value="">Select completion method</option>
              <option value="manual">Manual Configuration</option>
              <option value="cli">CLI Commands</option>
              <option value="powershell">PowerShell Script</option>
              <option value="admin_center">Admin Center</option>
              <option value="automated">Automated Process</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Verification Steps */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Verification Steps Taken
            </label>
            <div className="space-y-2">
              {verificationSteps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateVerificationStep(index, e.target.value)}
                    placeholder={`Verification step ${index + 1}`}
                    className="flex-1 p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                  />
                  {verificationSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVerificationStep(index)}
                      className="px-2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addVerificationStep}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="h-3 w-3" />
                Add verification step
              </button>
            </div>
          </div>

          {/* Issues Encountered */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Issues Encountered (if any)
            </label>
            <textarea
              value={issuesEncountered}
              onChange={(e) => setIssuesEncountered(e.target.value)}
              placeholder="Describe any issues you encountered and how they were resolved..."
              rows={3}
              className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background resize-none"
            />
          </div>

          {/* Time Taken */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Time Taken (minutes)
            </label>
            <input
              type="number"
              value={timeTaken}
              onChange={(e) => setTimeTaken(e.target.value)}
              placeholder="How long did this task take?"
              min="1"
              className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Additional Notes
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional notes about the completion of this task..."
              rows={3}
              className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !completionMethod}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Mark Complete
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
