'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import { createNotificationsForPermission } from '@/lib/notifications';
import type {
  Photo,
  PhotoWithUploader,
  PhotoType,
  CreatePhotoInput,
} from '@/types/photo';

export type PhotoActionResult =
  { success: true; data?: unknown } | { success: false; error: string };

export async function getProjectPhotos(
  projectId: string
): Promise<PhotoWithUploader[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('photos')
    .select('*, uploader:profiles(email, first_name, last_name)')
    .or(
      `entity_type.eq.project,entity_id.eq.${projectId},project_id.eq.${projectId}`
    )
    .order('created_at', { ascending: false });

  return (data || []).map((row) => {
    const uploader = row.uploader as unknown as {
      email: string;
      first_name: string | null;
      last_name: string | null;
    } | null;
    return {
      ...row,
      uploader_email: uploader?.email ?? null,
      uploader_name:
        [uploader?.first_name, uploader?.last_name].filter(Boolean).join(' ') ||
        null,
    } as PhotoWithUploader;
  });
}

export async function getPhotosByEntity(
  entityType: string,
  entityId: string
): Promise<PhotoWithUploader[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('photos')
    .select('*, uploader:profiles(email, first_name, last_name)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  return (data || []).map((row) => {
    const uploader = row.uploader as unknown as {
      email: string;
      first_name: string | null;
      last_name: string | null;
    } | null;
    return {
      ...row,
      uploader_email: uploader?.email ?? null,
      uploader_name:
        [uploader?.first_name, uploader?.last_name].filter(Boolean).join(' ') ||
        null,
    } as PhotoWithUploader;
  });
}

export async function createPhoto(
  input: CreatePhotoInput
): Promise<PhotoActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to upload photos.' };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('photos')
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      project_id: input.project_id || null,
      expense_id: input.expense_id || null,
      photo_type: input.photo_type,
      name: input.name,
      file_url: input.file_url,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      file_size: input.file_size,
      caption: input.caption || null,
      uploaded_by: ctx.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/projects/${input.project_id}`);
  await logAuditForCurrentUser(ctx.id, 'upload', 'photo', {
    entityId: data.id,
    entityName: input.name,
  });

  await createNotificationsForPermission(
    'invoices.view',
    'photo_uploaded',
    'info',
    'New Photo Uploaded',
    `A new photo "${input.name}" was uploaded to a project.`,
    { photoId: data.id, projectId: input.project_id }
  );

  return { success: true, data };
}

export async function deletePhoto(photoId: string): Promise<PhotoActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to delete photos.' };
  }

  const supabase = createSupabaseServerClient();

  // Get the photo to find its storage path and project_id for revalidation
  const { data: photo } = await supabase
    .from('photos')
    .select('storage_path, project_id, entity_type, entity_id')
    .eq('id', photoId)
    .maybeSingle();

  if (!photo) return { success: false, error: 'Photo not found.' };

  // Delete from storage if path exists
  if (photo.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('company')
      .remove([photo.storage_path]);

    if (storageError) {
      // Log but don't block — the DB record is the source of truth
      console.error('Storage delete error:', storageError.message);
    }
  }

  // Delete the DB record
  const { error } = await supabase.from('photos').delete().eq('id', photoId);

  if (error) return { success: false, error: error.message };

  if (photo.project_id) {
    revalidatePath(`/projects/${photo.project_id}`);
  }
  await logAuditForCurrentUser(ctx.id, 'delete', 'photo', {
    entityId: photoId,
  });
  return { success: true };
}

export async function updatePhotoCaption(
  photoId: string,
  caption: string
): Promise<PhotoActionResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false, error: 'Not authenticated.' };
  if (!ctx.permissions.includes('invoices.edit')) {
    return { success: false, error: 'You do not have permission to edit photos.' };
  }

  const supabase = createSupabaseServerClient();

  const { data: photo } = await supabase
    .from('photos')
    .select('project_id')
    .eq('id', photoId)
    .maybeSingle();

  const { error } = await supabase
    .from('photos')
    .update({ caption: caption || null })
    .eq('id', photoId);

  if (error) return { success: false, error: error.message };

  if (photo?.project_id) {
    revalidatePath(`/projects/${photo.project_id}`);
  }
  return { success: true };
}
