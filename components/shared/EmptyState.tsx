import { FileQuestion, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  title = "No data found",
  description = "There is currently no data to display in this list.",
  icon: Icon = FileQuestion,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-2xl shadow-sm">
      <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-navy mb-2 tracking-tight">{title}</h3>
      <p className="text-gray-500 max-w-xs mx-auto mb-8 text-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="bg-brand hover:bg-brand-dark text-white rounded-xl px-6 py-5 h-auto font-bold transition-all shadow-lg hover:shadow-brand/20"
        >
          <Plus className="mr-2 h-5 w-5" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
