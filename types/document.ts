import type { ID, ISODateString } from './base';

export type DocumentEntityType =
  | 'client'
  | 'project'
  | 'expense'
  | 'supplier'
  | 'material'
  | 'invoice'
  | 'payment'
  | 'company';

export interface DocumentRecord {
  id: ID;
  entity_type: DocumentEntityType;
  entity_id: ID;
  name: string;
  file_url: string;
  file_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  description: string | null;
  archived: boolean;
  archived_at: ISODateString | null;
  uploaded_by: ID | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface DocumentWithUploader extends DocumentRecord {
  uploader_email: string | null;
  uploader_name: string | null;
}

export interface CreateDocumentInput {
  entity_type: DocumentEntityType;
  entity_id: ID;
  name: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  description?: string;
}

export const ALLOWED_DOC_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/csv': 'CSV',
};

export const MAX_DOC_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const ALLOWED_DOC_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.docx',
  '.xlsx',
  '.csv',
];

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : '';
}

export function getFileIcon(mimeType: string | null, filename: string): string {
  const ext = getFileExtension(filename);
  if (mimeType?.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return 'Image';
  }
  if (mimeType === 'application/pdf' || ext === '.pdf') return 'FileText';
  if (mimeType?.includes('spreadsheet') || ext === '.xlsx' || ext === '.csv') return 'Sheet';
  if (mimeType?.includes('wordprocessing') || ext === '.docx') return 'FileType';
  return 'File';
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
