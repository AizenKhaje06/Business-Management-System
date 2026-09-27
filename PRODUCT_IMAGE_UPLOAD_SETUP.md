# Product Image Upload - Supabase Storage Setup

## Overview
Product images are now stored in **Supabase Storage** instead of base64 in the database. This provides better performance, scalability, and proper image management.

---

## Database Migration

### Migration File: `supabase/migrations/20260927000003_create_product_images_storage.sql`

**What it does:**
1. ✅ Creates `product-images` storage bucket
2. ✅ Sets 5MB file size limit
3. ✅ Allows only image formats: JPEG, JPG, PNG, WebP, GIF
4. ✅ Public bucket (images are publicly accessible via URL)

**Storage Policies:**
- ✅ **Public Read**: Anyone can view product images
- ✅ **Authenticated Upload**: Logged-in users can upload images
- ✅ **Permission-based Update**: Users with `inventory.edit` can update images
- ✅ **Permission-based Delete**: Users with `inventory.delete` can delete images

**Automatic Cleanup:**
- ✅ Trigger to delete old image when product image is updated
- ✅ Trigger to delete image when product is deleted

---

## Helper Functions

### Client-side: `lib/supabase/storage-client.ts`

**Functions:**
1. `uploadProductImage(file, productId)` - Upload File object
2. `deleteProductImage(imageUrl)` - Delete image by URL
3. `uploadProductImageFromBase64(base64Data, productId)` - Upload from base64/data URL

**Used in:**
- ✅ Create Product Modal
- ✅ Edit Product Modal (Product Detail Modal)

### Server-side: `lib/supabase/storage.ts`

Same functions but for server-side usage (e.g., API routes, server actions).

---

## How It Works

### Creating a Product with Image:

1. User selects/captures image → stored in state as base64 preview
2. Product is created in database **without** image_url
3. If image exists, upload to Supabase Storage
4. Storage returns public URL
5. Update product record with image URL
6. Image is accessible via: `https://[project].supabase.co/storage/v1/object/public/product-images/[filename]`

### Updating Product Image:

1. User changes image in edit mode
2. New image uploaded to Supabase Storage
3. Old image automatically deleted (via trigger)
4. Product updated with new image URL

### Image Naming Convention:

```
[productId]_[timestamp].[extension]
```

Example: `550e8400-e29b-41d4-a716-446655440000_1706123456789.jpg`

---

## Running the Migration

### Option 1: Supabase CLI (Recommended)

```bash
# Run migration
supabase db push

# Or if using remote database
supabase db push --linked
```

### Option 2: Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `supabase/migrations/20260927000003_create_product_images_storage.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click **Run**

### Option 3: Manual in Database

Connect to your Supabase database and run the SQL file.

---

## Verifying Setup

After running the migration:

1. **Check Storage Bucket:**
   - Go to Supabase Dashboard → Storage
   - Should see `product-images` bucket
   - Click bucket → should see policies listed

2. **Test Upload:**
   - Create/edit a product in your app
   - Upload an image
   - Check Storage bucket → should see uploaded file
   - Image should display in product card/detail

3. **Test Policies:**
   - Try viewing image URL in browser → should work (public read)
   - Try uploading without login → should fail
   - Try uploading with login → should work

---

## File Size & Format Limits

- **Max Size**: 5MB per image
- **Allowed Formats**: JPEG, JPG, PNG, WebP, GIF
- **Enforced by**: Storage bucket configuration + client-side validation

---

## Benefits vs Base64 Storage

| Feature | Base64 (Old) | Supabase Storage (New) |
|---------|--------------|------------------------|
| Performance | ❌ Slow (large DB records) | ✅ Fast (CDN-delivered) |
| Database Size | ❌ Grows rapidly | ✅ Minimal (only URLs stored) |
| Image Optimization | ❌ None | ✅ Can add transforms |
| Backup/Export | ❌ Difficult | ✅ Easy (separate bucket) |
| Caching | ❌ Poor | ✅ Built-in CDN caching |
| File Management | ❌ Manual | ✅ Automatic cleanup |

---

## Troubleshooting

### Images not uploading?
- Check if storage bucket exists in Supabase Dashboard
- Verify user is authenticated
- Check browser console for errors
- Ensure file size < 5MB

### Images not displaying?
- Check if image URL is valid (starts with https://)
- Verify storage bucket is public
- Check storage policies are active

### Old migration already applied?
- Migration uses `ON CONFLICT DO NOTHING` - safe to re-run
- Check if bucket exists: Dashboard → Storage

### Permission errors?
- Verify user has `inventory.edit` permission
- Check role policies in migration

---

## Next Steps (Optional Enhancements)

1. **Image Optimization**: Add image resizing/compression
2. **Multiple Images**: Support image gallery per product
3. **Image CDN**: Use Supabase Image Transformations API
4. **Thumbnail Generation**: Auto-generate thumbnails for cards
5. **Upload Progress**: Show upload progress bar

---

## Migration Checklist

- [x] Create storage bucket migration file
- [x] Create client-side storage helper
- [x] Create server-side storage helper
- [x] Update create product modal
- [x] Update edit product modal
- [x] Add automatic image cleanup triggers
- [ ] Run migration on Supabase
- [ ] Test image upload
- [ ] Test image display
- [ ] Test image update
- [ ] Test image deletion

---

## Summary

Product image upload is now fully integrated with Supabase Storage:
- ✅ Proper file storage (not base64 in DB)
- ✅ Public CDN URLs
- ✅ Automatic cleanup
- ✅ Permission-based access
- ✅ 5MB limit with format validation
- ✅ Camera capture support on mobile
- ✅ Upload from file system

**Next Action**: Run the migration in Supabase Dashboard or via CLI!
