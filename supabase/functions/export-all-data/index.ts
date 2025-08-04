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
    const storageBucketsResult = await supabaseAdmin
      .from('storage.buckets')
      .select('*');

    const storageObjectsResult = await supabaseAdmin
      .from('storage.objects')
      .select('*');

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
        rls_enabled_tables: [
          'profiles', 'user_subscriptions', 'ingredients_bank', 
          'favorite_recipes', 'recipes_history', 'cooking_techniques',
          'dishes_knowledge_base', 'dish_ingredients', 'dish_techniques',
          'zpay_orders'
        ],
        note: '迁移时需要重新创建RLS策略、触发器和数据库函数'
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