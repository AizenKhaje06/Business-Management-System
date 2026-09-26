'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Loader2,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
  Calendar,
} from 'lucide-react';
import type { PhotoWithUploader, PhotoType } from '@/types/photo';
import { photoTypeLabels, photoTypeColors } from '@/types/photo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PhotoUploader } from '@/components/photos/photo-uploader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { deletePhoto } from '@/app/actions/photos';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface PhotoGalleryProps {
  photos: PhotoWithUploader[];
  projectId: string;
  canUpload: boolean;
  canDelete: boolean;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function PhotoGallery({
  photos,
  projectId,
  canUpload,
  canDelete,
}: PhotoGalleryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<PhotoType | 'all'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);

  // Lightbox: Escape key + scroll lock
  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') navigateLightbox('prev');
      if (e.key === 'ArrowRight') navigateLightbox('next');
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex]);

  // Generate signed URLs for private bucket photos
  useEffect(() => {
    async function loadUrls() {
      if (photos.length === 0) return;
      const supabase = createSupabaseBrowserClient();
      const paths = photos
        .filter((p) => p.storage_path)
        .map((p) => p.storage_path!);

      if (paths.length === 0) return;

      const { data, error } = await supabase.storage
        .from('company')
        .createSignedUrls(paths, 3600);

      if (!error && data) {
        const urlMap: Record<string, string> = {};
        for (const item of data) {
          if (item.signedUrl && item.path) {
            const photo = photos.find((p) => p.storage_path === item.path);
            if (photo) urlMap[photo.id] = item.signedUrl;
          }
        }
        setSignedUrls(urlMap);
      }
    }
    loadUrls();
  }, [photos]);

  const filteredPhotos =
    filter === 'all' ? photos : photos.filter((p) => p.photo_type === filter);

  const photoTypes = Array.from(
    new Set(photos.map((p) => p.photo_type))
  ) as PhotoType[];

  function handleDelete(photoId: string) {
    startTransition(async () => {
      const result = await deletePhoto(photoId);
      if (result.success) {
        router.refresh();
      }
    });
  }

  function navigateLightbox(direction: 'prev' | 'next') {
    if (lightboxIndex === null) return;
    const max = filteredPhotos.length - 1;
    if (direction === 'prev') {
      setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : max);
    } else {
      setLightboxIndex(lightboxIndex < max ? lightboxIndex + 1 : 0);
    }
  }

  const currentPhoto =
    lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;
  const currentUrl =
    currentPhoto && currentPhoto.id
      ? signedUrls[currentPhoto.id] || currentPhoto.file_url
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {photoTypes.length > 0 && (
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as PhotoType | 'all')}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {photoTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {photoTypeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-sm text-muted-foreground">
            {filteredPhotos.length} photo
            {filteredPhotos.length !== 1 ? 's' : ''}
          </span>
        </div>
        <PhotoUploader
          projectId={projectId}
          canUpload={canUpload}
          onUploaded={() => router.refresh()}
        />
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description={
            canUpload
              ? 'Take or upload photos for this project.'
              : 'Photos will appear here once uploaded.'
          }
        />
      ) : filteredPhotos.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos match this filter"
          description="Try a different photo type."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredPhotos.map((photo, idx) => {
            const url = signedUrls[photo.id] || photo.file_url;
            return (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                <img
                  src={url}
                  alt={photo.caption || photo.name}
                  className="h-full w-full cursor-pointer object-cover transition group-hover:scale-105"
                  onClick={() => setLightboxIndex(idx)}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${photoTypeColors[photo.photo_type]}`}
                  >
                    {photoTypeLabels[photo.photo_type]}
                  </Badge>
                </div>
                {canDelete && (
                  <button
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-100 transition hover:bg-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Delete photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedForDelete(photo.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {currentPhoto && currentUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {filteredPhotos.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('prev');
                }}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('next');
                }}
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="flex max-h-full max-w-5xl flex-col items-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentUrl}
              alt={currentPhoto.caption || currentPhoto.name}
              className="max-h-[70vh] max-w-full touch-pan-pinch object-contain"
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-white/80">
              <Badge
                variant="outline"
                className={photoTypeColors[currentPhoto.photo_type]}
              >
                {photoTypeLabels[currentPhoto.photo_type]}
              </Badge>
              {currentPhoto.caption && (
                <span className="text-white">{currentPhoto.caption}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(currentPhoto.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {currentPhoto.uploader_name ||
                  currentPhoto.uploader_email ||
                  'Unknown'}
              </span>
              <span>{formatFileSize(currentPhoto.file_size)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={selectedForDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedForDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This photo will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedForDelete) handleDelete(selectedForDelete);
                setSelectedForDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
