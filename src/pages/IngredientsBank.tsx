import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

const IngredientsBank = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchIngredients();
    }
  }, [user]);

  const fetchIngredients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ingredients_bank')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      toast.error(t('fetchIngredientsError') || '获取食材失败');
    }
  };

  const addIngredient = async () => {
    if (!newIngredient.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ingredients_bank')
        .insert([
          {
            user_id: user.id,
            name: newIngredient.trim(),
            category: 'other'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setIngredients(prev => [data, ...prev]);
      setNewIngredient('');
      toast.success(t('ingredientAdded') || '食材添加成功');
    } catch (error: any) {
      console.error('Error adding ingredient:', error);
      if (error.code === '23505') {
        toast.error(t('ingredientExists') || '该食材已存在');
      } else {
        toast.error(t('addIngredientError') || '添加食材失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeIngredient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ingredients_bank')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
      toast.success(t('ingredientRemoved') || '食材移除成功');
    } catch (error) {
      console.error('Error removing ingredient:', error);
      toast.error(t('removeIngredientError') || '移除食材失败');
    }
  };

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addIngredient();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{t('ingredientsBank') || '食材银行'}</span>
            <Badge variant="secondary">{ingredients.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new ingredient */}
          <div className="flex space-x-2">
            <Input
              placeholder={t('addIngredientPlaceholder') || '添加新食材...'}
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={addIngredient} 
              disabled={!newIngredient.trim() || loading}
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('searchIngredients') || '搜索食材...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Ingredients list */}
          <div className="space-y-3">
            {filteredIngredients.length > 0 ? (
              <div className="grid gap-2">
                {filteredIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="font-medium">{ingredient.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIngredient(ingredient.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 
                  (t('noIngredientsFound') || '未找到匹配的食材') : 
                  (t('noIngredientsYet') || '还没有添加任何食材')
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientsBank;