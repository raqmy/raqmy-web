import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type JsonObject = Record<string, any>;

type OrderRecord = {
  id: string;
  order_number?: string | null;
  status?: string | null;
  total_amount?: number | null;
  paid_at?: string | null;
};

const PAID_STATUSES = new Set(["paid", "completed", "success", "succeeded", "active"]);
const FAILED_STATUSES = new Set(["failed", "declined", "cancelled", "canceled"]);

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isPaidStatus(status: unknown): boolean {
  return PAID_STATUSES.has(normalizeText(status).toLowerCase());
}

function isFailedStatus(status: unknown): boolean {
  return FAILED_STATUSES.has(normalizeText(status).toLowerCase());
}

function safeNumber(value: unknown): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return numberValue;
}

function getPaymobObject(payload: JsonObject): JsonObject {
  if (payload && typeof payload.obj === "object" && payload.obj !== null) {
    return payload.obj;
  }

  return payload || {};
}

function getPaymobOrderObject(transaction: JsonObject): JsonObject | null {
  if (transaction.order && typeof transaction.order === "object") {
    return transaction.order;
  }

  return null;
}

function getPaymobOrderId(transaction: JsonObject): string | null {
  const orderObject = getPaymobOrderObject(transaction);

  const candidates = [
    orderObject?.id,
    orderObject?.order_id,
    transaction.order_id,
    transaction.paymob_order_id,
    typeof transaction.order !== "object" ? transaction.order : null,
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (value) return value;
  }

  return null;
}

function getMerchantOrderId(transaction: JsonObject): string | null {
  const orderObject = getPaymobOrderObject(transaction);

  const candidates = [
    orderObject?.merchant_order_id,
    orderObject?.merchant_order_number,
    orderObject?.merchant_id,
    transaction.merchant_order_id,
    transaction.merchant_order_number,
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (value) return value;
  }

  return null;
}

function getTransactionId(transaction: JsonObject): string | null {
  const candidates = [
    transaction.id,
    transaction.transaction_id,
    transaction.paymob_transaction_id,
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (value) return value;
  }

  return null;
}

function getTransactionAmount(transaction: JsonObject): number {
  const amountCents = safeNumber(transaction.amount_cents);

  if (amountCents > 0) {
    return amountCents / 100;
  }

  return safeNumber(transaction.amount);
}

function getTransactionCurrency(transaction: JsonObject): string {
  return normalizeText(transaction.currency || "SAR") || "SAR";
}

function verifyPaymobSignature(payload: JsonObject, hmacKey: string, receivedHmac: string | null): boolean {
  try {
    if (!receivedHmac) {
      console.error("Paymob HMAC missing");
      return false;
    }

    const transaction = getPaymobObject(payload);

    const orderObject = getPaymobOrderObject(transaction);
    const orderId = orderObject?.id ?? transaction.order;

    const values = [
      transaction.amount_cents,
      transaction.created_at,
      transaction.currency,
      transaction.error_occured,
      transaction.has_parent_transaction,
      transaction.id,
      transaction.integration_id,
      transaction.is_3d_secure,
      transaction.is_auth,
      transaction.is_capture,
      transaction.is_refunded,
      transaction.is_standalone_payment,
      transaction.is_voided,
      orderId,
      transaction.owner,
      transaction.pending,
      transaction.source_data?.pan ?? transaction.source_data_pan,
      transaction.source_data?.sub_type ?? transaction.source_data_sub_type,
      transaction.source_data?.type ?? transaction.source_data_type,
      transaction.success,
    ];

    const concatenatedString = values
      .map((value) => (value === null || value === undefined ? "" : String(value)))
      .join("");

    const calculatedHmac = createHmac("sha512", hmacKey)
      .update(concatenatedString)
      .digest("hex");

    const a = Buffer.from(calculatedHmac, "hex");
    const b = Buffer.from(receivedHmac, "hex");

    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  } catch (error) {
    console.error("Paymob signature verification error:", error);
    return false;
  }
}

async function getTableColumns(
  supabase: SupabaseClient,
  tableName: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", tableName);

  if (error) {
    console.error(`Could not inspect columns for ${tableName}:`, error);
    return new Set<string>();
  }

  return new Set((data || []).map((row: any) => String(row.column_name)));
}

function pickExistingColumns(payload: JsonObject, columns: Set<string>): JsonObject {
  const result: JsonObject = {};

  for (const [key, value] of Object.entries(payload)) {
    if (columns.has(key)) {
      result[key] = value;
    }
  }

  return result;
}

async function insertWebhookLog(
  supabase: SupabaseClient,
  payload: JsonObject
): Promise<string | null> {
  const columns = await getTableColumns(supabase, "webhook_logs");

  if (columns.size === 0) {
    return null;
  }

  const insertPayload = pickExistingColumns(
    {
      provider: "paymob",
      event_type: payload.type || payload.event || "transaction",
      raw_payload: payload,
      status: "pending",
      created_at: new Date().toISOString(),
    },
    columns
  );

  if (Object.keys(insertPayload).length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("webhook_logs")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Webhook log insert failed:", error);
    return null;
  }

  return data?.id || null;
}

async function updateWebhookLog(
  supabase: SupabaseClient,
  webhookLogId: string | null,
  status: string,
  parsedData?: JsonObject,
  errorMessage?: string
): Promise<void> {
  if (!webhookLogId) return;

  const columns = await getTableColumns(supabase, "webhook_logs");

  if (columns.size === 0) {
    return;
  }

  const updatePayload = pickExistingColumns(
    {
      status,
      parsed_data: parsedData || null,
      error_message: errorMessage || null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    columns
  );

  if (Object.keys(updatePayload).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("webhook_logs")
    .update(updatePayload)
    .eq("id", webhookLogId);

  if (error) {
    console.error("Webhook log update failed:", error);
  }
}

async function getHmacKey(supabase: SupabaseClient): Promise<string> {
  const envHmac =
    Deno.env.get("PAYMOB_HMAC_KEY") ||
    Deno.env.get("PAYMOB_HMAC") ||
    Deno.env.get("PAYMOB_HMAC_SECRET") ||
    "";

  if (envHmac.trim()) {
    return envHmac.trim();
  }

  const { data, error } = await supabase
    .from("payment_provider_keys")
    .select("key_value")
    .eq("provider", "paymob")
    .eq("key_name", "hmac_key")
    .maybeSingle();

  if (error) {
    console.error("HMAC key lookup error:", error);
  }

  const dbHmac = normalizeText(data?.key_value);

  if (!dbHmac) {
    throw new Error("Paymob HMAC key not found");
  }

  return dbHmac;
}

async function findOrderByColumn(
  supabase: SupabaseClient,
  column: string,
  value: string
): Promise<OrderRecord | null> {
  if (!value) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, paid_at")
    .eq(column, value)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Order lookup failed by ${column}:`, error);
    return null;
  }

  return (data as OrderRecord) || null;
}

async function findOrder(
  supabase: SupabaseClient,
  transaction: JsonObject
): Promise<OrderRecord | null> {
  const orderColumns = await getTableColumns(supabase, "orders");

  const merchantOrderId = getMerchantOrderId(transaction);
  const paymobOrderId = getPaymobOrderId(transaction);

  const candidates: Array<{ column: string; value: string }> = [];

  if (merchantOrderId) {
    if (isUuid(merchantOrderId)) {
      candidates.push({ column: "id", value: merchantOrderId });
    }

    if (orderColumns.has("order_number")) {
      candidates.push({ column: "order_number", value: merchantOrderId });
    }

    if (orderColumns.has("payment_reference")) {
      candidates.push({ column: "payment_reference", value: merchantOrderId });
      candidates.push({ column: "payment_reference", value: `paymob_order_${merchantOrderId}` });
    }

    if (orderColumns.has("paymob_order_id")) {
      candidates.push({ column: "paymob_order_id", value: merchantOrderId });
    }
  }

  if (paymobOrderId) {
    if (isUuid(paymobOrderId)) {
      candidates.push({ column: "id", value: paymobOrderId });
    }

    if (orderColumns.has("payment_reference")) {
      candidates.push({ column: "payment_reference", value: paymobOrderId });
      candidates.push({ column: "payment_reference", value: `paymob_order_${paymobOrderId}` });
    }

    if (orderColumns.has("paymob_order_id")) {
      candidates.push({ column: "paymob_order_id", value: paymobOrderId });
    }
  }

  const uniqueCandidates = candidates.filter(
    (candidate, index, arr) =>
      candidate.value &&
      arr.findIndex(
        (item) => item.column === candidate.column && item.value === candidate.value
      ) === index
  );

  for (const candidate of uniqueCandidates) {
    const order = await findOrderByColumn(supabase, candidate.column, candidate.value);

    if (order?.id) {
      return order;
    }
  }

  return null;
}

async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  status: string,
  transaction: JsonObject
): Promise<OrderRecord | null> {
  const columns = await getTableColumns(supabase, "orders");

  const transactionId = getTransactionId(transaction);
  const paymobOrderId = getPaymobOrderId(transaction);
  const paidAt = new Date().toISOString();

  const baseUpdate: JsonObject = {
    status,
    paid_at: isPaidStatus(status) ? paidAt : null,
    payment_status: status,
    paymob_transaction_id: transactionId,
    payment_reference: paymobOrderId ? `paymob_order_${paymobOrderId}` : undefined,
    updated_at: paidAt,
  };

  const updatePayload = pickExistingColumns(baseUpdate, columns);

  if (updatePayload.paid_at === null) {
    delete updatePayload.paid_at;
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  if (Object.keys(updatePayload).length === 0) {
    throw new Error("No matching columns found to update orders table");
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .select("id, order_number, status, total_amount, paid_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OrderRecord) || null;
}

async function updatePaymentRecordIfExists(
  supabase: SupabaseClient,
  orderId: string,
  status: string,
  transaction: JsonObject
): Promise<void> {
  const columns = await getTableColumns(supabase, "payments");

  if (columns.size === 0) {
    return;
  }

  const transactionId = getTransactionId(transaction);
  const nowIso = new Date().toISOString();

  const updatePayload = pickExistingColumns(
    {
      status,
      provider_transaction_id: transactionId,
      paymob_transaction_id: transactionId,
      completed_at: isPaidStatus(status) ? nowIso : null,
      failed_at: isFailedStatus(status) ? nowIso : null,
      metadata: transaction,
      updated_at: nowIso,
    },
    columns
  );

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === null || updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  if (Object.keys(updatePayload).length === 0) {
    return;
  }

  const possibleOrderColumns = ["order_id", "order_uuid"];
  const orderColumn = possibleOrderColumns.find((column) => columns.has(column));

  if (!orderColumn) {
    return;
  }

  const { error } = await supabase
    .from("payments")
    .update(updatePayload)
    .eq(orderColumn, orderId);

  if (error) {
    console.error("Payment record update skipped/failed:", error);
  }
}

async function safeRpc(
  supabase: SupabaseClient,
  fnName: string,
  args: JsonObject
): Promise<JsonObject> {
  try {
    const { data, error } = await supabase.rpc(fnName, args);

    if (error) {
      console.error(`RPC ${fnName} failed:`, error);
      return {
        success: false,
        function: fnName,
        error: error.message,
      };
    }

    return {
      success: true,
      function: fnName,
      data,
    };
  } catch (error: any) {
    console.error(`RPC ${fnName} exception:`, error);
    return {
      success: false,
      function: fnName,
      error: error?.message || String(error),
    };
  }
}

async function runPostPaidActions(
  supabase: SupabaseClient,
  orderId: string
): Promise<JsonObject> {
  const results: JsonObject = {};

  results.seller_wallet = await safeRpc(supabase, "credit_paid_order_sellers_from_items", {
    p_order_id: orderId,
  });

  results.admin_merchant_affiliate = await safeRpc(
    supabase,
    "create_admin_merchant_product_sale_affiliate_commissions",
    {
      p_order_id: orderId,
    }
  );

  results.normal_affiliate = await safeRpc(supabase, "create_affiliate_commissions_for_order", {
    p_order_id: orderId,
  });

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let webhookLogId: string | null = null;

  try {
    const url = new URL(req.url);
    const payload = (await req.json()) as JsonObject;
    const transaction = getPaymobObject(payload);

    webhookLogId = await insertWebhookLog(supabase, payload);

    const hmacKey = await getHmacKey(supabase);
    const receivedHmac =
      normalizeText(url.searchParams.get("hmac")) ||
      normalizeText(payload.hmac) ||
      normalizeText(transaction.hmac) ||
      null;

    const signatureIsValid = verifyPaymobSignature(payload, hmacKey, receivedHmac);

    if (!signatureIsValid) {
      throw new Error("Invalid Paymob HMAC signature");
    }

    const order = await findOrder(supabase, transaction);

    if (!order?.id) {
      throw new Error(
        `Order not found. merchant_order_id=${getMerchantOrderId(transaction) || "-"}, paymob_order_id=${
          getPaymobOrderId(transaction) || "-"
        }`
      );
    }

    const transactionSuccess = normalizeBoolean(transaction.success);
    const transactionPending = normalizeBoolean(transaction.pending);
    const transactionError = normalizeBoolean(transaction.error_occured);
    const transactionId = getTransactionId(transaction);
    const amount = getTransactionAmount(transaction);
    const currency = getTransactionCurrency(transaction);
    const wasAlreadyPaid = isPaidStatus(order.status);

    if (transactionSuccess && !transactionPending && !transactionError) {
      const updatedOrder = await updateOrderStatus(supabase, order.id, "paid", transaction);

      await updatePaymentRecordIfExists(supabase, order.id, "paid", transaction);

      const postPaidResults = wasAlreadyPaid
        ? {
            skipped: true,
            reason: "order_was_already_paid_before_this_webhook",
          }
        : await runPostPaidActions(supabase, order.id);

      await updateWebhookLog(supabase, webhookLogId, "success", {
        order_id: order.id,
        order_number: order.order_number,
        status: "paid",
        transaction_id: transactionId,
        amount,
        currency,
        post_paid_results: postPaidResults,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment processed successfully",
          order_id: order.id,
          order_number: order.order_number,
          status: updatedOrder?.status || "paid",
          transaction_id: transactionId,
          post_paid_results: postPaidResults,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!transactionSuccess || transactionError) {
      const updatedOrder = await updateOrderStatus(supabase, order.id, "failed", transaction);

      await updatePaymentRecordIfExists(supabase, order.id, "failed", transaction);

      await updateWebhookLog(supabase, webhookLogId, "success", {
        order_id: order.id,
        order_number: order.order_number,
        status: "failed",
        transaction_id: transactionId,
        amount,
        currency,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment failure recorded",
          order_id: order.id,
          order_number: order.order_number,
          status: updatedOrder?.status || "failed",
          transaction_id: transactionId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (transactionPending) {
      await updatePaymentRecordIfExists(supabase, order.id, "processing", transaction);

      await updateWebhookLog(supabase, webhookLogId, "success", {
        order_id: order.id,
        order_number: order.order_number,
        status: "processing",
        transaction_id: transactionId,
        amount,
        currency,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment is still pending",
          order_id: order.id,
          order_number: order.order_number,
          transaction_id: transactionId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await updateWebhookLog(supabase, webhookLogId, "success", {
      order_id: order.id,
      order_number: order.order_number,
      status: "ignored",
      transaction_id: transactionId,
      amount,
      currency,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received but no final payment state detected",
        order_id: order.id,
        order_number: order.order_number,
        transaction_id: transactionId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Paymob webhook processing error:", error);

    await updateWebhookLog(
      supabase,
      webhookLogId,
      "failed",
      undefined,
      error?.message || String(error)
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
