'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ src, alt, open, onOpenChange }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const resetZoom = () => {
    setZoom(100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Zoom Controls */}
        <div className="absolute left-4 top-4 z-50 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={resetZoom}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            {zoom}%
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
        </div>

        {/* Image Container */}
        <div className="flex h-[95vh] w-full items-center justify-center overflow-auto p-8">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100})`,
              cursor: zoom > 100 ? 'move' : 'default',
            }}
            onClick={(e) => {
              // Prevent closing when clicking image
              e.stopPropagation();
            }}
          />
        </div>

        {/* Image Title */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-center">
          <p className="text-lg font-medium text-white">{alt}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
