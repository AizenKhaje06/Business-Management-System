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
import { Switch } from '@/components/ui/switch';
import { createProduct } from '@/app/actions/production';
import { toast } from 'sonner';
import type { ProductCategory } from '@/types/production';

const formSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0, 'Price must be 0 or greater').optional(),
  estimated_production_hours: z.coerce.number().min(0).optional(),
  is_customizable: z.boolean().default(false),
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

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategory[];
}

export function CreateProductModal({
  open,
  onOpenChange,
  categories,
}: CreateProductModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
      notes: '',
      width: '',
      height: '',
      thickness: '',
      dimension_unit: 'inches',
      wood_type: '',
      finish: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    // Build enhanced description with specs
    let enhancedDescription = data.description || '';
    
    const specs = [];
    if (data.width || data.height || data.thickness) {
      const dims = [];
      if (data.width) dims.push(`W: ${data.width}`);
      if (data.height) dims.push(`H: ${data.height}`);
      if (data.thickness) dims.push(`T: ${data.thickness}`);
      specs.push(`Dimensions: ${dims.join(' x ')} ${data.dimension_unit}`);
    }
    if (data.wood_type && data.wood_type !== 'none') {
      specs.push(`Wood: ${data.wood_type}`);
    }
    if (data.finish && data.finish !== 'none') {
      specs.push(`Finish: ${data.finish}`);
    }
    
    if (specs.length > 0) {
      enhancedDescription = enhancedDescription 
        ? `${enhancedDescription}\n\n${specs.join(' | ')}`
        : specs.join(' | ');
    }

    const result = await createProduct({
      category_id: data.category_id,
      name: data.name,
      sku: data.sku || undefined,
      description: enhancedDescription || undefined,
      base_price: data.base_price || undefined,
      estimated_production_hours: data.estimated_production_hours || undefined,
      is_customizable: data.is_customizable,
      notes: data.notes || undefined,
    });

    setIsLoading(false);

    if (result.success && result.data) {
      toast.success('Product created successfully');
      form.reset();
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to create product');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product in the catalog. This will be available for production orders.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
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

            {/* Product Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Solid Wood Main Door" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SKU */}
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., DOOR-MAIN-001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique product code for inventory tracking
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the product, materials, and features..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dimensions Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium">Dimensions (Standard Size)</h3>
              
              <div className="grid gap-4 sm:grid-cols-4">
                {/* Width */}
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

                {/* Height */}
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

                {/* Thickness */}
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

                {/* Unit */}
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
              <h3 className="font-medium">Wood Specifications</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Wood Type */}
                <FormField
                  control={form.control}
                  name="wood_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wood Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wood type" />
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
                      <FormDescription>Default wood for this product</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Finish */}
                <FormField
                  control={form.control}
                  name="finish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finish</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select finish" />
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
                      <FormDescription>Standard finish option</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Base Price */}
              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price (₱)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>In Philippine Pesos</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Production Hours */}
              <FormField
                control={form.control}
                name="estimated_production_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        step="0.5"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Estimated time</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Customizable */}
            <FormField
              control={form.control}
              name="is_customizable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Customizable Product</FormLabel>
                    <FormDescription>
                      Can this product be customized per order? (dimensions, wood type, finish, etc.)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes, special instructions, or production tips..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
