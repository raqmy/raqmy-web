import { supabase } from "@/lib/supabase";

function getOrCreateVisitorToken() {
  let token = localStorage.getItem("visitor_token");

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("visitor_token", token);
  }

  return token;
}

export async function handleAffiliateTracking() {
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");

    if (!ref) return;

    const visitorToken = getOrCreateVisitorToken();

    const landingPath = window.location.pathname;

    // 1) سجل click
    await supabase.rpc("record_affiliate_click", {
      p_ref_code: ref,
      p_landing_path: landingPath,
      p_visitor_token: visitorToken,
      p_user_agent: navigator.userAgent,
    });

    // 2) أنشئ attribution
    const { data: attributionId } = await supabase.rpc(
      "upsert_affiliate_attribution",
      {
        p_ref_code: ref,
        p_visitor_token: visitorToken,
      }
    );

    // 3) خزّن البيانات محليًا
    localStorage.setItem(
      "affiliate_data",
      JSON.stringify({
        ref_code: ref,
        attribution_id: attributionId,
        visitor_token: visitorToken,
        created_at: new Date().toISOString(),
      })
    );

    console.log("Affiliate tracked:", ref);
  } catch (err) {
    console.error("Affiliate tracking error:", err);
  }
}
