-- 为管理员账号设置终身会员权限
UPDATE public.user_subscriptions 
SET 
  subscription_type = 'lifetime',
  subscription_status = 'active',
  free_generations_used = 0,
  free_generations_limit = -1,
  subscription_start_date = now(),
  subscription_end_date = NULL,
  updated_at = now()
WHERE user_id = '274354ca-7b0a-4a58-b438-fe6ffdc7e69a';