# What2Cook 完整系统迁移指南

## 概述
此指南确保您能够100%完整地迁移What2Cook应用到新的Supabase项目，保持所有功能和数据完全一致。

## 准备工作

### 1. 数据备份
使用应用内的"管理员级别导出"功能获取完整备份文件，备份包含：
- ✅ 所有用户业务数据（10个数据表）
- ✅ 认证用户信息 (auth.users)
- ✅ 存储配置信息
- ✅ 完整的数据库架构信息
- ✅ RLS策略详情
- ✅ 边缘函数列表
- ✅ 迁移检查清单

### 2. 新项目准备
- 创建新的Supabase项目
- 记录新项目的URL和Keys
- 确保网络可以访问新项目

## 迁移步骤（按顺序执行）

### 步骤1: 创建数据表结构
使用以下SQL在新项目中创建所有表：

```sql
-- 1. 用户档案表
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  language text DEFAULT 'English'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. 用户订阅表
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  subscription_type text NOT NULL DEFAULT 'free'::text,
  subscription_status text NOT NULL DEFAULT 'active'::text,
  free_generations_used integer NOT NULL DEFAULT 0,
  free_generations_limit integer NOT NULL DEFAULT 3,
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  apple_transaction_id text,
  apple_original_transaction_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. 食材银行表
CREATE TABLE public.ingredients_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'other'::text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'pieces'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. 收藏菜谱表
CREATE TABLE public.favorite_recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recipe_id text NOT NULL,
  recipe_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. 菜谱历史表
CREATE TABLE public.recipes_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recipe_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. 菜品知识库
CREATE TABLE public.dishes_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cuisine_type text NOT NULL DEFAULT 'chinese'::text,
  difficulty_level text NOT NULL DEFAULT 'medium'::text,
  cooking_time integer NOT NULL DEFAULT 30,
  serving_size integer NOT NULL DEFAULT 2,
  description text,
  cultural_background text,
  instructions jsonb NOT NULL,
  nutrition_info jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 7. 烹饪技法表
CREATE TABLE public.cooking_techniques (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  difficulty_level text NOT NULL DEFAULT 'medium'::text,
  equipment_needed text[],
  tips text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 8. Z-Pay订单表
CREATE TABLE public.zpay_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text NOT NULL,
  user_id uuid,
  plan_type text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 9. 菜品食材关联表
CREATE TABLE public.dish_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id uuid NOT NULL,
  ingredient_name text NOT NULL,
  quantity text,
  is_optional boolean DEFAULT false,
  is_substitutable boolean DEFAULT false,
  substitute_options text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 10. 菜品技法关联表
CREATE TABLE public.dish_techniques (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id uuid NOT NULL,
  technique_id uuid NOT NULL,
  step_order integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### 步骤2: 创建数据库函数
```sql
-- 更新时间戳函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 新用户处理函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$function$;

-- 新用户订阅处理函数
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, subscription_type, subscription_status, free_generations_used, free_generations_limit)
  VALUES (NEW.id, 'free', 'active', 0, 3)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
```

### 步骤3: 创建触发器
```sql
-- 新用户触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 新用户订阅触发器  
CREATE TRIGGER user_subscription_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();

-- 更新时间戳触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dishes_knowledge_base_updated_at
  BEFORE UPDATE ON public.dishes_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_zpay_orders_updated_at
  BEFORE UPDATE ON public.zpay_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 步骤4: 启用RLS并创建策略
```sql
-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooking_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zpay_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_techniques ENABLE ROW LEVEL SECURITY;

-- Profiles策略
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Subscriptions策略
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Ingredients Bank策略
CREATE POLICY "Users can view their own ingredients" ON public.ingredients_bank FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own ingredients" ON public.ingredients_bank FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ingredients" ON public.ingredients_bank FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ingredients" ON public.ingredients_bank FOR DELETE USING (auth.uid() = user_id);

-- Favorite Recipes策略
CREATE POLICY "Users can view their own favorites" ON public.favorite_recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own favorites" ON public.favorite_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON public.favorite_recipes FOR DELETE USING (auth.uid() = user_id);

-- Recipes History策略
CREATE POLICY "Users can view their own recipes" ON public.recipes_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recipes" ON public.recipes_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes" ON public.recipes_history FOR DELETE USING (auth.uid() = user_id);

-- Knowledge Base策略（公开查看，认证用户管理）
CREATE POLICY "Anyone can view dishes knowledge base" ON public.dishes_knowledge_base FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage dishes" ON public.dishes_knowledge_base FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view cooking techniques" ON public.cooking_techniques FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage cooking techniques" ON public.cooking_techniques FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view dish ingredients" ON public.dish_ingredients FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage dish ingredients" ON public.dish_ingredients FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view dish techniques" ON public.dish_techniques FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage dish techniques" ON public.dish_techniques FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Z-Pay Orders策略
CREATE POLICY "Users can view their own orders" ON public.zpay_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert zpay orders" ON public.zpay_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Update zpay orders" ON public.zpay_orders FOR UPDATE USING (true);
```

### 步骤5: 导入数据
使用备份文件中的数据，按表导入：
1. 先导入独立表数据（knowledge base相关）
2. 再导入用户相关数据
3. 最后导入关联数据

### 步骤6: 部署边缘函数
复制所有边缘函数代码到新项目：
- analyze-ingredients
- auto-create-accounts  
- check-subscription
- create-bulk-accounts
- create-checkout
- create-zpay-checkout
- generate-recipes
- process-apple-purchase
- reset-account-password
- stripe-webhook
- verify-stripe-payment
- zpay-webhook
- export-all-data

### 步骤7: 配置秘钥
在新项目中设置所有必需的秘钥：
- OPENAI_API_KEY
- DEEPSEEK_API_KEY  
- STRIPE_SECRET_KEY
- ZPAY_PID
- ZPAY_PKEY
- ADMIN_EXPORT_API_KEY (可选)

### 步骤8: 导入认证用户
使用备份中的auth_users数据恢复用户账户。

### 步骤9: 配置认证设置
- 邮件确认设置
- 密码强度要求
- JWT过期时间
- API速率限制

### 步骤10: 更新应用配置
更新前端应用中的Supabase配置：
- SUPABASE_URL
- SUPABASE_ANON_KEY

### 步骤11: 功能测试
逐一测试所有功能：
- ✅ 用户注册/登录
- ✅ 食材管理
- ✅ 菜谱生成
- ✅ 收藏功能
- ✅ 订阅功能
- ✅ 支付功能
- ✅ 知识库查询

## 验证清单

迁移完成后，使用此清单验证系统完整性：

- [ ] 所有数据表已创建并包含数据
- [ ] 所有RLS策略正常工作
- [ ] 用户可以正常注册/登录
- [ ] 所有边缘函数正常工作
- [ ] 支付流程正常
- [ ] 数据导出功能正常
- [ ] 应用所有功能与原系统一致

## 注意事项

1. **数据一致性**: 确保所有user_id引用正确映射
2. **权限设置**: 仔细检查RLS策略，确保安全性
3. **API密钥**: 妥善保管所有密钥，不要泄露
4. **测试环境**: 建议先在测试环境完整验证后再正式迁移
5. **备份保存**: 保留原系统备份直到确认迁移成功

按照此指南操作，可以确保新系统与原系统100%一致。