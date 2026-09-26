'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Sheet,
  FileType,
  File,
  Download,
  Trash2,
  Archive,
  RotateCcw,
  Loader2,
  Search,
  X,
  AlertCircle,
  Paperclip,
} from 'lucide-react';
import type {
  DocumentWithUploader,
  DocumentEntityType,
} from '@/types/document';
import {
  formatFileSize,
  getFileExtension,
  getFileIcon,
  ALLOWED_DOC_MIME_TYPES,
  ALLOWED_DOC_EXTENSIONS,
  MAX_DOC_FILE_SIZE,
} from '@/types/document';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  createDocument,
  deleteDocument,
  archiveDocument,
  unarchiveDocument,
  logDocumentDownload,
} from '@/app/actions/documents';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface DocumentManagerProps {
  documents: DocumentWithUploader[];
  entityType: string;
  entityId: string;
  canManage: boolean;
  showArchiveToggle?: boolean;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getIcon(mimeType: string | null, name: string) {
  const icon = getFileIcon(mimeType, name);
  switch (icon) {
    case 'Image':
      return ImageIcon;
    case 'FileText':
      return FileText;
    case 'Sheet':
      return Sheet;
    case 'FileType':
      return FileType;
    default:
      return File;
  }
}

function getFileTypeLabel(mimeType: string | null, name: string): string {
  const ext = getFileExtension(name).replace('.', '').toUpperCase();
  if (ext) return ext;
  if (mimeType) {
    const label = ALLOWED_DOC_MIME_TYPES[mimeType];
    if (label) return label;
  }
  return 'FILE';
}

export function DocumentManager({
  documents,
  entityType,
  entityId,
  canManage,
  showArchiveToggle = false,
}: DocumentManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate signed URLs for documents
  useEffect(() => {
    async function loadUrls() {
      if (documents.length === 0) return;
      const supabase = createSupabaseBrowserClient();
      const paths = documents
        .filter((d) => d.storage_path)
        .map((d) => d.storage_path!);

      if (paths.length === 0) return;

      const { data, error: err } = await supabase.storage
        .from('documents')
        .createSignedUrls(paths, 3600);

      if (!err && data) {
        const urlMap: Record<string, string> = {};
        for (const item of data) {
          if (item.signedUrl && item.path) {
            const doc = documents.find((d) => d.storage_path === item.path);
            if (doc) urlMap[doc.id] = item.signedUrl;
          }
        }
        setSignedUrls(urlMap);
      }
    }
    loadUrls();
  }, [documents]);

  // Filter documents
  let filtered = documents;
  if (!showArchived) {
    filtered = filtered.filter((d) => !d.archived);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description?.toLowerCase().includes(q) ?? false)
    );
  }
  if (filterType !== 'all') {
    filtered = filtered.filter((d) => {
      const label = getFileTypeLabel(d.mime_type, d.name);
      return label === filterType;
    });
  }

  const fileTypes = Array.from(
    new Set(documents.map((d) => getFileTypeLabel(d.mime_type, d.name)))
  );

  function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) return;

    const ext = getFileExtension(selectedFile.name);
    if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
      setError(
        `Invalid file type. Allowed: ${ALLOWED_DOC_EXTENSIONS.join(', ')}`
      );
      return;
    }

    if (selectedFile.size > MAX_DOC_FILE_SIZE) {
      setError(
        `File too large. Maximum size: ${(MAX_DOC_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`
      );
      return;
    }

    setError(null);
    setFile(selectedFile);
  }

  function resetUpload() {
    setFile(null);
    setDescription('');
    setError(null);
  }

  function handleUploadClose() {
    setUploadOpen(false);
    resetUpload();
  }

  async function handleConfirmUpload() {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      const ext = getFileExtension(file.name);
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}-${randomId}${ext}`;
      const storagePath = `${entityType}/${entityId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        });

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      const result = await createDocument({
        entity_type: entityType as DocumentEntityType,
        entity_id: entityId,
        name: file.name,
        file_url: urlData.publicUrl,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        description: description,
      });

      if (!result.success) {
        // Clean up uploaded file
        await supabase.storage.from('documents').remove([storagePath]);
        setError(result.error);
        setUploading(false);
        return;
      }

      setUploading(false);
      handleUploadClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Upload failed unexpectedly'
      );
      setUploading(false);
    }
  }

  function handleDelete(docId: string) {
    startTransition(async () => {
      const result = await deleteDocument(docId);
      if (result.success) router.refresh();
    });
  }

  function handleArchive(docId: string) {
    startTransition(async () => {
      const result = await archiveDocument(docId);
      if (result.success) router.refresh();
    });
  }

  function handleUnarchive(docId: string) {
    startTransition(async () => {
      const result = await unarchiveDocument(docId);
      if (result.success) router.refresh();
    });
  }

  async function handleDownload(doc: DocumentWithUploader) {
    const url = signedUrls[doc.id] || doc.file_url;
    if (!url) return;

    // Log the download
    await logDocumentDownload(doc.id);

    // Open in new tab for viewing/download
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="h-8 pl-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {fileTypes.length > 0 && (
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {fileTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showArchiveToggle && (
            <Button
              variant={showArchived ? 'secondary' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {filtered.length} doc{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description={
            canManage
              ? 'Upload documents, contracts, invoices, or other files.'
              : 'Documents will appear here once uploaded.'
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No documents match your search"
          description="Try a different search term or filter."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => {
            const Icon = getIcon(doc.mime_type, doc.name);
            const url = signedUrls[doc.id] || doc.file_url;
            return (
              <div
                key={doc.id}
                className={`group relative rounded-lg border p-4 transition hover:shadow-sm ${
                  doc.archived ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      title={doc.name}
                    >
                      {doc.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {getFileTypeLabel(doc.mime_type, doc.name)}
                      </Badge>
                      <span>{formatFileSize(doc.file_size)}</span>
                      {doc.archived && (
                        <Badge variant="secondary" className="text-[10px]">
                          Archived
                        </Badge>
                      )}
                    </div>
                    {doc.description && (
                      <p
                        className="mt-1.5 truncate text-xs text-muted-foreground"
                        title={doc.description}
                      >
                        {doc.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{formatDate(doc.created_at)}</span>
                      {doc.uploader_name && (
                        <>
                          <span>·</span>
                          <span>{doc.uploader_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleDownload(doc)}
                    disabled={!url}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  {canManage && (
                    <>
                      {!doc.archived ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleArchive(doc.id)}
                          disabled={isPending}
                        >
                          <Archive className="mr-1 h-3 w-3" />
                          Archive
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleUnarchive(doc.id)}
                          disabled={isPending}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Restore
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            disabled={isPending}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure? This will permanently delete &ldquo;
                              {doc.name}&rdquo; and remove the file from
                              storage.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(doc.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/30 p-8 transition hover:border-primary hover:bg-primary/5"
              >
                <Paperclip className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium">Choose a file</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ALLOWED_DOC_EXTENSIONS.join(', ')} up to{' '}
                    {(MAX_DOC_FILE_SIZE / 1024 / 1024).toFixed(0)}MB
                  </p>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {(() => {
                      const Icon = getIcon(file.type, file.name);
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} ·{' '}
                      {getFileTypeLabel(file.type, file.name)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetUpload}
                    className="h-7 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-description">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="doc-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Add a description..."
                  />
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_DOC_EXTENSIONS.join(',')}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleUploadClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={!file || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
