import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { planType } = await req.json();
    
    // Z-Pay price configuration (in RMB cents)
    const priceConfig = {
      monthly: { amount: 1400, name: "高级会员 - 月付" }, // ¥14
      quarterly: { amount: 3000, name: "高级会员 - 季付" }, // ¥30
      yearly: { amount: 9800, name: "高级会员 - 年付" }, // ¥98
      lifetime: { amount: 16800, name: "高级会员 - 终身" } // ¥168
    };

    const config = priceConfig[planType as keyof typeof priceConfig];
    if (!config) throw new Error("Invalid plan type");

    // This would be the actual Z-Pay integration
    // For now, returning a placeholder response
    const zPayData = {
      order_id: `order_${Date.now()}_${user.id}`,
      amount: config.amount,
      product_name: config.name,
      user_id: user.id,
      plan_type: planType,
      // In real implementation, you would call Z-Pay API here
      payment_url: `https://z-pay.cn/pay?order_id=order_${Date.now()}_${user.id}&amount=${config.amount}&product=${encodeURIComponent(config.name)}`,
      success_url: `${req.headers.get("origin")}/profile?success=true`,
      cancel_url: `${req.headers.get("origin")}/profile?cancelled=true`
    };

    // Store order in database for verification later
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("zpay_orders").insert({
      order_id: zPayData.order_id,
      user_id: user.id,
      amount: config.amount,
      plan_type: planType,
      status: "pending",
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ url: zPayData.payment_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});