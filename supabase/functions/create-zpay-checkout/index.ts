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

// 生成随机订单号
function generateOrderId(): string {
  return `ZP${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
}

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
    
    // 获取Z-Pay配置
    const pid = Deno.env.get("ZPAY_PID");
    const key = Deno.env.get("ZPAY_PKEY");
    
    if (!pid || !key) {
      throw new Error("Z-Pay配置未完成");
    }
    
    // Z-Pay价格配置 (以分为单位)
    const priceConfig = {
      monthly: { amount: "14.00", name: "高级会员 - 月付" },
      quarterly: { amount: "30.00", name: "高级会员 - 季付" },
      yearly: { amount: "98.00", name: "高级会员 - 年付" },
      lifetime: { amount: "168.00", name: "高级会员 - 终身" }
    };

    const config = priceConfig[planType as keyof typeof priceConfig];
    if (!config) throw new Error("Invalid plan type");

    const orderId = generateOrderId();
    const returnUrl = `${req.headers.get("origin")}/profile?success=true`;
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/zpay-webhook`;
    
    // 构建支付参数
    const params = {
      pid: pid,
      type: "alipay", // 默认使用支付宝
      out_trade_no: orderId,
      notify_url: notifyUrl,
      return_url: returnUrl,
      name: config.name,
      money: config.amount,
      sitename: "智能厨房助手"
    };
    
    // 构建签名字符串 (按照易支付接口规范)
    const signStr = `money=${params.money}&name=${params.name}&notify_url=${params.notify_url}&out_trade_no=${params.out_trade_no}&pid=${params.pid}&return_url=${params.return_url}&sitename=${params.sitename}&type=${params.type}${key}`;
    
    // 生成签名
    const sign = md5(signStr);
    
    console.log("Z-Pay payment params:", { orderId, signStr: signStr.substring(0, 100) + "...", sign });
    const paymentParams = new URLSearchParams({
      ...params,
      sign: sign
    });
    
    const paymentUrl = `https://z-pay.cn/submit.php?${paymentParams.toString()}`;

    // 将订单信息存储到数据库
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("zpay_orders").insert({
      order_id: orderId,
      user_id: user.id,
      amount: parseFloat(config.amount) * 100, // 转换为分
      plan_type: planType,
      status: "pending",
      created_at: new Date().toISOString()
    });

    console.log(`Created Z-Pay order: ${orderId} for user: ${user.id}, amount: ${config.amount}, plan: ${planType}`);

    return new Response(JSON.stringify({ 
      url: paymentUrl,
      order_id: orderId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Z-Pay checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});