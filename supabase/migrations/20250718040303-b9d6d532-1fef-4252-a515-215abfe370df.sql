-- Create dishes knowledge base tables
CREATE TABLE public.dishes_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine_type TEXT NOT NULL DEFAULT 'chinese',
  difficulty_level TEXT NOT NULL DEFAULT 'medium',
  cooking_time INTEGER NOT NULL DEFAULT 30,
  serving_size INTEGER NOT NULL DEFAULT 2,
  description TEXT,
  instructions JSONB NOT NULL,
  nutrition_info JSONB,
  cultural_background TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dish ingredients relationship table
CREATE TABLE public.dish_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id UUID NOT NULL REFERENCES public.dishes_knowledge_base(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  quantity TEXT,
  is_optional BOOLEAN DEFAULT FALSE,
  is_substitutable BOOLEAN DEFAULT FALSE,
  substitute_options TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cooking techniques table
CREATE TABLE public.cooking_techniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  difficulty_level TEXT NOT NULL DEFAULT 'medium',
  equipment_needed TEXT[],
  tips TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dish techniques relationship table
CREATE TABLE public.dish_techniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id UUID NOT NULL REFERENCES public.dishes_knowledge_base(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.cooking_techniques(id) ON DELETE CASCADE,
  step_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dish_id, technique_id)
);

-- Enable Row Level Security
ALTER TABLE public.dishes_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooking_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_techniques ENABLE ROW LEVEL SECURITY;

-- Create policies - Allow all authenticated users to read knowledge base
CREATE POLICY "Anyone can view dishes knowledge base" 
ON public.dishes_knowledge_base 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view dish ingredients" 
ON public.dish_ingredients 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view cooking techniques" 
ON public.cooking_techniques 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view dish techniques" 
ON public.dish_techniques 
FOR SELECT 
USING (true);

-- For now, only allow authenticated users to insert/update (later we can restrict to admins)
CREATE POLICY "Authenticated users can manage dishes" 
ON public.dishes_knowledge_base 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage dish ingredients" 
ON public.dish_ingredients 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage cooking techniques" 
ON public.cooking_techniques 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage dish techniques" 
ON public.dish_techniques 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_dishes_cuisine_type ON public.dishes_knowledge_base(cuisine_type);
CREATE INDEX idx_dishes_difficulty ON public.dishes_knowledge_base(difficulty_level);
CREATE INDEX idx_dish_ingredients_dish_id ON public.dish_ingredients(dish_id);
CREATE INDEX idx_dish_ingredients_name ON public.dish_ingredients(ingredient_name);
CREATE INDEX idx_dish_techniques_dish_id ON public.dish_techniques(dish_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dishes_knowledge_base_updated_at
BEFORE UPDATE ON public.dishes_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();