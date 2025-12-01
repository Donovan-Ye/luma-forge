'use client';

import { ReactNode } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RotateCcw, LucideIcon } from 'lucide-react';

interface AdjustmentSectionProps {
  value: string;
  icon: LucideIcon;
  title: string;
  onReset: (e: React.MouseEvent) => void;
  resetTitle: string;
  children: ReactNode;
}

export function AdjustmentSection({
  value,
  icon: Icon,
  title,
  onReset,
  resetTitle,
  children,
}: AdjustmentSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="px-2 py-1.5 hover:no-underline hover:bg-accent/50">
        <div className="flex items-center justify-between w-full pr-1.5">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium">{title}</span>
          </div>
          <button
            onClick={onReset}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-accent transition-colors"
            title={resetTitle}
          >
            <RotateCcw className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pt-1 pb-1 space-y-2">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

