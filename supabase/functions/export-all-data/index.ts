import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== 管理员数据导出开始 ===');

    // 使用service role key创建supabase客户端，绕过RLS限制
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 验证请求来源（可选：添加API密钥验证）
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('ADMIN_EXPORT_API_KEY');
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.log('API密钥验证失败');
      return new Response(
        JSON.stringify({ error: '无权访问' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('开始导出所有数据表...');

    // 导出业务数据表（使用service role，绕过RLS）
    const [
      profilesResult,
      subscriptionsResult,
      ingredientsResult,
      favoritesResult,
      recipesHistoryResult,
      dishesResult,
      techniquesResult,
      ordersResult,
      dishIngredientsResult,
      dishTechniquesResult
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('user_subscriptions').select('*'),
      supabaseAdmin.from('ingredients_bank').select('*'),
      supabaseAdmin.from('favorite_recipes').select('*'),
      supabaseAdmin.from('recipes_history').select('*'),
      supabaseAdmin.from('dishes_knowledge_base').select('*'),
      supabaseAdmin.from('cooking_techniques').select('*'),
      supabaseAdmin.from('zpay_orders').select('*'),
      supabaseAdmin.from('dish_ingredients').select('*'),
      supabaseAdmin.from('dish_techniques').select('*')
    ]);

    // 导出Auth用户数据（重要：包含邮箱等认证信息）
    console.log('导出认证用户数据...');
    const authUsersResult = await supabaseAdmin
      .from('auth.users')
      .select('id, email, phone, created_at, updated_at, email_confirmed_at, phone_confirmed_at, raw_user_meta_data, app_metadata');

    // 导出存储桶信息
    console.log('导出存储配置...');
    let storageBucketsResult = { data: [], error: null };
    let storageObjectsResult = { data: [], error: null };
    
    try {
      storageBucketsResult = await supabaseAdmin
        .from('storage.buckets')
        .select('*');
    } catch (err) {
      console.log('存储桶查询失败（可能没有存储桶）:', err);
      storageBucketsResult = { data: [], error: null };
    }

    try {
      storageObjectsResult = await supabaseAdmin
        .from('storage.objects')
        .select('*');
    } catch (err) {
      console.log('存储对象查询失败（可能没有存储对象）:', err);
      storageObjectsResult = { data: [], error: null };
    }

    // 检查错误
    const results = [
      { name: 'profiles', result: profilesResult },
      { name: 'user_subscriptions', result: subscriptionsResult },
      { name: 'ingredients_bank', result: ingredientsResult },
      { name: 'favorite_recipes', result: favoritesResult },
      { name: 'recipes_history', result: recipesHistoryResult },
      { name: 'dishes_knowledge_base', result: dishesResult },
      { name: 'cooking_techniques', result: techniquesResult },
      { name: 'zpay_orders', result: ordersResult },
      { name: 'dish_ingredients', result: dishIngredientsResult },
      { name: 'dish_techniques', result: dishTechniquesResult },
      { name: 'auth_users', result: authUsersResult },
      { name: 'storage_buckets', result: storageBucketsResult },
      { name: 'storage_objects', result: storageObjectsResult }
    ];

    for (const { name, result } of results) {
      if (result.error) {
        console.error(`导出${name}表时出错:`, result.error);
        return new Response(
          JSON.stringify({ error: `导出${name}表失败: ${result.error.message}` }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log(`${name}: ${result.data?.length || 0} 条记录`);
    }

    // 统计数据
    const stats = {
      profiles: profilesResult.data?.length || 0,
      user_subscriptions: subscriptionsResult.data?.length || 0,
      ingredients_bank: ingredientsResult.data?.length || 0,
      favorite_recipes: favoritesResult.data?.length || 0,
      recipes_history: recipesHistoryResult.data?.length || 0,
      dishes_knowledge_base: dishesResult.data?.length || 0,
      cooking_techniques: techniquesResult.data?.length || 0,
      zpay_orders: ordersResult.data?.length || 0,
      dish_ingredients: dishIngredientsResult.data?.length || 0,
      dish_techniques: dishTechniquesResult.data?.length || 0,
      auth_users: authUsersResult.data?.length || 0,
      storage_buckets: storageBucketsResult.data?.length || 0,
      storage_objects: storageObjectsResult.data?.length || 0
    };

    // 创建完整备份数据
    const backupData = {
      // 业务数据表
      profiles: profilesResult.data || [],
      user_subscriptions: subscriptionsResult.data || [],
      ingredients_bank: ingredientsResult.data || [],
      favorite_recipes: favoritesResult.data || [],
      recipes_history: recipesHistoryResult.data || [],
      dishes_knowledge_base: dishesResult.data || [],
      cooking_techniques: techniquesResult.data || [],
      zpay_orders: ordersResult.data || [],
      dish_ingredients: dishIngredientsResult.data || [],
      dish_techniques: dishTechniquesResult.data || [],
      
      // 认证和系统数据
      auth_users: authUsersResult.data || [],
      storage_buckets: storageBucketsResult.data || [],
      storage_objects: storageObjectsResult.data || [],
      
      // 元数据
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      exportType: 'full_admin_export',
      stats,
      
      // 数据库架构信息（用于重建）
      schema_info: {
        database_functions: [
          'handle_new_user()', 
          'handle_new_user_subscription()', 
          'update_updated_at_column()'
        ],
        triggers: [
          'on_auth_user_created (after insert on auth.users)',
          'user_subscription_trigger (after insert on auth.users)',
          'update_*_updated_at (before update on various tables)'
        ],
        rls_enabled_tables: [
          'profiles', 'user_subscriptions', 'ingredients_bank', 
          'favorite_recipes', 'recipes_history', 'cooking_techniques',
          'dishes_knowledge_base', 'dish_ingredients', 'dish_techniques',
          'zpay_orders'
        ],
        rls_policies: {
          profiles: ['Users can view/create/update their own profile'],
          user_subscriptions: ['Users can view/insert/update their own subscription'],
          ingredients_bank: ['Users can CRUD their own ingredients'],
          favorite_recipes: ['Users can view/create/delete their own favorites'],
          recipes_history: ['Users can view/create/delete their own recipes'],
          dishes_knowledge_base: ['Anyone can view, authenticated users can manage'],
          cooking_techniques: ['Anyone can view, authenticated users can manage'],
          dish_ingredients: ['Anyone can view, authenticated users can manage'],
          dish_techniques: ['Anyone can view, authenticated users can manage'],
          zpay_orders: ['Users can view their own orders, system can insert/update']
        },
        auth_settings: {
          email_confirmations: '需要配置邮件确认设置',
          jwt_expiry: '需要配置JWT过期时间',
          password_strength: '需要配置密码强度要求',
          rate_limiting: '需要配置API速率限制'
        },
        edge_functions: [
          'analyze-ingredients', 'auto-create-accounts', 'check-subscription',
          'create-bulk-accounts', 'create-checkout', 'create-zpay-checkout',
          'generate-recipes', 'process-apple-purchase', 'reset-account-password',
          'stripe-webhook', 'verify-stripe-payment', 'zpay-webhook', 'export-all-data'
        ],
        secrets_needed: [
          'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'STRIPE_SECRET_KEY',
          'ZPAY_PID', 'ZPAY_PKEY', 'ADMIN_EXPORT_API_KEY (optional)'
        ],
        migration_checklist: [
          '1. 创建所有数据表（使用备份的数据结构）',
          '2. 导入所有业务数据',
          '3. 重新创建数据库函数和触发器',
          '4. 设置所有RLS策略',
          '5. 配置认证设置（邮件确认、密码策略等）',
          '6. 部署所有边缘函数',
          '7. 配置所有秘钥变量',
          '8. 导入认证用户数据',
          '9. 恢复存储桶和文件（如果有）',
          '10. 测试所有功能确保正常工作'
        ],
        note: '此备份包含完整的系统迁移所需信息，按照migration_checklist顺序执行可确保100%还原'
      }
    };

    console.log('=== 导出完成 ===');
    console.log('统计信息:', stats);

    return new Response(
      JSON.stringify(backupData), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="what2cook-full-backup-${new Date().toISOString().split('T')[0]}.json"`
        } 
      }
    );

  } catch (error) {
    console.error('导出过程中发生错误:', error);
    return new Response(
      JSON.stringify({ 
        error: '导出失败', 
        details: error instanceof Error ? error.message : '未知错误' 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})