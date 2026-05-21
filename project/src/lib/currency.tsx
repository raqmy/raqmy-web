import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

export interface CurrencyRate {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  rate_to_sar: number;
  decimals: number;
  is_active?: boolean;
  display_order?: number;
}

export const DEFAULT_CURRENCY = 'SAR';
export const CURRENCY_STORAGE_KEY = 'raqmy_selected_currency';
export const CURRENCY_CHANGE_EVENT = 'raqmy_currency_changed';

/**
 * أسعار احتياطية تقريبية مقابل الريال السعودي.
 * قاعدة البيانات currency_rates هي المصدر الأساسي، وهذه القيم تستخدم فقط إذا لم تكن القيمة موجودة في الجدول.
 */
export const FALLBACK_CURRENCIES: CurrencyRate[] = [
  { code: 'SAR', name_ar: 'الريال السعودي', name_en: 'Saudi Riyal', symbol: 'ر.س', rate_to_sar: 1, decimals: 2, display_order: 1 },
  { code: 'USD', name_ar: 'الدولار الأمريكي', name_en: 'US Dollar', symbol: '$', rate_to_sar: 3.75, decimals: 2, display_order: 2 },
  { code: 'EUR', name_ar: 'اليورو', name_en: 'Euro', symbol: '€', rate_to_sar: 4.1, decimals: 2, display_order: 3 },
  { code: 'GBP', name_ar: 'الجنيه الإسترليني', name_en: 'British Pound', symbol: '£', rate_to_sar: 4.8, decimals: 2, display_order: 4 },

  { code: 'AED', name_ar: 'الدرهم الإماراتي', name_en: 'UAE Dirham', symbol: 'د.إ', rate_to_sar: 1.02, decimals: 2, display_order: 10 },
  { code: 'KWD', name_ar: 'الدينار الكويتي', name_en: 'Kuwaiti Dinar', symbol: 'د.ك', rate_to_sar: 12.2, decimals: 3, display_order: 11 },
  { code: 'QAR', name_ar: 'الريال القطري', name_en: 'Qatari Riyal', symbol: 'ر.ق', rate_to_sar: 1.03, decimals: 2, display_order: 12 },
  { code: 'BHD', name_ar: 'الدينار البحريني', name_en: 'Bahraini Dinar', symbol: 'د.ب', rate_to_sar: 9.95, decimals: 3, display_order: 13 },
  { code: 'OMR', name_ar: 'الريال العماني', name_en: 'Omani Rial', symbol: 'ر.ع', rate_to_sar: 9.74, decimals: 3, display_order: 14 },

  { code: 'EGP', name_ar: 'الجنيه المصري', name_en: 'Egyptian Pound', symbol: 'ج.م', rate_to_sar: 0.075, decimals: 2, display_order: 20 },
  { code: 'JOD', name_ar: 'الدينار الأردني', name_en: 'Jordanian Dinar', symbol: 'د.أ', rate_to_sar: 5.29, decimals: 3, display_order: 21 },
  { code: 'IQD', name_ar: 'الدينار العراقي', name_en: 'Iraqi Dinar', symbol: 'د.ع', rate_to_sar: 0.0029, decimals: 0, display_order: 22 },
  { code: 'MAD', name_ar: 'الدرهم المغربي', name_en: 'Moroccan Dirham', symbol: 'د.م', rate_to_sar: 0.38, decimals: 2, display_order: 23 },
  { code: 'DZD', name_ar: 'الدينار الجزائري', name_en: 'Algerian Dinar', symbol: 'د.ج', rate_to_sar: 0.028, decimals: 2, display_order: 24 },
  { code: 'TND', name_ar: 'الدينار التونسي', name_en: 'Tunisian Dinar', symbol: 'د.ت', rate_to_sar: 1.2, decimals: 3, display_order: 25 },
  { code: 'LYD', name_ar: 'الدينار الليبي', name_en: 'Libyan Dinar', symbol: 'د.ل', rate_to_sar: 0.78, decimals: 3, display_order: 26 },
  { code: 'SDG', name_ar: 'الجنيه السوداني', name_en: 'Sudanese Pound', symbol: 'ج.س', rate_to_sar: 0.0062, decimals: 2, display_order: 27 },
  { code: 'YER', name_ar: 'الريال اليمني', name_en: 'Yemeni Rial', symbol: 'ر.ي', rate_to_sar: 0.015, decimals: 2, display_order: 28 },
  { code: 'SYP', name_ar: 'الليرة السورية', name_en: 'Syrian Pound', symbol: 'ل.س', rate_to_sar: 0.00029, decimals: 2, display_order: 29 },
  { code: 'LBP', name_ar: 'الليرة اللبنانية', name_en: 'Lebanese Pound', symbol: 'ل.ل', rate_to_sar: 0.000042, decimals: 2, display_order: 30 },
  { code: 'SOS', name_ar: 'الشلن الصومالي', name_en: 'Somali Shilling', symbol: 'Sh.So', rate_to_sar: 0.0066, decimals: 2, display_order: 31 },
  { code: 'DJF', name_ar: 'الفرنك الجيبوتي', name_en: 'Djiboutian Franc', symbol: 'Fdj', rate_to_sar: 0.021, decimals: 0, display_order: 32 },
  { code: 'MRU', name_ar: 'الأوقية الموريتانية', name_en: 'Mauritanian Ouguiya', symbol: 'أ.م', rate_to_sar: 0.094, decimals: 2, display_order: 33 },
  { code: 'KMF', name_ar: 'الفرنك القمري', name_en: 'Comorian Franc', symbol: 'CF', rate_to_sar: 0.0083, decimals: 0, display_order: 34 },
];

const fallbackMap = new Map(FALLBACK_CURRENCIES.map((currency) => [currency.code, currency]));

const normalizeCurrencyCode = (value?: string | null) => {
  const code = String(value || DEFAULT_CURRENCY).trim().toUpperCase();
  return code || DEFAULT_CURRENCY;
};

const readStoredCurrency = () => {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;

  try {
    return normalizeCurrencyCode(localStorage.getItem(CURRENCY_STORAGE_KEY));
  } catch {
    return DEFAULT_CURRENCY;
  }
};

export const mergeCurrencyRatesWithFallbacks = (rows: any[] | null | undefined): CurrencyRate[] => {
  const merged = new Map<string, CurrencyRate>();

  FALLBACK_CURRENCIES.forEach((currency) => {
    merged.set(currency.code, currency);
  });

  (rows || []).forEach((row) => {
    const code = normalizeCurrencyCode(row?.code);
    const fallback = fallbackMap.get(code);
    const rateFromDb = Number(row?.rate_to_sar);
    const safeRate = Number.isFinite(rateFromDb) && rateFromDb > 0 ? rateFromDb : fallback?.rate_to_sar || 1;

    merged.set(code, {
      code,
      name_ar: row?.name_ar || fallback?.name_ar || code,
      name_en: row?.name_en || fallback?.name_en || code,
      symbol: row?.symbol || fallback?.symbol || code,
      rate_to_sar: safeRate,
      decimals:
        Number.isInteger(Number(row?.decimals)) && Number(row?.decimals) >= 0
          ? Number(row?.decimals)
          : fallback?.decimals ?? 2,
      is_active: row?.is_active ?? true,
      display_order:
        Number.isFinite(Number(row?.display_order))
          ? Number(row?.display_order)
          : fallback?.display_order ?? 999,
    });
  });

  return Array.from(merged.values())
    .filter((currency) => currency.is_active !== false)
    .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
};

export const getCurrencyByCode = (
  currencies: CurrencyRate[],
  code?: string | null
): CurrencyRate => {
  const normalized = normalizeCurrencyCode(code);
  return currencies.find((currency) => currency.code === normalized) || fallbackMap.get(normalized) || fallbackMap.get(DEFAULT_CURRENCY)!;
};

export const getProductPriceInSar = (
  amount: number | string | null | undefined,
  productCurrency: string | null | undefined,
  currencies: CurrencyRate[]
) => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return 0;

  const sourceCurrency = getCurrencyByCode(currencies, productCurrency || DEFAULT_CURRENCY);
  return value * sourceCurrency.rate_to_sar;
};

export const convertProductPrice = (
  amount: number | string | null | undefined,
  productCurrency: string | null | undefined,
  displayCurrency: string | null | undefined,
  currencies: CurrencyRate[]
) => {
  const sarValue = getProductPriceInSar(amount, productCurrency, currencies);
  const targetCurrency = getCurrencyByCode(currencies, displayCurrency || DEFAULT_CURRENCY);

  if (!targetCurrency.rate_to_sar || targetCurrency.rate_to_sar <= 0) {
    return sarValue;
  }

  return sarValue / targetCurrency.rate_to_sar;
};

export const formatCurrencyAmount = (
  amount: number,
  currencyCode: string | null | undefined,
  currencies: CurrencyRate[]
) => {
  const currency = getCurrencyByCode(currencies, currencyCode || DEFAULT_CURRENCY);
  const value = Number(amount || 0);
  const decimals = currency.decimals ?? 2;
  const formatted = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);

  return `${formatted} ${currency.symbol}`;
};

export const formatProductPrice = (
  amount: number | string | null | undefined,
  productCurrency: string | null | undefined,
  displayCurrency: string | null | undefined,
  currencies: CurrencyRate[]
) => {
  const converted = convertProductPrice(amount, productCurrency, displayCurrency, currencies);
  return formatCurrencyAmount(converted, displayCurrency || DEFAULT_CURRENCY, currencies);
};

export const formatSarAmount = (amount: number | string | null | undefined, currencies: CurrencyRate[]) => {
  return formatCurrencyAmount(Number(amount || 0), DEFAULT_CURRENCY, currencies);
};

export const useCurrency = (userId?: string | null, preferredCurrency?: string | null) => {
  const [currencies, setCurrencies] = useState<CurrencyRate[]>(FALLBACK_CURRENCIES);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => readStoredCurrency());

  useEffect(() => {
    let isMounted = true;

    const loadCurrencies = async () => {
      try {
        const { data, error } = await supabase
          .from('currency_rates')
          .select('code, name_ar, name_en, symbol, rate_to_sar, decimals, is_active, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching currency rates:', error);
          if (isMounted) setCurrencies(FALLBACK_CURRENCIES);
          return;
        }

        if (isMounted) {
          setCurrencies(mergeCurrencyRatesWithFallbacks(data || []));
        }
      } catch (error) {
        console.error('Unexpected currency rates error:', error);
        if (isMounted) setCurrencies(FALLBACK_CURRENCIES);
      }
    };

    loadCurrencies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (!stored && preferredCurrency) {
        const normalized = normalizeCurrencyCode(preferredCurrency);
        localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
        setSelectedCurrency(normalized);
      }
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  }, [preferredCurrency]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncCurrency = () => {
      setSelectedCurrency(readStoredCurrency());
    };

    window.addEventListener('storage', syncCurrency);
    window.addEventListener(CURRENCY_CHANGE_EVENT, syncCurrency as EventListener);

    return () => {
      window.removeEventListener('storage', syncCurrency);
      window.removeEventListener(CURRENCY_CHANGE_EVENT, syncCurrency as EventListener);
    };
  }, []);

  const changeCurrency = useCallback(
    async (code: string) => {
      const normalized = normalizeCurrencyCode(code);
      setSelectedCurrency(normalized);

      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
        window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: normalized }));
      } catch {
        // تجاهل أخطاء التخزين المحلي
      }

      if (userId) {
        try {
          const { error } = await supabase
            .from('users_profile')
            .update({ preferred_currency: normalized })
            .eq('id', userId);

          if (error) {
            console.error('Error saving preferred currency:', error);
          }
        } catch (error) {
          console.error('Unexpected preferred currency save error:', error);
        }
      }
    },
    [userId]
  );

  const selectedCurrencyInfo = useMemo(() => {
    return getCurrencyByCode(currencies, selectedCurrency);
  }, [currencies, selectedCurrency]);

  return {
    currencies,
    selectedCurrency,
    selectedCurrencyInfo,
    changeCurrency,
  };
};

export const CurrencySelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  currencies?: CurrencyRate[];
  className?: string;
}> = ({ value, onChange, currencies = FALLBACK_CURRENCIES, className = '' }) => {
  return (
    <select
      value={value || DEFAULT_CURRENCY}
      onChange={(event) => onChange(event.target.value)}
      className={className}
      dir="rtl"
    >
      {currencies.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.code} - {currency.name_ar}
        </option>
      ))}
    </select>
  );
};
