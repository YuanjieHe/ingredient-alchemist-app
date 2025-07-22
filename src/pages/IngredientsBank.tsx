import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { IngredientInput } from '@/components/IngredientInput';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ChefHat, ArrowRight, Package, ShoppingCart, X, AlertCircle, LogIn, User, Plus, Minus, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface IngredientWithQuantity {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}

const IngredientsBank = () => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [bankIngredients, setBankIngredients] = useState<IngredientWithQuantity[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientWithQuantity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');

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
        .select('name, category, quantity, unit')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Database access requires authentication, using localStorage fallback');
        // Fallback to localStorage
        const saved = localStorage.getItem('ingredientsBank');
        if (saved) {
          const ingredients = JSON.parse(saved);
          // Convert old format to new format if needed
          if (Array.isArray(ingredients) && ingredients.length > 0) {
            if (typeof ingredients[0] === 'string') {
              const convertedIngredients = ingredients.map((name: string) => ({
                name,
                quantity: 1,
                unit: 'pieces'
              }));
              setBankIngredients(convertedIngredients);
              localStorage.setItem('ingredientsBank', JSON.stringify(convertedIngredients));
            } else {
              setBankIngredients(ingredients);
            }
          }
        }
      } else {
        // Successfully loaded from database
        const ingredients = data?.map(item => ({
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'pieces',
          category: item.category
        })) || [];
        setBankIngredients(ingredients);
        // Also save to localStorage as backup
        localStorage.setItem('ingredientsBank', JSON.stringify(ingredients));
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

  const saveIngredientToDatabase = async (ingredient: IngredientWithQuantity) => {
    try {
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user, skipping database save');
        return false;
      }

      const { error } = await supabase
        .from('ingredients_bank')
        .upsert([
          { 
            name: ingredient.name, 
            category: ingredient.category || 'other',
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            user_id: user.id
          }
        ], {
          onConflict: 'user_id,name'
        });

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

  const removeIngredientFromDatabase = async (ingredientName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user, skipping database removal');
        return false;
      }

      const { error } = await supabase
        .from('ingredients_bank')
        .delete()
        .eq('name', ingredientName)
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
      !bankIngredients.some(existing => existing.name.toLowerCase() === ing.toLowerCase())
    );
    
    if (uniqueIngredients.length > 0) {
      const newIngredientObjects = uniqueIngredients.map(name => ({
        name,
        quantity: 1,
        unit: 'pieces'
      }));

      // Update local state immediately
      const updatedIngredients = [...bankIngredients, ...newIngredientObjects];
      setBankIngredients(updatedIngredients);
      
      // Save to localStorage
      localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));
      
      // Try to save to database
      let dbSaveCount = 0;
      for (const ingredient of newIngredientObjects) {
        const saved = await saveIngredientToDatabase(ingredient);
        if (saved) dbSaveCount++;
      }
      
      if (dbSaveCount > 0) {
        toast.success(`${t('added')} ${uniqueIngredients.length} ${t('ingredientsToBank')} (${t('savedToDatabase')})`);
      } else {
        toast.success(`${t('added')} ${uniqueIngredients.length} ${t('ingredientsToBank')} (${t('localStorageOnly')})`);
      }
    }
  };

  const updateQuantity = async (ingredientName: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const updatedIngredients = bankIngredients.map(item => 
      item.name === ingredientName ? { ...item, quantity: newQuantity } : item
    );
    setBankIngredients(updatedIngredients);
    localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));
    
    // Update in database
    const ingredient = updatedIngredients.find(item => item.name === ingredientName);
    if (ingredient) {
      await saveIngredientToDatabase(ingredient);
    }
  };

  const updateIngredientDetails = async (ingredientName: string, newQuantity: number, newUnit: string) => {
    if (newQuantity <= 0) return;
    
    const updatedIngredients = bankIngredients.map(item => 
      item.name === ingredientName ? { ...item, quantity: newQuantity, unit: newUnit } : item
    );
    setBankIngredients(updatedIngredients);
    localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));
    
    // Update in database
    const ingredient = updatedIngredients.find(item => item.name === ingredientName);
    if (ingredient) {
      await saveIngredientToDatabase(ingredient);
    }
    
    setEditingIngredient(null);
    toast.success(`${t('updated')} ${ingredientName}`);
  };

  const removeFromBank = async (ingredientName: string) => {
    // Update local state immediately
    const updatedIngredients = bankIngredients.filter(item => item.name !== ingredientName);
    setBankIngredients(updatedIngredients);
    setSelectedIngredients(selectedIngredients.filter(item => item.name !== ingredientName));
    
    // Update localStorage
    localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));
    
    // Try to remove from database
    await removeIngredientFromDatabase(ingredientName);
    
    toast.success(`${t('removed')} ${ingredientName}`);
  };

  const toggleIngredientSelection = (ingredient: IngredientWithQuantity) => {
    const isSelected = selectedIngredients.some(item => item.name === ingredient.name);
    if (isSelected) {
      setSelectedIngredients(selectedIngredients.filter(item => item.name !== ingredient.name));
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
    toast.success(t('navigatingToRecipeGenerator'));
    navigate('/');
  };

  const startEditing = (ingredient: IngredientWithQuantity) => {
    setEditingIngredient(ingredient.name);
    setEditQuantity(ingredient.quantity.toString());
    setEditUnit(ingredient.unit);
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
      {/* Header with Language Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-center space-y-2 flex-1">
          <h1 className="text-3xl font-bold text-foreground">{t('bankTitle')}</h1>
          <p className="text-muted-foreground">{t('bankSubtitle')}</p>
        </div>
        <LanguageToggle />
      </div>

      {/* Add New Ingredients Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('addNewIngredients')}
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
                    {t('yourCurrentInventory')}
                  </span>
                  <Badge variant="default" className="bg-gradient-to-r from-primary to-secondary text-white font-bold px-3 py-1 text-sm">
                    {bankIngredients.length} {t('items')}
                  </Badge>
                </div>
                {bankIngredients.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllIngredients} className="text-xs">
                      <Package className="w-3 h-3 mr-1" />
                      {t('selectAll')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection} className="text-xs">
                      {t('clearSelection')}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bankIngredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className={`relative group transition-all duration-300 ${
                      selectedIngredients.some(item => item.name === ingredient.name) 
                        ? 'transform scale-105 z-10' 
                        : ''
                    }`}
                  >
                    <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedIngredients.some(item => item.name === ingredient.name)
                        ? 'bg-gradient-to-br from-primary to-secondary text-white border-primary shadow-lg shadow-primary/25'
                        : 'bg-card hover:bg-gradient-to-br hover:from-cooking-warm hover:to-cooking-spice border-border hover:border-primary/50'
                    }`}>
                      {/* Ingredient Header */}
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleIngredientSelection(ingredient)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-2xl">
                            {getIngredientEmoji(ingredient.name)}
                          </div>
                          {selectedIngredients.some(item => item.name === ingredient.name) && (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-semibold break-words leading-tight mb-2">
                          {ingredient.name}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      {editingIngredient === ingredient.name ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="h-8 text-xs"
                              min="0.1"
                              step="0.1"
                            />
                            <Input
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="h-8 text-xs"
                              placeholder={t('unit')}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => updateIngredientDetails(ingredient.name, parseFloat(editQuantity), editUnit)}
                              className="flex-1 h-6 text-xs"
                            >
                              {t('save')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingIngredient(null)}
                              className="flex-1 h-6 text-xs"
                            >
                              {t('cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">
                              {ingredient.quantity} {ingredient.unit}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(ingredient)}
                              className="h-6 w-6 p-0 hover:bg-white/20"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(ingredient.name, ingredient.quantity - 0.5)}
                              className="flex-1 h-6 text-xs"
                              disabled={ingredient.quantity <= 0.5}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(ingredient.name, ingredient.quantity + 0.5)}
                              className="flex-1 h-6 text-xs"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromBank(ingredient.name);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110 flex items-center justify-center text-xs shadow-lg"
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
                        {t('selectedForCooking')}: {selectedIngredients.length} {t('ingredientsCount')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-h-20 overflow-y-auto">
                      {selectedIngredients.map((ingredient, index) => (
                        <Badge key={index} className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300 font-medium">
                          {getIngredientEmoji(ingredient.name)} {ingredient.name} ({ingredient.quantity} {ingredient.unit})
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      onClick={handleCookWithSelected}
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <ChefHat className="w-5 h-5 mr-2" />
                      {t('cookWithSelected')}
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
                  {t('bankEmpty')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('bankEmptyDesc')}
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
                    {t('loggedInAs')}: {user.email}
                  </h3>
                  <p className="text-sm text-green-700">
                    {t('ingredientsSyncedToCloud')}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                {t('logout')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-orange-800">
                    {t('authRequiredForPersistence')}
                  </h3>
                  <p className="text-sm text-orange-700">
                    {t('authNoticeMessage')}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t('login')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientsBank;