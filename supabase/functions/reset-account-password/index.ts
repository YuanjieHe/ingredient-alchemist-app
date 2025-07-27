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

    console.log("开始重置所有推广账号密码...");

    // 获取所有推广账号
    const { data: users, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (fetchError) {
      throw fetchError;
    }

    const targetUsers = users.users.filter(user => 
      user.email && user.email.includes('user') && user.email.includes('@recipe-ai.com')
    );

    console.log(`找到 ${targetUsers.length} 个推广账号`);

    const updatedAccounts = [];

    // 为每个账号重置密码
    for (const user of targetUsers) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { 
            password: 'What2cook@2025',
            email_confirm: true 
          }
        );

        if (error) {
          console.error(`重置密码失败 ${user.email}:`, error);
          continue;
        }

        updatedAccounts.push({
          email: user.email,
          password: 'What2cook@2025',
          userId: user.id,
          status: 'password_updated'
        });

        console.log(`密码重置成功: ${user.email}`);
      } catch (error) {
        console.error(`处理用户 ${user.email} 时出错:`, error);
      }
    }

    console.log(`密码重置完成！共更新了 ${updatedAccounts.length} 个账号`);

    return new Response(JSON.stringify({
      success: true,
      message: `成功重置了 ${updatedAccounts.length} 个账号的密码`,
      accounts: updatedAccounts,
      totalProcessed: targetUsers.length,
      totalUpdated: updatedAccounts.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('重置密码错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});