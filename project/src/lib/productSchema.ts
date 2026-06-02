import { supabase } from './supabase';

export type ProductKind = 'digital_product' | 'digital_service';
export type ProductDeliveryMode = 'instant' | 'manual';

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  digital_product: 'منتج رقمي',
  digital_service: 'خدمة رقمية',
};

export const PRODUCT_DELIVERY_MODE_LABELS: Record<ProductDeliveryMode, string> = {
  instant: 'فوري بعد الدفع',
  manual: 'يتم العمل عليه بعد الشراء',
};

interface ProductSchemaCache {
  merchantColumn: string | null;
  lastChecked: number;
  columns: string[];
}

let schemaCache: ProductSchemaCache | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const FALLBACK_PRODUCT_COLUMNS = [
  'id',
  'title',
  'name',
  'product_name',
  'description',
  'details',
  'price',
  'amount',
  'visibility',
  'is_active',
  'store_id',
  'user_id',
  'merchant_id',
  'seller_id',
  'currency',
  'product_kind',
  'delivery_mode',
  'service_delivery_days',
  'service_revisions_count',
  'service_requirements_note',
  'quantity_limit',
  'quantity_sold',
  'views_count',
  'sales_count',
  'created_at',
  'updated_at',
];

export function normalizeProductKind(value: unknown): ProductKind {
  const normalized = String(value || '').trim();

  if (normalized === 'digital_service') {
    return 'digital_service';
  }

  return 'digital_product';
}

export function normalizeProductDeliveryMode(
  value: unknown,
  productKind?: unknown
): ProductDeliveryMode {
  const kind = normalizeProductKind(productKind);

  if (kind === 'digital_service') {
    return 'manual';
  }

  const normalized = String(value || '').trim();

  if (normalized === 'manual') {
    return 'manual';
  }

  return 'instant';
}

export function isDigitalServiceProduct(value: unknown): boolean {
  return normalizeProductKind(value) === 'digital_service';
}

export function clearProductSchemaCache() {
  schemaCache = null;
}

async function detectProductColumns(): Promise<string[]> {
  if (schemaCache && Date.now() - schemaCache.lastChecked < CACHE_DURATION) {
    if (import.meta.env.DEV) {
      console.log('📦 Using cached product columns:', schemaCache.columns);
    }

    return schemaCache.columns;
  }

  console.group('🔍 Detecting Products Table Columns');

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (error) {
      console.error('⚠️ Error fetching products table columns:', error);
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      console.error('Error Details:', error.details);
      console.error('Error Hint:', error.hint);
      console.warn('Falling back to default product columns');

      schemaCache = {
        merchantColumn: 'user_id',
        lastChecked: Date.now(),
        columns: FALLBACK_PRODUCT_COLUMNS,
      };

      console.groupEnd();
      return FALLBACK_PRODUCT_COLUMNS;
    }

    let availableColumns: string[] = [];

    if (data && data.length > 0) {
      availableColumns = Object.keys(data[0]);
      console.log('✅ Products table has existing rows');
      console.log('Available columns:', availableColumns);
    } else {
      console.warn('⚠️ Products table is empty, using fallback column list');
      availableColumns = FALLBACK_PRODUCT_COLUMNS;
    }

    let merchantColumn: string | null = null;

    if (availableColumns.includes('merchant_id')) {
      merchantColumn = 'merchant_id';
    } else if (availableColumns.includes('user_id')) {
      merchantColumn = 'user_id';
    } else if (availableColumns.includes('seller_id')) {
      merchantColumn = 'seller_id';
    }

    schemaCache = {
      merchantColumn,
      lastChecked: Date.now(),
      columns: availableColumns,
    };

    console.log('✅ Detected merchant column:', merchantColumn);
    console.groupEnd();

    return availableColumns;
  } catch (error) {
    console.error('❌ Exception in detectProductColumns:', error);

    schemaCache = {
      merchantColumn: 'user_id',
      lastChecked: Date.now(),
      columns: FALLBACK_PRODUCT_COLUMNS,
    };

    console.groupEnd();
    return FALLBACK_PRODUCT_COLUMNS;
  }
}

export async function detectProductMerchantColumn(): Promise<string | null> {
  if (schemaCache && Date.now() - schemaCache.lastChecked < CACHE_DURATION) {
    if (import.meta.env.DEV) {
      console.log('📦 Using cached merchant column:', schemaCache.merchantColumn);
    }

    return schemaCache.merchantColumn;
  }

  const availableColumns = await detectProductColumns();

  let merchantColumn: string | null = null;

  if (availableColumns.includes('merchant_id')) {
    merchantColumn = 'merchant_id';
  } else if (availableColumns.includes('user_id')) {
    merchantColumn = 'user_id';
  } else if (availableColumns.includes('seller_id')) {
    merchantColumn = 'seller_id';
  }

  if (!merchantColumn) {
    console.error('❌ No valid merchant column found in products table');
    console.error('Available columns:', availableColumns);
    console.error('Expected one of: merchant_id, user_id, seller_id');
  }

  schemaCache = {
    merchantColumn,
    lastChecked: Date.now(),
    columns: availableColumns,
  };

  return merchantColumn;
}

export async function detectProductSchemaColumns(): Promise<string[]> {
  return detectProductColumns();
}
