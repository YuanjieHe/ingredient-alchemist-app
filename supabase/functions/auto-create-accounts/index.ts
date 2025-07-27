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

  try {
    // 使用服务角色密钥创建Supabase客户端
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const accounts = [];
    const createdAccounts = [];

    // 生成20个随机数字账号
    const randomNumbers = [
      "847532", "293681", "756924", "418375", "639287",
      "175493", "824156", "367829", "591746", "482913",
      "735684", "216857", "968374", "543192", "791465",
      "325789", "687241", "154836", "429573", "816492"
    ];
    
    for (let i = 0; i < 20; i++) {
      const email = `user${randomNumbers[i]}@recipe-ai.com`;
      const password = `What2cook@2025`;
      accounts.push({ email, password });
    }

    console.log("开始创建20个推广账号...");

    // 批量创建账号
    for (const account of accounts) {
      try {
        console.log(`正在创建账号: ${account.email}`);
        
        // 创建用户
        const { data: user, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            display_name: `推广用户${account.email.match(/user(\d+)/)?.[1]}`,
            role: 'premium_user'
          }
        });

        if (signUpError) {
          console.error(`创建账号失败 ${account.email}:`, signUpError);
          continue;
        }

        if (user.user) {
          // 设置为月度会员
          const subscriptionEndDate = new Date();
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

          const { error: subscriptionError } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: user.user.id,
              subscription_type: 'premium',
              subscription_status: 'active',
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: subscriptionEndDate.toISOString(),
              free_generations_used: 0,
              free_generations_limit: -1, // 无限制
            });

          if (subscriptionError) {
            console.error(`设置订阅失败 ${account.email}:`, subscriptionError);
          }

          createdAccounts.push({
            email: account.email,
            password: account.password,
            userId: user.user.id,
            subscriptionStatus: subscriptionError ? 'failed' : 'active'
          });
          
          console.log(`成功创建账号: ${account.email} (${createdAccounts.length}/20)`);
        }
      } catch (error) {
        console.error(`处理账号时出错 ${account.email}:`, error);
      }
    }

    console.log(`账号创建完成！成功创建了 ${createdAccounts.length} 个月度会员账号`);

    return new Response(JSON.stringify({
      success: true,
      message: `成功创建了 ${createdAccounts.length} 个月度会员推广账号`,
      accounts: createdAccounts,
      totalRequested: 20,
      totalCreated: createdAccounts.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('批量创建账号错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});