'use client';

import { Loader2, Image as ImageIcon } from 'lucide-react';
import { ImageUpload } from '@/components/upload/ImageUpload';

interface LoadingStateProps {
  isLoading: boolean;
  hasImage: boolean;
}

export function LoadingState({ isLoading, hasImage }: LoadingStateProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Luma Forge</h1>
            <p className="text-lg text-muted-foreground">
              Loading your workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasImage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl mb-4">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Luma Forge</h1>
            <p className="text-lg text-muted-foreground">
              Professional grade online image editor.
            </p>
          </div>
          <ImageUpload />
        </div>
      </div>
    );
  }

  return null;
}

