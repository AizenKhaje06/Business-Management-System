-- ============================================================================
-- PRODUCT IMAGES STORAGE BUCKET
-- Create storage bucket for product images and set policies
-- ============================================================================

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Policy: Public read access for all product images
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy: Authenticated users can upload product images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.uid() IS NOT NULL
);

-- Policy: Users can update their own uploaded images or if they have inventory.edit permission
CREATE POLICY "Users can update product images with permission"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      JOIN public.role_permissions rp ON r.id = rp.role_id
      JOIN public.permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid()
      AND (
        r.name IN ('owner', 'admin', 'manager') OR
        perm.name = 'inventory.edit'
      )
    )
  )
);

-- Policy: Users can delete product images with permission
CREATE POLICY "Users can delete product images with permission"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      JOIN public.role_permissions rp ON r.id = rp.role_id
      JOIN public.permissions perm ON rp.permission_id = perm.id
      WHERE p.id = auth.uid()
      AND (
        r.name IN ('owner', 'admin', 'manager') OR
        perm.name = 'inventory.delete'
      )
    )
  )
);

-- ============================================================================
-- HELPER FUNCTION: Delete old product image when updating
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_old_product_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If image_url is being updated and old image exists
  IF OLD.image_url IS NOT NULL AND 
     NEW.image_url IS DISTINCT FROM OLD.image_url AND
     OLD.image_url LIKE '%/storage/v1/object/public/product-images/%' THEN
    
    -- Extract the file path from the URL
    -- Example URL: https://xxx.supabase.co/storage/v1/object/public/product-images/product_123.jpg
    DECLARE
      file_path text;
    BEGIN
      file_path := substring(OLD.image_url from 'product-images/(.+)$');
      
      IF file_path IS NOT NULL THEN
        -- Delete the old file from storage
        PERFORM storage.objects
        FROM storage.objects
        WHERE bucket_id = 'product-images' 
        AND name = file_path;
        
        DELETE FROM storage.objects
        WHERE bucket_id = 'product-images' 
        AND name = file_path;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to delete old image when product image is updated
DROP TRIGGER IF EXISTS trigger_delete_old_product_image ON product_catalog;
CREATE TRIGGER trigger_delete_old_product_image
  BEFORE UPDATE OF image_url ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION delete_old_product_image();

-- Trigger to delete image when product is deleted
CREATE OR REPLACE FUNCTION delete_product_image_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.image_url IS NOT NULL AND
     OLD.image_url LIKE '%/storage/v1/object/public/product-images/%' THEN
    
    DECLARE
      file_path text;
    BEGIN
      file_path := substring(OLD.image_url from 'product-images/(.+)$');
      
      IF file_path IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'product-images' 
        AND name = file_path;
      END IF;
    END;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_product_image_on_delete ON product_catalog;
CREATE TRIGGER trigger_delete_product_image_on_delete
  BEFORE DELETE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION delete_product_image_on_delete();
