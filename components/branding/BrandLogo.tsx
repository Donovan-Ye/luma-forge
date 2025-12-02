'use client';

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface BrandLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  imageClassName?: string;
  wordmarkClassName?: string;
  priority?: boolean;
}

export function BrandLogo({
  size = 28,
  showWordmark = true,
  className,
  imageClassName,
  wordmarkClassName,
  priority = true,
}: BrandLogoProps) {
  useEffect(() => {
    // Aggressively preload the image
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/logo2.png';
    link.fetchPriority = 'high';
    document.head.appendChild(link);

    // Also preload using Image object for immediate caching
    const img = new window.Image();
    img.src = '/logo2.png';

    return () => {
      // Cleanup
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="Luma Forge"
    >
      <Image
        src="/logo2.png"
        alt="Luma Forge logo"
        width={size}
        height={size}
        priority={priority}
        unoptimized
        className={cn(
          "rounded-md border border-white/10 bg-white/5 object-contain",
          imageClassName
        )}
      />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight text-sm text-zinc-100",
            wordmarkClassName
          )}
        >
          Luma Forge
        </span>
      )}
    </span>
  );
}

