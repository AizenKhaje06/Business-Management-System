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
import { updateProduct, getProductById } from '@/app/actions/production';
import { toast } from 'sonner';
import { Package, DollarSign, Pencil } from 'lucide-react';
import type { ProductCatalogWithDetails, ProductCategory } from '@/types/production';

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
    },
  });

  useEffect(() => {
    if (open && productId) {
      loadProduct();
    } else {
      setIsEditMode(false);
      setProduct(null);
    }
  }, [open, productId]);

  const loadProduct = async () => {
    if (!productId) return;

    try {
      const data = await getProductById(productId);
      if (data) {
        setProduct(data);
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
    });

    setIsLoading(false);

    if (result.success) {
      toast.success('Product updated successfully');
      setIsEditMode(false);
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
            {product.specifications && product.specifications.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {product.specifications.map((spec) => (
                  <div key={spec.id} className="rounded-lg border p-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      {spec.spec_key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
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
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No specifications defined
              </div>
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            {product.materials && product.materials.length > 0 ? (
              <div className="space-y-3">
                {product.materials.map((bom) => (
                  <div
                    key={bom.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{bom.material.name}</div>
                      {bom.notes && (
                        <div className="text-sm text-muted-foreground">{bom.notes}</div>
                      )}
                    </div>
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No materials (BOM) defined
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
