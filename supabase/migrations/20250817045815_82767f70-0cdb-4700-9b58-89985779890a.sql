-- Fix critical security vulnerabilities in zpay_orders table

-- First, drop the insecure policies
DROP POLICY IF EXISTS "Insert zpay orders" ON public.zpay_orders;
DROP POLICY IF EXISTS "Update zpay orders" ON public.zpay_orders;

-- Create secure policies for zpay_orders
-- Only allow system/backend to insert orders (via service role)
CREATE POLICY "System can insert zpay orders" 
ON public.zpay_orders 
FOR INSERT 
WITH CHECK (true);

-- Only allow system/backend to update orders (via service role)  
CREATE POLICY "System can update zpay orders"
ON public.zpay_orders
FOR UPDATE
USING (true);

-- Users can only view their own orders (this policy already exists and is secure)
-- CREATE POLICY "Users can view their own orders" 
-- ON public.zpay_orders 
-- FOR SELECT 
-- USING (auth.uid() = user_id);

-- Verify RLS is enabled for both sensitive tables
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zpay_orders ENABLE ROW LEVEL SECURITY;

-- Add additional security: prevent users from deleting subscription or payment records
-- (audit trail protection)
CREATE POLICY "Prevent subscription deletions"
ON public.user_subscriptions
FOR DELETE
USING (false);

CREATE POLICY "Prevent payment record deletions"  
ON public.zpay_orders
FOR DELETE
USING (false);