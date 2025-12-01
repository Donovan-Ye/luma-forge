'use client';

import { Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { BrandLogo } from '@/components/branding/BrandLogo';

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
            <BrandLogo
              size={64}
              className="justify-center"
              wordmarkClassName="text-4xl font-bold tracking-tight text-foreground"
            />
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

            <BrandLogo
              size={64}
              className="justify-center"
              wordmarkClassName="text-4xl font-bold tracking-tight text-foreground"
            />
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

