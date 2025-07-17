import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { IngredientInput } from '@/components/IngredientInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChefHat, ArrowRight, Package, ShoppingCart, X, AlertCircle, LogIn, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const IngredientsBank = () => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user, skipping database removal');
        return false;
      }

      const { error } = await supabase
        .from('ingredients_bank')
        .delete()
        .eq('name', ingredient)
        .eq('user_id', user.id);

      if (error) {
        console.log('Database removal failed:', error.message);
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

  const getIngredientEmoji = (ingredient: string) => {
    const lower = ingredient.toLowerCase();
    if (lower.includes('chicken') || lower.includes('beef') || lower.includes('pork') || lower.includes('fish') || lower.includes('meat')) return '🍖';
    if (lower.includes('rice')) return '🍚';
    if (lower.includes('tomato')) return '🍅';
    if (lower.includes('onion')) return '🧅';
    if (lower.includes('garlic')) return '🧄';
    if (lower.includes('potato')) return '🥔';
    if (lower.includes('carrot')) return '🥕';
    if (lower.includes('egg')) return '🥚';
    if (lower.includes('milk') || lower.includes('cheese')) return '🥛';
    if (lower.includes('bread')) return '🍞';
    if (lower.includes('apple')) return '🍎';
    if (lower.includes('banana')) return '🍌';
    if (lower.includes('pepper')) return '🌶️';
    if (lower.includes('corn')) return '🌽';
    if (lower.includes('lettuce') || lower.includes('cabbage') || lower.includes('spinach')) return '🥬';
    if (lower.includes('mushroom')) return '🍄';
    if (lower.includes('avocado')) return '🥑';
    return '🥬'; // Default vegetable emoji
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t('ingredientsBank') || '食材银行'}</h1>
        <p className="text-muted-foreground">{t('manageFoodInventory') || '管理您的食物库存'}</p>
      </div>

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

      {/* Real-time Inventory Display - Shows immediately when ingredients are added */}
      {bankIngredients.length > 0 && (
        <>
          <Separator />
          <Card className="shadow-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {t('yourCurrentInventory') || '您当前的库存'}
                  </span>
                  <Badge variant="default" className="bg-gradient-to-r from-primary to-secondary text-white font-bold px-3 py-1 text-sm">
                    {bankIngredients.length} {t('items') || '项'}
                  </Badge>
                </div>
                {bankIngredients.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllIngredients} className="text-xs">
                      <Package className="w-3 h-3 mr-1" />
                      {t('selectAll') || '全选'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection} className="text-xs">
                      {t('clearSelection') || '清空'}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {bankIngredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className={`relative group cursor-pointer transition-all duration-300 hover:scale-110 ${
                      selectedIngredients.includes(ingredient) 
                        ? 'transform scale-105 z-10' 
                        : ''
                    }`}
                    onClick={() => toggleIngredientSelection(ingredient)}
                  >
                    <div className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      selectedIngredients.includes(ingredient)
                        ? 'bg-gradient-to-br from-primary to-secondary text-white border-primary shadow-lg shadow-primary/25'
                        : 'bg-card hover:bg-gradient-to-br hover:from-cooking-warm hover:to-cooking-spice border-border hover:border-primary/50 hover:text-white'
                    }`}>
                      <div className="text-3xl mb-2 animate-bounce">
                        {getIngredientEmoji(ingredient)}
                      </div>
                      <div className="text-xs font-semibold break-words leading-tight">
                        {ingredient}
                      </div>
                      {selectedIngredients.includes(ingredient) && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromBank(ingredient);
                      }}
                      className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110 flex items-center justify-center text-xs shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {selectedIngredients.length > 0 && (
                <div className="mt-6 p-6 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-2 border-green-300 rounded-xl shadow-lg">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                        <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-green-800 font-bold text-lg">
                        {t('selectedForCooking') || '已选择用于烹饪'}: {selectedIngredients.length} {t('ingredients') || '种食材'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-h-20 overflow-y-auto">
                      {selectedIngredients.map((ingredient, index) => (
                        <Badge key={index} className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300 font-medium">
                          {getIngredientEmoji(ingredient)} {ingredient}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      onClick={handleCookWithSelected}
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <ChefHat className="w-5 h-5 mr-2" />
                      {t('cookWithSelected') || '用选中食材烹饪'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {bankIngredients.length === 0 && (
        <>
          <Separator />
          <Card className="shadow-lg border-dashed border-2 border-muted-foreground/20">
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl opacity-50">📦</div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-muted-foreground">
                  {t('emptyInventory') || '库存为空'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('addIngredientsFirst') || '请先添加食材到您的银行'}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Authentication Status */}
      <Card className={`shadow-lg ${user ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50'}`}>
        <CardContent className="p-4">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-green-800">
                    已登录：{user.email}
                  </h3>
                  <p className="text-sm text-green-700">
                    食材将自动同步到云端数据库
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                退出登录
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-orange-800">
                    {t('authRequiredForPersistence') || '需要登录以启用持久存储'}
                  </h3>
                  <p className="text-sm text-orange-700">
                    {t('authNoticeMessage') || '当前食材将保存到本地存储。登录后可在设备间同步和永久保存。'}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                登录
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientsBank;