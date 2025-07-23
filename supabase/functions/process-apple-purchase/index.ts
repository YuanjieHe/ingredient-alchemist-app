import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    if (!user) throw new Error("User not authenticated");

    const { 
      transactionId, 
      originalTransactionId, 
      productId, 
      planType 
    } = await req.json();

    console.log('Processing Apple purchase:', { 
      userId: user.id, 
      transactionId, 
      originalTransactionId, 
      productId, 
      planType 
    });

    // 计算订阅结束时间
    let subscriptionEndDate = null;
    if (planType !== 'lifetime') {
      const endDate = new Date();
      switch (planType) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'annual':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }
      subscriptionEndDate = endDate.toISOString();
    }

    // 更新用户订阅状态
    const { error: updateError } = await supabaseClient
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        subscription_type: 'premium',
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: subscriptionEndDate,
        apple_transaction_id: transactionId,
        apple_original_transaction_id: originalTransactionId,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update subscription status');
    }

    console.log('Apple purchase processed successfully for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Purchase processed successfully'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing Apple purchase:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});