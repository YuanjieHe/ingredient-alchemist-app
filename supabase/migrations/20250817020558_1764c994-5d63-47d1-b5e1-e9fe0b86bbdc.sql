-- Create admin functions to bypass RLS for dashboard data

-- Function to get user count and recent users for admin
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  language text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, user_id, display_name, language, created_at, updated_at
  FROM profiles
  ORDER BY created_at DESC;
$$;

-- Function to get subscription data for admin
CREATE OR REPLACE FUNCTION get_admin_subscriptions()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subscription_type text,
  subscription_status text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, user_id, subscription_type, subscription_status, created_at
  FROM user_subscriptions
  ORDER BY created_at DESC;
$$;

-- Function to get order data for admin
CREATE OR REPLACE FUNCTION get_admin_orders()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  order_id text,
  plan_type text,
  amount integer,
  status text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, user_id, order_id, plan_type, amount, status, created_at
  FROM zpay_orders
  ORDER BY created_at DESC;
$$;

-- Function to get recipe count for admin
CREATE OR REPLACE FUNCTION get_admin_recipe_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM recipes_history;
$$;

-- Function to get favorites count for admin
CREATE OR REPLACE FUNCTION get_admin_favorites_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM favorite_recipes;
$$;

-- Function to get ingredients count for admin
CREATE OR REPLACE FUNCTION get_admin_ingredients_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM ingredients_bank;
$$;