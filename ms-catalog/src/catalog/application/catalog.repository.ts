import type {
  AvailabilityChangeRecord,
  CatalogProductPage,
  CategoryFields,
  CategoryRecord,
  ProductQuery,
  ProductRecord,
  ProductUpdateInput,
  ProductWriteInput,
} from '../domain/catalog-model.js';

export interface CatalogRepository {
  listCategories(includeInactive: boolean): Promise<CategoryRecord[]>;
  listProducts(query: ProductQuery): Promise<CatalogProductPage>;
  getProduct(id: string): Promise<ProductRecord | null>;
  createCategory(input: CategoryFields): Promise<CategoryRecord>;
  updateCategory(id: string, input: CategoryFields): Promise<CategoryRecord | null>;
  createProduct(input: ProductWriteInput): Promise<ProductRecord>;
  updateProduct(id: string, input: ProductUpdateInput): Promise<ProductRecord | null>;
  setAvailability(input: {
    productId: string;
    available: boolean;
    actorUserId: string;
  }): Promise<ProductRecord | null>;
  listAvailabilityChanges(productId: string): Promise<{
    exists: boolean;
    changes: AvailabilityChangeRecord[];
  }>;
}
