'use client';

import { useState, useRef } from 'react';
import { useEditorStore } from '@/lib/store';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ImageUpload() {
  const setImage = useEditorStore((state) => state.setImage);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-96 border-2 border-dashed rounded-xl transition-colors duration-200 ease-in-out",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex flex-col items-center space-y-4 text-center p-8">
        <div className="p-4 bg-primary/10 rounded-full">
          <Upload className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Upload an image to edit</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop or click to select
          </p>
          <p className="text-xs text-muted-foreground">
            Supports JPG, PNG, WebP
          </p>
        </div>
        <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
            size="lg"
        >
          Select Image
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}

