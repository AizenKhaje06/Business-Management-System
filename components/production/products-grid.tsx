'use client';

import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreateProductModal } from './create-product-modal';
import { ProductDetailModal } from './product-detail-modal';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import type { ProductCatalog, ProductCategory } from '@/types/production';

interface ProductsGridProps {
  products: ProductCatalog[];
  categories: ProductCategory[];
  canCreate: boolean;
  canEdit: boolean;
}

export function ProductsGrid({ products, categories, canCreate, canEdit }: ProductsGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category_id === selectedCategory);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '—';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Category Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => {
          const count = products.filter((p) => p.category_id === category.id).length;
          const isSelected = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(isSelected ? 'all' : category.id)}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
                isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-accent'
              }`}
            >
              <div className={`rounded-lg p-2 ${isSelected ? 'bg-primary/10' : 'bg-primary/5'}`}>
                <Package className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <div className="font-medium">{category.name}</div>
                <div className="text-sm text-muted-foreground">{count} products</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Category:</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canCreate && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No products found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedCategory === 'all'
                ? 'Get started by creating your first product.'
                : 'No products in this category yet.'}
            </p>
            {canCreate && (
              <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group overflow-hidden rounded-lg border bg-card text-left transition-all hover:shadow-lg"
            >
              {/* Product Image */}
              <div 
                className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (product.image_url) {
                    setLightboxImage({ src: product.image_url, alt: product.name });
                  }
                }}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute right-2 top-2 flex flex-col gap-1">
                  {product.is_active ? (
                    <Badge variant="secondary" className="bg-green-500/90 text-white">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-500/90 text-white">
                      Inactive
                    </Badge>
                  )}
                  {product.is_customizable && (
                    <Badge variant="secondary" className="bg-blue-500/90 text-white">
                      Customizable
                    </Badge>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <button
                onClick={() => setSelectedProductId(product.id)}
                className="w-full space-y-2 p-4 text-left"
              >
                <div>
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {getCategoryName(product.category_id)}
                  </p>
                </div>

                {product.sku && (
                  <code className="text-xs text-muted-foreground">
                    {product.sku}
                  </code>
                )}

                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="flex items-baseline justify-between pt-2">
                  <div className="text-xl font-bold text-primary">
                    {formatPrice(product.base_price)}
                  </div>
                  {product.estimated_production_hours && (
                    <div className="text-xs text-muted-foreground">
                      {product.estimated_production_hours}h
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredProducts.length} of {products.length} products
      </div>

      {/* Create Product Modal */}
      <CreateProductModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        categories={categories}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        open={selectedProductId !== null}
        onOpenChange={(open) => !open && setSelectedProductId(null)}
        categories={categories}
        canEdit={canEdit}
      />

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          open={lightboxImage !== null}
          onOpenChange={(open) => !open && setLightboxImage(null)}
        />
      )}
    </div>
  );
}
