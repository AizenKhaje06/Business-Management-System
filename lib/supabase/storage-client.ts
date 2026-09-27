/**
 * Supabase Storage Helper Functions (Client-side)
 * Handle file uploads from browser to Supabase Storage buckets
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { compressImageToFile, formatFileSize, getCompressionRate } from '@/lib/utils/image-compression';

/**
 * Upload a product image to Supabase Storage (Client-side) with compression
 * @param file - The file to upload
 * @param productId - The product ID for naming the file
 * @param compress - Whether to compress the image (default: true)
 * @returns Public URL of the uploaded image or null on error
 */
export async function uploadProductImage(
  file: File,
  productId: string,
  compress: boolean = true
): Promise<{ 
  url: string | null; 
  error: string | null;
  originalSize?: number;
  compressedSize?: number;
  compressionRate?: number;
}> {
  try {
    const supabase = createSupabaseBrowserClient();
    
    let fileToUpload = file;
    let originalSize = file.size;
    let compressedSize = file.size;

    // Compress image if enabled and it's an image file
    if (compress && file.type.startsWith('image/')) {
      try {
        console.log(`Original size: ${formatFileSize(file.size)}`);
        
        fileToUpload = await compressImageToFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8,
          mimeType: 'image/jpeg',
        });
        
        compressedSize = fileToUpload.size;
        const rate = getCompressionRate(originalSize, compressedSize);
        
        console.log(`Compressed size: ${formatFileSize(compressedSize)}`);
        console.log(`Reduction: ${rate}%`);
      } catch (compressionError) {
        console.warn('Compression failed, uploading original:', compressionError);
        // Continue with original file if compression fails
        fileToUpload = file;
      }
    }

    // Generate unique filename
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${productId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, fileToUpload, {
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

    return { 
      url: publicUrl, 
      error: null,
      originalSize,
      compressedSize,
      compressionRate: getCompressionRate(originalSize, compressedSize),
    };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a product image from Supabase Storage (Client-side)
 * @param imageUrl - The full public URL of the image to delete
 * @returns Success boolean
 */
export async function deleteProductImage(
  imageUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createSupabaseBrowserClient();

    // Extract file path from URL
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
 * Upload image from base64 data URL (Client-side) with compression
 * @param base64Data - Base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @param productId - The product ID for naming the file
 * @param compress - Whether to compress the image (default: true)
 * @returns Public URL of the uploaded image or null on error
 */
export async function uploadProductImageFromBase64(
  base64Data: string,
  productId: string,
  compress: boolean = true
): Promise<{ 
  url: string | null; 
  error: string | null;
  originalSize?: number;
  compressedSize?: number;
  compressionRate?: number;
}> {
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

    // Upload using the regular upload function with compression
    return uploadProductImage(file, productId, compress);
  } catch (error) {
    console.error('Base64 conversion failed:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Conversion failed',
    };
  }
}
