import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { IngredientInput } from '@/components/IngredientInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const IngredientsBank = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<string[]>([]);

  const handleCookWithIngredients = () => {
    if (ingredients.length === 0) {
      toast.error(t('addIngredientsFirst') || '请先添加食材');
      return;
    }
    
    // Store ingredients in localStorage to pass to recipe generator
    localStorage.setItem('selectedIngredients', JSON.stringify(ingredients));
    toast.success(t('ingredientsSelected') || '食材已选择，正在跳转到食谱生成器');
    navigate('/');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t('ingredientsBank') || '食材银行'}</h1>
        <p className="text-muted-foreground">{t('manageYourIngredients') || '管理您的食材库存'}</p>
      </div>
      
      <IngredientInput 
        ingredients={ingredients} 
        onIngredientsChange={setIngredients} 
      />

      {ingredients.length > 0 && (
        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">{t('readyToCook') || '准备烹饪？'}</h3>
              <p className="text-muted-foreground text-sm">
                {t('selectedIngredients') || '已选择'} {ingredients.length} {t('ingredients') || '种食材'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {ingredients.slice(0, 8).map((ingredient, index) => (
                <Badge key={index} variant="secondary" className="bg-cooking-warm text-foreground">
                  {ingredient}
                </Badge>
              ))}
              {ingredients.length > 8 && (
                <Badge variant="outline">+{ingredients.length - 8} {t('more') || '更多'}</Badge>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Button 
                onClick={handleCookWithIngredients}
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <ChefHat className="w-5 h-5 mr-2" />
                {t('generateRecipes') || '生成食谱'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IngredientsBank;