-- Create trigger to automatically create subscription record for new users
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

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();

-- Insert subscription record for existing user
INSERT INTO public.user_subscriptions (user_id, subscription_type, subscription_status, free_generations_used, free_generations_limit)
VALUES ('274354ca-7b0a-4a58-b438-fe6ffdc7e69a', 'free', 'active', 0, 3)
ON CONFLICT (user_id) DO NOTHING;