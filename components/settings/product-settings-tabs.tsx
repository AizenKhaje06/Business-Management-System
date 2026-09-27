'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WoodTypesTable } from './wood-types-table';
import { WoodFinishesTable } from './wood-finishes-table';
import { MaterialCategoriesTable } from './material-categories-table';
import { ProductCategoriesInfo } from './product-categories-info';
import type {
  WoodType,
  WoodFinish,
  MaterialCategory,
} from '@/types/product-settings';
import type { ProductCategory } from '@/types/production';

interface ProductSettingsTabsProps {
  woodTypes: WoodType[];
  finishes: WoodFinish[];
  materialCategories: MaterialCategory[];
  productCategories: ProductCategory[];
}

export function ProductSettingsTabs({
  woodTypes,
  finishes,
  materialCategories,
  productCategories,
}: ProductSettingsTabsProps) {
  return (
    <Tabs defaultValue="wood-types" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="wood-types">Wood Types</TabsTrigger>
        <TabsTrigger value="finishes">Finishes</TabsTrigger>
        <TabsTrigger value="material-categories">Material Categories</TabsTrigger>
        <TabsTrigger value="product-categories">Product Categories</TabsTrigger>
      </TabsList>

      <TabsContent value="wood-types">
        <WoodTypesTable woodTypes={woodTypes} />
      </TabsContent>

      <TabsContent value="finishes">
        <WoodFinishesTable finishes={finishes} />
      </TabsContent>

      <TabsContent value="material-categories">
        <MaterialCategoriesTable categories={materialCategories} />
      </TabsContent>

      <TabsContent value="product-categories">
        <ProductCategoriesInfo categories={productCategories} />
      </TabsContent>
    </Tabs>
  );
}
