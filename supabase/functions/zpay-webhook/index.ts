import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHash } from "https://deno.land/std@0.190.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 生成MD5哈希
function md5(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Z-Pay webhook received");
    
    // 获取Z-Pay配置
    const key = Deno.env.get("ZPAY_PKEY");
    if (!key) {
      throw new Error("Z-Pay PKEY not configured");
    }

    // 解析支付结果
    let params: any;
    
    if (req.method === "GET") {
      // GET请求，从URL参数获取
      const url = new URL(req.url);
      params = Object.fromEntries(url.searchParams.entries());
    } else {
      // POST请求，从表单数据获取
      const formData = await req.formData();
      params = Object.fromEntries(formData.entries());
    }

    console.log("Z-Pay callback params:", params);

    const { 
      pid, 
      trade_no, 
      out_trade_no, 
      type, 
      name, 
      money, 
      trade_status, 
      sign 
    } = params;

    // 验证签名
    const signStr = `money=${money}&name=${name}&out_trade_no=${out_trade_no}&pid=${pid}&trade_no=${trade_no}&trade_status=${trade_status}&type=${type}${key}`;
    const expectedSign = md5(signStr);
    
    if (sign !== expectedSign) {
      console.error("Invalid signature:", { expected: expectedSign, received: sign });
      return new Response("Invalid signature", { status: 400 });
    }

    // 使用service role连接数据库
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 查找订单
    const { data: orderData, error: orderError } = await supabase
      .from("zpay_orders")
      .select("*")
      .eq("order_id", out_trade_no)
      .single();

    if (orderError || !orderData) {
      console.error("Order not found:", out_trade_no);
      return new Response("Order not found", { status: 404 });
    }

    // 支付成功
    if (trade_status === "TRADE_SUCCESS") {
      console.log("Payment successful for order:", out_trade_no);
      
      // 更新订单状态
      await supabase
        .from("zpay_orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("order_id", out_trade_no);

      // 确定订阅类型和结束日期
      let subscriptionEndDate = null;
      const planType = orderData.plan_type;
      
      if (planType !== "lifetime") {
        const now = new Date();
        switch (planType) {
          case "monthly":
            now.setMonth(now.getMonth() + 1);
            break;
          case "quarterly":
            now.setMonth(now.getMonth() + 3);
            break;
          case "yearly":
            now.setFullYear(now.getFullYear() + 1);
            break;
        }
        subscriptionEndDate = now.toISOString();
      }

      // 更新用户订阅状态
      const { error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: orderData.user_id,
          subscription_type: "premium",
          subscription_status: "active",
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: subscriptionEndDate,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (subscriptionError) {
        console.error("Failed to update subscription:", subscriptionError);
      } else {
        console.log("Subscription updated successfully for user:", orderData.user_id);
      }

      return new Response("success", { status: 200 });
    } else {
      console.log("Payment failed or pending for order:", out_trade_no, "Status:", trade_status);
      
      // 更新订单状态为失败
      await supabase
        .from("zpay_orders")
        .update({ 
          status: "failed",
          updated_at: new Date().toISOString()
        })
        .eq("order_id", out_trade_no);

      return new Response("fail", { status: 200 });
    }

  } catch (error) {
    console.error("Z-Pay webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});