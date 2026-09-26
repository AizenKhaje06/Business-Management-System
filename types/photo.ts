import type { ID, ISODateString } from './base';

export type PhotoType =
  | 'receipt'
  | 'invoice'
  | 'material'
  | 'delivery'
  | 'project_site'
  | 'before_work'
  | 'during_work'
  | 'after_work'
  | 'product'
  | 'document'
  | 'other';

export interface Photo {
  id: ID;
  entity_type: string;
  entity_id: ID;
  project_id: ID | null;
  expense_id: ID | null;
  photo_type: PhotoType;
  name: string;
  file_url: string;
  thumbnail_url: string | null;
  file_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  caption: string | null;
  uploaded_by: ID | null;
  created_at: ISODateString;
}

export interface PhotoWithUploader extends Photo {
  uploader_email: string | null;
  uploader_name: string | null;
}

export interface CreatePhotoInput {
  entity_type: string;
  entity_id: ID;
  project_id?: ID | null;
  expense_id?: ID | null;
  photo_type: PhotoType;
  name: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  caption?: string;
}

export const photoTypeLabels: Record<PhotoType, string> = {
  receipt: 'Receipt',
  invoice: 'Invoice',
  material: 'Material',
  delivery: 'Delivery',
  project_site: 'Project Site',
  before_work: 'Before Work',
  during_work: 'During Work',
  after_work: 'After Work',
  product: 'Product',
  document: 'Document',
  other: 'Other',
};

export const photoTypeIcons: Record<PhotoType, string> = {
  receipt: 'Receipt',
  invoice: 'FileText',
  material: 'Package',
  delivery: 'Truck',
  project_site: 'MapPin',
  before_work: 'Camera',
  during_work: 'Camera',
  after_work: 'Camera',
  product: 'Package',
  document: 'FileText',
  other: 'Image',
};

export const photoTypeColors: Record<PhotoType, string> = {
  receipt: 'bg-amber-100 text-amber-700',
  invoice: 'bg-blue-100 text-blue-700',
  material: 'bg-teal-100 text-teal-700',
  delivery: 'bg-purple-100 text-purple-700',
  project_site: 'bg-green-100 text-green-700',
  before_work: 'bg-cyan-100 text-cyan-700',
  during_work: 'bg-cyan-100 text-cyan-700',
  after_work: 'bg-cyan-100 text-cyan-700',
  product: 'bg-indigo-100 text-indigo-700',
  document: 'bg-gray-100 text-gray-700',
  other: 'bg-gray-100 text-gray-700',
};

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
