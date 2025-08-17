-- Fix critical security vulnerability in knowledge base tables
-- Create admin role system and secure knowledge base access

-- Step 1: Create role enum and add role column to profiles
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator');

ALTER TABLE public.profiles 
ADD COLUMN role public.user_role DEFAULT 'user' NOT NULL;

-- Step 2: Create security definer function to check admin status
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
$$;

-- Step 3: Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_role public.user_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = _role
  );
$$;

-- Step 4: Drop insecure policies on knowledge base tables
DROP POLICY IF EXISTS "Authenticated users can manage dishes" ON public.dishes_knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can manage dish ingredients" ON public.dish_ingredients;
DROP POLICY IF EXISTS "Authenticated users can manage cooking techniques" ON public.cooking_techniques;
DROP POLICY IF EXISTS "Authenticated users can manage dish techniques" ON public.dish_techniques;

-- Step 5: Create secure admin-only policies for knowledge base tables

-- dishes_knowledge_base policies
CREATE POLICY "Only admins can insert dishes"
ON public.dishes_knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update dishes"
ON public.dishes_knowledge_base
FOR UPDATE
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Only admins can delete dishes"
ON public.dishes_knowledge_base
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- dish_ingredients policies
CREATE POLICY "Only admins can insert dish ingredients"
ON public.dish_ingredients
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update dish ingredients"
ON public.dish_ingredients
FOR UPDATE
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Only admins can delete dish ingredients"
ON public.dish_ingredients
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- cooking_techniques policies
CREATE POLICY "Only admins can insert cooking techniques"
ON public.cooking_techniques
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update cooking techniques"
ON public.cooking_techniques
FOR UPDATE
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Only admins can delete cooking techniques"
ON public.cooking_techniques
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- dish_techniques policies
CREATE POLICY "Only admins can insert dish techniques"
ON public.dish_techniques
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update dish techniques"
ON public.dish_techniques
FOR UPDATE
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Only admins can delete dish techniques"
ON public.dish_techniques
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- Step 6: Update existing admin functions to use proper search_path
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(id uuid, user_id uuid, display_name text, language text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT id, user_id, display_name, language, created_at, updated_at
  FROM profiles
  ORDER BY created_at DESC;
$function$;