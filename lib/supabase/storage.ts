/**
 * Supabase Storage Helper Functions
 * Handle file uploads to Supabase Storage buckets
 */

import { createSupabaseServerClient } from './server';

/**
 * Upload a product image to Supabase Storage
 * @param file - The file to upload
 * @param productId - The product ID for naming the file
 * @returns Public URL of the uploaded image or null on error
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a product image from Supabase Storage
 * @param imageUrl - The full public URL of the image to delete
 * @returns Success boolean
 */
export async function deleteProductImage(
  imageUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();

    // Extract file path from URL
    // Example: https://xxx.supabase.co/storage/v1/object/public/product-images/product_123.jpg
    const match = imageUrl.match(/product-images\/(.+)$/);
    if (!match) {
      return { success: false, error: 'Invalid image URL' };
    }

    const filePath = match[1];

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Delete failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Upload image from base64 data URL
 * @param base64Data - Base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @param productId - The product ID for naming the file
 * @returns Public URL of the uploaded image or null on error
 */
export async function uploadProductImageFromBase64(
  base64Data: string,
  productId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();

    // Determine file extension from mime type
    const mimeType = blob.type;
    const extension = mimeType.split('/')[1] || 'jpg';

    // Create File object
    const file = new File([blob], `product_${productId}.${extension}`, {
      type: mimeType,
    });

    // Upload using the regular upload function
    return uploadProductImage(file, productId);
  } catch (error) {
    console.error('Base64 conversion failed:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Conversion failed',
    };
  }
}
