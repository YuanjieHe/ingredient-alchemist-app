import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { IngredientInput } from '@/components/IngredientInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChefHat, ArrowRight, Package, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const IngredientsBank = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [bankIngredients, setBankIngredients] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  // Load ingredients from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ingredientsBank');
    if (saved) {
      setBankIngredients(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever bank changes
  useEffect(() => {
    localStorage.setItem('ingredientsBank', JSON.stringify(bankIngredients));
  }, [bankIngredients]);

  const handleAddToBank = (newIngredients: string[]) => {
    // Add only new ingredients to avoid duplicates
    const uniqueIngredients = newIngredients.filter(ing => 
      !bankIngredients.some(existing => existing.toLowerCase() === ing.toLowerCase())
    );
    
    if (uniqueIngredients.length > 0) {
      setBankIngredients([...bankIngredients, ...uniqueIngredients]);
      toast.success(`${t('added') || '已添加'} ${uniqueIngredients.length} ${t('ingredientsToBank') || '种食材到银行'}`);
    }
  };

  const removeFromBank = (ingredient: string) => {
    setBankIngredients(bankIngredients.filter(item => item !== ingredient));
    setSelectedIngredients(selectedIngredients.filter(item => item !== ingredient));
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