'use client';

import { useState, useRef, useTransition } from 'react';
import {
  Camera,
  Upload,
  X,
  Loader2,
  Check,
  RotateCcw,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  photoTypeLabels,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  type PhotoType,
} from '@/types/photo';
import { createPhoto } from '@/app/actions/photos';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface PhotoUploaderProps {
  projectId: string;
  canUpload: boolean;
  onUploaded?: () => void;
}

type Stage = 'select' | 'preview' | 'uploading' | 'success' | 'error';

export function PhotoUploader({
  projectId,
  canUpload,
  onUploaded,
}: PhotoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('select');
  const [error, setError] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>('project_site');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setStage('select');
    setError(null);
    setPhotoType('project_site');
    setCaption('');
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function handleClose() {
    setOpen(false);
    resetState();
  }

  function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) return;

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setError(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
      setStage('error');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File too large. Maximum size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`
      );
      setStage('error');
      return;
    }

    setError(null);
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setStage('preview');
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setStage('select');
    // Re-trigger camera if it was a camera capture
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }

  function handleConfirmUpload() {
    if (!file) return;

    setStage('uploading');
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const filename = `${timestamp}-${randomId}.${ext}`;
        const storagePath = `projects/${projectId}/photos/${filename}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company')
          .upload(storagePath, file, {
            contentType: file.type,
            cacheControl: '3600',
          });

        if (uploadError) {
          setError(uploadError.message);
          setStage('error');
          return;
        }

        // Get public URL (signed URL will be needed to view since bucket is private)
        const { data: urlData } = supabase.storage
          .from('company')
          .getPublicUrl(storagePath);

        // Save metadata to DB
        const result = await createPhoto({
          entity_type: 'project',
          entity_id: projectId,
          project_id: projectId,
          photo_type: photoType,
          name: file.name,
          file_url: urlData.publicUrl,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          caption: caption,
        });

        if (!result.success) {
          // Clean up uploaded file if DB insert failed
          await supabase.storage.from('company').remove([storagePath]);
          setError(result.error);
          setStage('error');
          return;
        }

        setStage('success');
        setTimeout(() => {
          handleClose();
          onUploaded?.();
        }, 1200);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Upload failed unexpectedly'
        );
        setStage('error');
      }
    });
  }

  if (!canUpload) return null;

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Camera className="mr-2 h-4 w-4" />
          Take Photo
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setPhotoType('project_site');
            setOpen(true);
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Photo
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {stage === 'preview' ? 'Preview' : 'Add Photo'}
            </DialogTitle>
          </DialogHeader>

          {/* SELECT STAGE */}
          {stage === 'select' && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>Photo Type</Label>
                  <Select
                    value={photoType}
                    onValueChange={(v) => setPhotoType(v as PhotoType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(photoTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 p-6 transition hover:border-primary hover:bg-primary/5"
                >
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Take Photo</span>
                  <span className="text-xs text-muted-foreground">
                    Use camera
                  </span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 p-6 transition hover:border-primary hover:bg-primary/5"
                >
                  <Upload className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Upload Photo</span>
                  <span className="text-xs text-muted-foreground">
                    Choose file
                  </span>
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                JPEG, PNG, WebP, HEIC up to 10MB
              </p>
            </div>
          )}

          {/* PREVIEW STAGE */}
          {stage === 'preview' && previewUrl && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-lg bg-muted">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto max-h-64 w-auto object-contain"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Photo Type</Label>
                  <Select
                    value={photoType}
                    onValueChange={(v) => setPhotoType(v as PhotoType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(photoTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={2}
                    placeholder="Add a description..."
                  />
                </div>

                {file && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span className="truncate">{file.name}</span>
                    <span>·</span>
                    <span>{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UPLOADING STAGE */}
          {stage === 'uploading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading photo...</p>
            </div>
          )}

          {/* SUCCESS STAGE */}
          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm font-medium">Photo saved successfully!</p>
            </div>
          )}

          {/* ERROR STAGE */}
          {stage === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStage('select')}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* HIDDEN INPUTS */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(',')}
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          />

          {/* FOOTER ACTIONS */}
          {stage === 'preview' && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleRetake}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button onClick={handleConfirmUpload} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </DialogFooter>
          )}
          {stage === 'select' && (
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
