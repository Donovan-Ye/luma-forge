'use client';

import { ImageUpload } from '@/components/upload/ImageUpload';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageToggle } from './LanguageToggle';

interface LoadingStateProps {
  isLoading: boolean;
  hasImage: boolean;
}

export function LoadingState({ isLoading, hasImage }: LoadingStateProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <BrandLogo
              size={64}
              className="justify-center"
              wordmarkClassName="text-4xl font-bold tracking-tight text-foreground"
            />
            <p className="text-base text-muted-foreground">
              {t('loadingWorkspace')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasImage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 relative">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <BrandLogo
              size={64}
              className="justify-center"
              wordmarkClassName="text-4xl font-bold tracking-tight text-foreground"
            />
            <p className="text-lg text-muted-foreground">
              {t('heroTagline')}
            </p>
          </div>
          <ImageUpload />
        </div>
      </div>
    );
  }

  return null;
}

