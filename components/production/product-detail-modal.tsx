'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  updateProduct,
  getProductById,
  addProductSpecification,
  deleteProductSpecification,
  addProductMaterial,
  deleteProductMaterial,
  getMaterials,
} from '@/app/actions/production';
import { toast } from 'sonner';
import { Package, DollarSign, Pencil, Plus, Trash2, Upload, Camera, X } from 'lucide-react';
import type { ProductCatalogWithDetails, ProductCategory } from '@/types/production';
import { useRef } from 'react';
import { uploadProductImageFromBase64 } from '@/lib/supabase/storage-client';
import { ImageLightbox } from '@/components/ui/image-lightbox';

const formSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0, 'Price must be 0 or greater').optional(),
  estimated_production_hours: z.coerce.number().min(0).optional(),
  is_customizable: z.boolean().default(false),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
  // Dimensions
  width: z.string().optional(),
  height: z.string().optional(),
  thickness: z.string().optional(),
  dimension_unit: z.string().default('inches'),
  // Wood specifications
  wood_type: z.string().optional(),
  finish: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProductDetailModalProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategory[];
  canEdit: boolean;
}

export function ProductDetailModal({
  productId,
  open,
  onOpenChange,
  categories,
  canEdit,
}: ProductDetailModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [product, setProduct] = useState<ProductCatalogWithDetails | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Specification form
  const [newSpec, setNewSpec] = useState({
    spec_key: '',
    spec_value: '',
    spec_unit: '',
  });

  // Material form
  const [newMaterial, setNewMaterial] = useState({
    material_id: '',
    quantity_required: '',
    unit: 'board_feet',
    waste_factor: '10',
    notes: '',
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: '',
      name: '',
      sku: '',
      description: '',
      base_price: undefined,
      estimated_production_hours: undefined,
      is_customizable: false,
      is_active: true,
      notes: '',
      width: '',
      height: '',
      thickness: '',
      dimension_unit: 'inches',
      wood_type: '',
      finish: '',
    },
  });

  useEffect(() => {
    if (open && productId) {
      loadProduct();
      loadMaterials();
    } else {
      setIsEditMode(false);
      setProduct(null);
      setImagePreview(null);
      setImageFile(null);
    }
  }, [open, productId]);

  const loadMaterials = async () => {
    try {
      const data = await getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const loadProduct = async () => {
    if (!productId) return;

    try {
      const data = await getProductById(productId);
      if (data) {
        setProduct(data);
        setImagePreview(data.image_url || null);
        form.reset({
          category_id: data.category_id,
          name: data.name,
          sku: data.sku || '',
          description: data.description || '',
          base_price: data.base_price || undefined,
          estimated_production_hours: data.estimated_production_hours || undefined,
          is_customizable: data.is_customizable,
          is_active: data.is_active,
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error('Failed to load product details');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!productId) return;

    setIsLoading(true);

    // Upload new image if changed
    let finalImageUrl = product?.image_url || null;
    
    if (imageFile) {
      toast.loading('Compressing and uploading image...', { id: 'image-upload' });
      
      const uploadResult = await uploadProductImageFromBase64(
        imagePreview!,
        productId,
        true // Enable compression
      );

      if (uploadResult.url) {
        finalImageUrl = uploadResult.url;
        
        // Show compression info
        if (uploadResult.compressionRate && uploadResult.compressionRate > 0) {
          toast.success(
            `Image uploaded (${uploadResult.compressionRate}% smaller)`,
            { id: 'image-upload' }
          );
        } else {
          toast.success('Image uploaded successfully', { id: 'image-upload' });
        }
      } else {
        toast.error(uploadResult.error || 'Failed to upload image', {
          id: 'image-upload',
        });
        setIsLoading(false);
        return;
      }
    } else if (imagePreview === null && product?.image_url) {
      // Image was removed
      finalImageUrl = null;
    }

    const result = await updateProduct({
      id: productId,
      category_id: data.category_id,
      name: data.name,
      sku: data.sku || undefined,
      description: data.description || undefined,
      base_price: data.base_price || undefined,
      estimated_production_hours: data.estimated_production_hours || undefined,
      is_customizable: data.is_customizable,
      is_active: data.is_active,
      notes: data.notes || undefined,
      image_url: finalImageUrl || undefined,
    });

    setIsLoading(false);

    if (result.success) {
      toast.success('Product updated successfully');
      setIsEditMode(false);
      setImageFile(null);
      loadProduct();
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update product');
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return 'Not set';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(price);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAddSpecification = async () => {
    if (!productId || !newSpec.spec_key || !newSpec.spec_value) {
      toast.error('Please fill in specification key and value');
      return;
    }

    const result = await addProductSpecification({
      product_id: productId,
      ...newSpec,
    });

    if (result.success) {
      toast.success('Specification added');
      setNewSpec({ spec_key: '', spec_value: '', spec_unit: '' });
      loadProduct();
    } else {
      toast.error(result.error || 'Failed to add specification');
    }
  };

  const handleDeleteSpecification = async (id: string) => {
    const result = await deleteProductSpecification(id);

    if (result.success) {
      toast.success('Specification deleted');
      loadProduct();
    } else {
      toast.error(result.error || 'Failed to delete specification');
    }
  };

  const handleAddMaterial = async () => {
    if (!productId || !newMaterial.material_id || !newMaterial.quantity_required) {
      toast.error('Please select material and enter quantity');
      return;
    }

    const result = await addProductMaterial({
      product_id: productId,
      material_id: newMaterial.material_id,
      quantity_required: parseFloat(newMaterial.quantity_required),
      unit: newMaterial.unit,
      waste_factor: parseFloat(newMaterial.waste_factor) || 0,
      notes: newMaterial.notes || undefined,
    });

    if (result.success) {
      toast.success('Material added to BOM');
      setNewMaterial({
        material_id: '',
        quantity_required: '',
        unit: 'board_feet',
        waste_factor: '10',
        notes: '',
      });
      loadProduct();
    } else {
      toast.error(result.error || 'Failed to add material');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    const result = await deleteProductMaterial(id);

    if (result.success) {
      toast.success('Material removed from BOM');
      loadProduct();
    } else {
      toast.error(result.error || 'Failed to remove material');
    }
  };

  if (!product) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Edit product details' : 'View product information'}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {product.is_active ? (
                <Badge variant="secondary">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
              {product.is_customizable && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Customizable
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="materials">Materials (BOM)</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {!isEditMode ? (
              // View Mode
              <div className="space-y-4">
                {/* Product Image */}
                {product.image_url && (
                  <div 
                    className="overflow-hidden rounded-lg cursor-pointer group relative"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-64 w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-center">
                        <Package className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm font-medium">Click to view full size</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">SKU</div>
                    <div className="mt-1">
                      {product.sku ? (
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {product.sku}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Category</div>
                    <div className="mt-1 font-medium">{product.category.name}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Base Price</div>
                    <div className="mt-1 text-lg font-bold">
                      {formatPrice(product.base_price)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Production Hours
                    </div>
                    <div className="mt-1 font-medium">
                      {product.estimated_production_hours
                        ? `${product.estimated_production_hours} hours`
                        : 'Not specified'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Description</div>
                  <div className="mt-1">
                    {product.description || (
                      <span className="text-muted-foreground">No description provided</span>
                    )}
                  </div>
                </div>

                {product.notes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Notes</div>
                    <div className="mt-1 text-sm">{product.notes}</div>
                  </div>
                )}

                {canEdit && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsEditMode(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Product
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Edit Mode
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Product Image Upload */}
                  <div className="space-y-2">
                    <FormLabel>Product Image</FormLabel>
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Product preview"
                          className="h-48 w-full rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-32 w-full"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm">Upload Image</span>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-32 w-full"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Camera className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm">Take Photo</span>
                          </div>
                        </Button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max file size: 5MB. Supported formats: JPG, PNG, WebP
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dimensions Section */}
                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="text-sm font-medium">Dimensions (Standard Size)</h4>
                    
                    <div className="grid gap-4 sm:grid-cols-4">
                      <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width</FormLabel>
                            <FormControl>
                              <Input placeholder="36" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height</FormLabel>
                            <FormControl>
                              <Input placeholder="80" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="thickness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thickness</FormLabel>
                            <FormControl>
                              <Input placeholder="1.75" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dimension_unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="inches">Inches</SelectItem>
                                <SelectItem value="cm">Centimeters</SelectItem>
                                <SelectItem value="mm">Millimeters</SelectItem>
                                <SelectItem value="feet">Feet</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Wood Specifications Section */}
                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="text-sm font-medium">Wood Specifications</h4>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="wood_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wood Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Not specified</SelectItem>
                                <SelectItem value="Mahogany">Mahogany</SelectItem>
                                <SelectItem value="Narra">Narra</SelectItem>
                                <SelectItem value="Oak">Oak</SelectItem>
                                <SelectItem value="Molave">Molave</SelectItem>
                                <SelectItem value="Kamagong">Kamagong (Ironwood)</SelectItem>
                                <SelectItem value="Acacia">Acacia</SelectItem>
                                <SelectItem value="Dao">Dao</SelectItem>
                                <SelectItem value="Yakal">Yakal</SelectItem>
                                <SelectItem value="Pine">Pine</SelectItem>
                                <SelectItem value="Teak">Teak</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="finish"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Finish</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Not specified</SelectItem>
                                <SelectItem value="Natural Stain">Natural Stain</SelectItem>
                                <SelectItem value="Dark Stain">Dark Stain</SelectItem>
                                <SelectItem value="Light Stain">Light Stain</SelectItem>
                                <SelectItem value="Varnish">Varnish</SelectItem>
                                <SelectItem value="Lacquer">Lacquer</SelectItem>
                                <SelectItem value="Oil Finish">Oil Finish</SelectItem>
                                <SelectItem value="Painted">Painted</SelectItem>
                                <SelectItem value="Unfinished">Unfinished</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="base_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (₱)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_production_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Production Hours</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_customizable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Customizable</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditMode(false);
                        form.reset();
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </TabsContent>

          <TabsContent value="specifications" className="space-y-4">
            {isEditMode && (
              <div className="rounded-lg border border-dashed p-4">
                <h4 className="mb-3 text-sm font-medium">Add Specification</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder="Key (e.g., width)"
                    value={newSpec.spec_key}
                    onChange={(e) =>
                      setNewSpec({ ...newSpec, spec_key: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Value (e.g., 36)"
                    value={newSpec.spec_value}
                    onChange={(e) =>
                      setNewSpec({ ...newSpec, spec_value: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Unit (optional)"
                      value={newSpec.spec_unit}
                      onChange={(e) =>
                        setNewSpec({ ...newSpec, spec_unit: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddSpecification}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {product.specifications && product.specifications.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {product.specifications.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        {spec.spec_key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                      <div className="mt-1 font-medium">
                        {spec.spec_value}
                        {spec.spec_unit && (
                          <span className="ml-1 text-sm text-muted-foreground">
                            {spec.spec_unit}
                          </span>
                        )}
                      </div>
                    </div>
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteSpecification(spec.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                {isEditMode
                  ? 'Add specifications using the form above'
                  : 'No specifications defined'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            {isEditMode && (
              <div className="rounded-lg border border-dashed p-4">
                <h4 className="mb-3 text-sm font-medium">Add Material (BOM)</h4>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      value={newMaterial.material_id}
                      onValueChange={(value) =>
                        setNewMaterial({ ...newMaterial, material_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.name}
                            {material.wood_species && ` (${material.wood_species})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={newMaterial.quantity_required}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          quantity_required: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select
                      value={newMaterial.unit}
                      onValueChange={(value) =>
                        setNewMaterial({ ...newMaterial, unit: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="board_feet">Board Feet</SelectItem>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="sheets">Sheets</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="Waste %"
                      value={newMaterial.waste_factor}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          waste_factor: e.target.value,
                        })
                      }
                    />

                    <Button type="button" onClick={handleAddMaterial}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  <Input
                    placeholder="Notes (optional)"
                    value={newMaterial.notes}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, notes: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {product.materials && product.materials.length > 0 ? (
              <div className="space-y-3">
                {product.materials.map((bom) => (
                  <div
                    key={bom.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{bom.material.name}</div>
                      {bom.material.wood_species && (
                        <div className="text-sm text-muted-foreground">
                          {bom.material.wood_species}
                        </div>
                      )}
                      {bom.notes && (
                        <div className="text-sm text-muted-foreground">{bom.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">
                          {bom.quantity_required} {bom.unit}
                        </div>
                        {bom.waste_factor > 0 && (
                          <div className="text-xs text-muted-foreground">
                            +{bom.waste_factor}% waste
                          </div>
                        )}
                      </div>
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteMaterial(bom.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                {isEditMode
                  ? 'Add materials using the form above'
                  : 'No materials (BOM) defined'}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Image Lightbox */}
        {product.image_url && (
          <ImageLightbox
            src={product.image_url}
            alt={product.name}
            open={isLightboxOpen}
            onOpenChange={setIsLightboxOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
