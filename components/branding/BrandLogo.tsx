'use client';

import Image from "next/image";
import { cn } from "@/lib/utils";

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
  priority = false,
}: BrandLogoProps) {
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

