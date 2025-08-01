import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, Users, ChefHat, Utensils, BookOpen, Heart, Share, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DetailedRecipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  ingredients: Array<{
    item: string;
    amount: string;
    needed?: boolean;
  }>;
  detailedSteps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    duration: string;
    tips?: string;
  }>;
  tips?: string[];
  nutritionInfo?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<DetailedRecipe | null>(null);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

  useEffect(() => {
    // Try to load recipe from localStorage first
    const savedRecipe = localStorage.getItem('selectedRecipe');
    if (savedRecipe) {
      try {
        const parsedRecipe = JSON.parse(savedRecipe);
        setRecipe(parsedRecipe);
        
        // Automatically generate detailed steps if not available
        if (!parsedRecipe.detailedSteps || parsedRecipe.detailedSteps.length === 0) {
          generateDetailedRecipe(parsedRecipe);
        }
      } catch (error) {
        console.error('Error parsing saved recipe:', error);
        navigate('/recipes');
      }
    } else {
      navigate('/recipes');
    }
  }, [id, navigate]);

  const generateDetailedRecipe = async (baseRecipe: any) => {
    setIsGeneratingDetails(true);
    
    try {
      console.log('Generating detailed recipe for:', baseRecipe.title);
      
      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: {
          singleDishMode: true,
          dishName: baseRecipe.title,
          dishDescription: baseRecipe.description,
          ingredients: baseRecipe.ingredients?.map((ing: any) => ing.item) || [],
          skillLevel: baseRecipe.difficulty || 'beginner',
          peopleCount: baseRecipe.servings || 4,
          language: language
        }
      });

      if (error) {
        console.error('Error generating detailed recipe:', error);
        throw new Error(error.message);
      }

      console.log('Detailed recipe generated:', data);
      
      if (data?.detailedRecipe) {
        const updatedRecipe = {
          ...baseRecipe,
          detailedSteps: data.detailedRecipe.detailedSteps || [],
          tips: data.detailedRecipe.tips || baseRecipe.tips || [],
          nutritionInfo: data.detailedRecipe.nutritionInfo || baseRecipe.nutritionInfo,
          ingredients: data.detailedRecipe.ingredients || baseRecipe.ingredients
        };
        
        setRecipe(updatedRecipe);
        localStorage.setItem('selectedRecipe', JSON.stringify(updatedRecipe));
        toast.success(t('detailedRecipeGenerated'));
      }
    } catch (error) {
      console.error('Failed to generate detailed recipe:', error);
      toast.error(t('detailedRecipeGenerationFailed'));
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleSave = async () => {
    if (!user || !recipe) {
      toast.error(t('loginRequired'));
      return;
    }

    try {
      const { error } = await supabase
        .from('favorite_recipes')
        .insert({
          user_id: user.id,
          recipe_id: recipe.id,
          recipe_data: recipe as any
        });

      if (error) throw error;
      
      toast.success(t('savedToFavorites'));
    } catch (error: any) {
      console.error('Error saving favorite:', error);
      if (error.code === '23505') {
        toast.error(t('alreadyFavorited'));
      } else {
        toast.error(t('saveFavoriteFailed'));
      }
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success(t('linkCopied'));
  };

  const handleRegenerateDetails = () => {
    if (recipe) {
      generateDetailedRecipe(recipe);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-cooking-herb text-white';
      case 'intermediate':
        return 'bg-cooking-spice text-white';
      case 'advanced':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  if (!recipe) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/recipes')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToRecipes')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            {t('backToPreviousPage')}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRegenerateDetails}
            disabled={isGeneratingDetails}
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingDetails ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSave}
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleShare}
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Recipe Card */}
      <Card className="overflow-hidden shadow-warm">
        <CardHeader className="bg-gradient-warm">
          <div className="space-y-4">
            <CardTitle className="text-2xl">{recipe.title}</CardTitle>
            <p className="text-muted-foreground">{recipe.description}</p>
            
            <div className="flex flex-wrap gap-2">
              <Badge className={getDifficultyColor(recipe.difficulty)}>
                <ChefHat className="w-3 h-3 mr-1" />
                {recipe.difficulty === 'beginner' ? t('beginner') : recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
              </Badge>
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                {recipe.prepTime + recipe.cookTime} {t('min')}
              </Badge>
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {recipe.servings} {t('servings')}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Ingredients */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center">
              <Utensils className="w-4 h-4 mr-2 text-primary" />
              {t('requiredIngredients')}
            </h4>
            <div className="grid gap-2">
              {recipe.ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className={`
                    flex justify-between items-center p-3 rounded-md
                    ${ingredient.needed 
                      ? 'bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' 
                      : 'bg-muted'
                    }
                  `}
                >
                  <span className="font-medium">{ingredient.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">{ingredient.amount}</span>
                    {ingredient.needed && (
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                        {t('needToBuy')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Detailed Steps */}
          {isGeneratingDetails ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>{t('generatingDetailedSteps')}</span>
              </div>
            </div>
          ) : recipe.detailedSteps && recipe.detailedSteps.length > 0 ? (
            <div className="space-y-6">
              <h4 className="font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {t('detailedCookingSteps')}
              </h4>
              <div className="space-y-6">
                {recipe.detailedSteps.map((step, index) => (
                  <Card key={index} className="p-4 bg-muted/30">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                          {step.stepNumber}
                        </span>
                        <div>
                          <h5 className="font-semibold">{step.title}</h5>
                          <span className="text-sm text-muted-foreground">{step.duration}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm leading-relaxed">{step.description}</p>
                      
                      {step.tips && (
                        <div className="bg-cooking-cream p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">💡 {t('tip')}: </span>
                            {step.tips}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t('noDetailedStepsAvailable')}</p>
              <Button onClick={handleRegenerateDetails} disabled={isGeneratingDetails}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('generateDetailedSteps')}
              </Button>
            </div>
          )}

          {/* Tips */}
          {recipe.tips && recipe.tips.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">{t('cookingTips')}</h4>
                <ul className="space-y-2">
                  {recipe.tips.map((tip, index) => (
                    <li key={index} className="text-sm bg-cooking-cream p-3 rounded-md">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Nutrition */}
          {recipe.nutritionInfo && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">{t('nutritionPerServing')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-md">
                    <div className="font-bold text-primary">{recipe.nutritionInfo.calories}</div>
                    <div className="text-xs text-muted-foreground">{t('calories')}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-md">
                    <div className="font-bold text-primary">{recipe.nutritionInfo.protein}</div>
                    <div className="text-xs text-muted-foreground">{t('protein')}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-md">
                    <div className="font-bold text-primary">{recipe.nutritionInfo.carbs}</div>
                    <div className="text-xs text-muted-foreground">{t('carbs')}</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-md">
                    <div className="font-bold text-primary">{recipe.nutritionInfo.fat}</div>
                    <div className="text-xs text-muted-foreground">{t('fat')}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeDetail;