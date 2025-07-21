-- Add quantity and unit columns to ingredients_bank table
ALTER TABLE public.ingredients_bank 
ADD COLUMN quantity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN unit TEXT DEFAULT 'pieces';

-- Add index for better performance on user queries
CREATE INDEX idx_ingredients_bank_user_id_name ON public.ingredients_bank(user_id, name);