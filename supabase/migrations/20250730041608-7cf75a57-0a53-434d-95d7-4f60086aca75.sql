-- Create table for Z-Pay orders
CREATE TABLE public.zpay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.zpay_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own orders" 
ON public.zpay_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Insert zpay orders" 
ON public.zpay_orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Update zpay orders" 
ON public.zpay_orders 
FOR UPDATE 
USING (true);