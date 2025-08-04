-- 将 ellaliu080606@gmail.com 设置为终生会员
UPDATE public.user_subscriptions 
SET 
  subscription_type = 'premium',
  subscription_status = 'active',
  subscription_start_date = now(),
  subscription_end_date = (now() + interval '50 years'), -- 设置为50年后过期（相当于终生）
  free_generations_used = 0,
  updated_at = now()
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'ellaliu080606@gmail.com'
);

-- 如果该用户还没有订阅记录，则创建一个
INSERT INTO public.user_subscriptions (
  user_id, 
  subscription_type, 
  subscription_status, 
  subscription_start_date, 
  subscription_end_date, 
  free_generations_used,
  free_generations_limit,
  created_at,
  updated_at
)
SELECT 
  id,
  'premium',
  'active',
  now(),
  (now() + interval '50 years'),
  0,
  3,
  now(),
  now()
FROM auth.users 
WHERE email = 'ellaliu080606@gmail.com'
  AND id NOT IN (
    SELECT user_id 
    FROM public.user_subscriptions 
    WHERE user_id = auth.users.id
  );