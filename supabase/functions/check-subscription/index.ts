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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      // 更新为未订阅状态
      await supabaseClient.from("user_subscriptions").upsert({
        user_id: user.id,
        subscription_type: 'free',
        subscription_status: 'active',
        free_generations_used: 0,
        free_generations_limit: 3,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    }

    // 检查一次性付款（终生会员）
    const payments = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    const lifetimePayment = payments.data.find(payment => 
      payment.status === 'succeeded' && 
      payment.metadata?.plan_type === 'lifetime'
    );

    const isLifetime = !!lifetimePayment;
    const subscriptionType = hasActiveSub || isLifetime ? 'premium' : 'free';
    const subscriptionStatus = hasActiveSub || isLifetime ? 'active' : 'active';

    // 更新数据库
    await supabaseClient.from("user_subscriptions").upsert({
      user_id: user.id,
      subscription_type: subscriptionType,
      subscription_status: subscriptionStatus,
      subscription_end_date: isLifetime ? null : subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({
      subscribed: subscriptionType === 'premium',
      subscription_type: subscriptionType,
      subscription_end: subscriptionEnd,
      is_lifetime: isLifetime
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});