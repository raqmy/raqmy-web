import { supabase } from './supabase';

interface ProductSchemaCache {
  merchantColumn: string | null;
  lastChecked: number;
  columns: string[];
}

let schemaCache: ProductSchemaCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function detectProductMerchantColumn(): Promise<string | null> {
  // Return cached result if still valid
  if (schemaCache && Date.now() - schemaCache.lastChecked < CACHE_DURATION) {
    if (import.meta.env.DEV) {
      console.log('📦 Using cached merchant column:', schemaCache.merchantColumn);
    }
    return schemaCache.merchantColumn;
  }

  console.group('🔍 Detecting Products Table Schema');

  try {
    // Try to fetch one product to detect available columns
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (error) {
      console.error('⚠️ Error fetching products table schema:', error);
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      console.error('Error Details:', error.details);
      console.error('Error Hint:', error.hint);
      console.warn('Falling back to default column: user_id');
      console.groupEnd();
      // Fallback to default
      return 'user_id';
    }

    let availableColumns: string[] = [];

    if (data && data.length > 0) {
      // Extract columns from first row
      availableColumns = Object.keys(data[0]);
      console.log('✅ Products table has existing rows');
      console.log('Available columns:', availableColumns);
    } else {
      // Table is empty, try common columns
      console.warn('⚠️ Products table is empty, using fallback column list');
      availableColumns = ['user_id']; // Safe fallback
    }

    // Priority order: merchant_id -> user_id -> seller_id
    let merchantColumn: string | null = null;

    if (availableColumns.includes('merchant_id')) {
      merchantColumn = 'merchant_id';
      console.log('✅ Using column: merchant_id');
    } else if (availableColumns.includes('user_id')) {
      merchantColumn = 'user_id';
      console.log('✅ Using column: user_id');
    } else if (availableColumns.includes('seller_id')) {
      merchantColumn = 'seller_id';
      console.log('✅ Using column: seller_id');
    }

    if (!merchantColumn) {
      console.error('❌ No valid merchant column found in products table');
      console.error('Available columns:', availableColumns);
      console.error('Expected one of: merchant_id, user_id, seller_id');
    }

    // Cache the result
    schemaCache = {
      merchantColumn,
      lastChecked: Date.now(),
      columns: availableColumns,
    };

    console.groupEnd();
    return merchantColumn;
  } catch (error) {
    console.error('❌ Exception in detectProductMerchantColumn:', error);
    console.groupEnd();
    return 'user_id'; // Safe fallback
  }
}

export function clearProductSchemaCache() {
  schemaCache = null;
}
