import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    // 查找现有客户
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // 定义价格配置
    const priceConfig = {
      monthly: { amount: 800, interval: "month" }, // $8
      quarterly: { amount: 2100, interval: "month", interval_count: 3 }, // $21/3个月
      annual: { amount: 6400, interval: "year" }, // $64/年
      lifetime: { amount: 16800, interval: null } // $168 一次性
    };

    const config = priceConfig[planType as keyof typeof priceConfig];
    if (!config) throw new Error("Invalid plan type");

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `高级会员 - ${planType === 'monthly' ? '月付' : 
                              planType === 'quarterly' ? '季付' : 
                              planType === 'annual' ? '年付' : '终生'}` 
            },
            unit_amount: config.amount,
            ...(config.interval ? {
              recurring: { 
                interval: config.interval,
                ...(config.interval_count ? { interval_count: config.interval_count } : {})
              }
            } : {})
          },
          quantity: 1,
        },
      ],
      mode: config.interval ? "subscription" : "payment",
      success_url: `${req.headers.get("origin")}/profile?success=true`,
      cancel_url: `${req.headers.get("origin")}/profile?cancelled=true`,
      metadata: {
        user_id: user.id,
        plan_type: planType
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
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