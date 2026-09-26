'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { createNotificationsForPermission } from '@/lib/notifications';
import type {
  DocumentWithUploader,
  DocumentEntityType,
  CreateDocumentInput,
} from '@/types/document';

export type DocumentActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

function mapWithUploader(row: Record<string, unknown>): DocumentWithUploader {
  const uploader = row.uploader as unknown as {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  return {
    ...(row as unknown as DocumentWithUploader),
    uploader_email: uploader?.email ?? null,
    uploader_name:
      [uploader?.first_name, uploader?.last_name].filter(Boolean).join(' ') ||
      null,
  };
}

export async function getDocumentsByEntity(
  entityType: DocumentEntityType,
  entityId: string
): Promise<DocumentWithUploader[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('documents')
    .select('*, uploader:profiles(email, first_name, last_name)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  return (data || []).map((row) =>
    mapWithUploader(row as unknown as Record<string, unknown>)
  );
}

export async function getProjectDocuments(
  projectId: string
): Promise<DocumentWithUploader[]> {
  return getDocumentsByEntity('project', projectId);
}

export async function getAllDocuments(params?: {
  search?: string;
  entityType?: DocumentEntityType | 'all';
  archived?: boolean | 'all';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<{
  documents: DocumentWithUploader[];
  total: number;
}> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    entityType = 'all',
    archived = false,
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 20,
  } = params || {};

  let query = supabase
    .from('documents')
    .select('*, uploader:profiles(email, first_name, last_name)', {
      count: 'exact',
    });

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (entityType !== 'all') {
    query = query.eq('entity_type', entityType);
  }

  if (archived !== 'all') {
    query = query.eq('archived', archived);
  }

  query = query.order(sortBy, { ascending: sortDir === 'asc' });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count } = await query;

  const documents = (data || []).map((row) =>
    mapWithUploader(row as unknown as Record<string, unknown>)
  );

  return { documents, total: count || 0 };
}

export async function createDocument(
  input: CreateDocumentInput
): Promise<DocumentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to upload documents.' };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('documents')
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      name: input.name,
      file_url: input.file_url,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      file_size: input.file_size,
      description: input.description || null,
      uploaded_by: ctx.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: ctx.id,
    action: 'upload',
    entity_type: 'document',
    entity_id: data.id,
    entity_name: input.name,
    new_values: {
      name: input.name,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
    } as Record<string, unknown>,
  });

  if (input.entity_type === 'project') {
    revalidatePath(`/projects/${input.entity_id}`);
  }

  await createNotificationsForPermission(
    'invoices.view',
    'document_uploaded',
    'info',
    'New Document Uploaded',
    `Document "${input.name}" was uploaded.`,
    { documentId: data.id, entityType: input.entity_type, entityId: input.entity_id }
  );

  return { success: true, data };
}

export async function deleteDocument(
  documentId: string
): Promise<DocumentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to delete documents.' };
  }

  const supabase = createSupabaseServerClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, entity_type, entity_id, name')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) return { success: false, error: 'Document not found.' };

  // Delete from storage
  if (doc.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError.message);
    }
  }

  // Delete the DB record
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) return { success: false, error: error.message };

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: ctx.id,
    action: 'delete',
    entity_type: 'document',
    entity_id: documentId,
    entity_name: doc.name,
    old_values: {
      name: doc.name,
    } as Record<string, unknown>,
  });

  if (doc.entity_type === 'project') {
    revalidatePath(`/projects/${doc.entity_id}`);
  }
  return { success: true };
}

export async function archiveDocument(
  documentId: string
): Promise<DocumentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to archive documents.' };
  }

  const supabase = createSupabaseServerClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('entity_type, entity_id')
    .eq('id', documentId)
    .maybeSingle();

  const { error } = await supabase
    .from('documents')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('id', documentId);

  if (error) return { success: false, error: error.message };

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: ctx.id,
    action: 'archive',
    entity_type: 'document',
    entity_id: documentId,
  });

  if (doc?.entity_type === 'project') {
    revalidatePath(`/projects/${doc.entity_id}`);
  }
  return { success: true };
}

export async function unarchiveDocument(
  documentId: string
): Promise<DocumentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to unarchive documents.' };
  }

  const supabase = createSupabaseServerClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('entity_type, entity_id')
    .eq('id', documentId)
    .maybeSingle();

  const { error } = await supabase
    .from('documents')
    .update({ archived: false, archived_at: null })
    .eq('id', documentId);

  if (error) return { success: false, error: error.message };

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: ctx.id,
    action: 'update',
    entity_type: 'document',
    entity_id: documentId,
    new_values: { archived: false },
  });

  if (doc?.entity_type === 'project') {
    revalidatePath(`/projects/${doc.entity_id}`);
  }
  return { success: true };
}

export async function logDocumentDownload(
  documentId: string
): Promise<DocumentActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };

  const supabase = createSupabaseServerClient();
  await supabase.from('audit_logs').insert({
    user_id: ctx.id,
    action: 'download',
    entity_type: 'document',
    entity_id: documentId,
  });

  return { success: true };
}
