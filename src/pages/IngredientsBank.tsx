import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { IngredientInput } from '@/components/IngredientInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChefHat, ArrowRight, Package, ShoppingCart, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const IngredientsBank = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [bankIngredients, setBankIngredients] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load ingredients from both localStorage and database
  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    setIsLoading(true);
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from('ingredients_bank')
        .select('name, category')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Database access requires authentication, using localStorage fallback');
        // Fallback to localStorage
        const saved = localStorage.getItem('ingredientsBank');
        if (saved) {
          setBankIngredients(JSON.parse(saved));
        }
      } else {
        // Successfully loaded from database
        const ingredientNames = data?.map(item => item.name) || [];
        setBankIngredients(ingredientNames);
        // Also save to localStorage as backup
        localStorage.setItem('ingredientsBank', JSON.stringify(ingredientNames));
      }
    } catch (error) {
      console.log('Error loading ingredients:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('ingredientsBank');
      if (saved) {
        setBankIngredients(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveIngredientToDatabase = async (ingredient: string, category: string = 'other') => {
    try {
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user, skipping database save');
        return false;
      }

      const { error } = await supabase
        .from('ingredients_bank')
        .insert([
          { 
            name: ingredient, 
            category: category,
            user_id: user.id
          }
        ]);

      if (error) {
        console.log('Database save failed:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.log('Error saving to database:', error);
      return false;
    }
  };

  const removeIngredientFromDatabase = async (ingredient: string) => {
    try {
      const { error } = await supabase
        .from('ingredients_bank')
        .delete()
        .eq('name', ingredient);

      if (error) {
        console.log('Database removal requires authentication');
        return false;
      }
      return true;
    } catch (error) {
      console.log('Error removing from database:', error);
      return false;
    }
  };

  const handleAddToBank = async (newIngredients: string[]) => {
    // Add only new ingredients to avoid duplicates
    const uniqueIngredients = newIngredients.filter(ing => 
      !bankIngredients.some(existing => existing.toLowerCase() === ing.toLowerCase())
    );
    
    if (uniqueIngredients.length > 0) {
      // Update local state immediately
      const updatedIngredients = [...bankIngredients, ...uniqueIngredients];
      setBankIngredients(updatedIngredients);
      
      // Save to localStorage
      localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));
      
      // Try to save to database
      let dbSaveCount = 0;
      for (const ingredient of uniqueIngredients) {
        const saved = await saveIngredientToDatabase(ingredient);
        if (saved) dbSaveCount++;
      }
      
      if (dbSaveCount > 0) {
        toast.success(`${t('added') || '已添加'} ${uniqueIngredients.length} ${t('ingredientsToBank') || '种食材到银行'} (${t('savedToDatabase') || '已保存到数据库'})`);
      } else {
        toast.success(`${t('added') || '已添加'} ${uniqueIngredients.length} ${t('ingredientsToBank') || '种食材到银行'} (${t('localStorageOnly') || '仅本地存储'})`);
      }
    }
  };

  const removeFromBank = async (ingredient: string) => {
    // Update local state immediately
    const updatedIngredients = bankIngredients.filter(item => item !== ingredient);
    setBankIngredients(updatedIngredients);
    setSelectedIngredients(selectedIngredients.filter(item => item !== ingredient));
    
    // Update localStorage
    localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));
    
    // Try to remove from database
    await removeIngredientFromDatabase(ingredient);
    
    toast.success(`${t('removed') || '已移除'} ${ingredient}`);
  };

  const toggleIngredientSelection = (ingredient: string) => {
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(selectedIngredients.filter(item => item !== ingredient));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
  };

  const selectAllIngredients = () => {
    setSelectedIngredients([...bankIngredients]);
  };

  const clearSelection = () => {
    setSelectedIngredients([]);
  };

  const handleCookWithSelected = () => {
    if (selectedIngredients.length === 0) {
      toast.error(t('selectIngredientsFirst') || '请先选择食材');
      return;
    }
    
    localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients));
    toast.success(`${t('selected') || '已选择'} ${selectedIngredients.length} ${t('ingredients') || '种食材'}`);
    navigate('/');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t('ingredientsBank') || '食材银行'}</h1>
        <p className="text-muted-foreground">{t('manageFoodInventory') || '管理您的食物库存'}</p>
      </div>

      {/* Authentication Notice */}
      <Card className="shadow-lg border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-orange-800">
                {t('authRequiredForPersistence') || '需要登录以启用持久存储'}
              </h3>
              <p className="text-sm text-orange-700">
                {t('authNoticeMessage') || '当前食材将保存到本地存储。要在设备间同步和永久保存，需要启用用户认证功能。'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Ingredients Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('addNewIngredients') || '添加新食材'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IngredientInput 
            ingredients={[]}
            onIngredientsChange={handleAddToBank}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Current Inventory Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('currentInventory') || '当前库存'} 
              <Badge variant="secondary">{bankIngredients.length}</Badge>
            </CardTitle>
            {bankIngredients.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllIngredients}>
                  {t('selectAll') || '全选'}
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  {t('clearSelection') || '清空选择'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bankIngredients.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">{t('emptyInventory') || '库存为空'}</p>
              <p className="text-sm text-muted-foreground">{t('addIngredientsFirst') || '请先添加食材到您的银行'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {bankIngredients.map((ingredient, index) => (
                  <Badge
                    key={index}
                    variant={selectedIngredients.includes(ingredient) ? "default" : "secondary"}
                    className={`cursor-pointer transition-all hover:scale-105 px-3 py-2 ${
                      selectedIngredients.includes(ingredient) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-cooking-warm hover:text-foreground'
                    }`}
                    onClick={() => toggleIngredientSelection(ingredient)}
                  >
                    {ingredient}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromBank(ingredient);
                      }}
                      className="ml-2 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {selectedIngredients.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-center space-y-3">
                    <p className="text-green-800 font-medium">
                      {t('selectedForCooking') || '已选择用于烹饪'}: {selectedIngredients.length} {t('ingredients') || '种食材'}
                    </p>
                    <Button 
                      onClick={handleCookWithSelected}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      <ChefHat className="w-4 h-4 mr-2" />
                      {t('cookWithSelected') || '用选中食材烹饪'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientsBank;