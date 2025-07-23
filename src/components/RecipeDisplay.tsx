import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, ChefHat, Utensils, Heart, Share, Coffee, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface Dish {
  name: string;
  type: 'main' | 'side' | 'soup';
  description: string;
}

interface DishInstruction {
  dishName: string;
  type: 'main' | 'side' | 'soup';
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    duration: string;
    tips?: string;
    imagePrompt?: string;
    imageUrl?: string;
  }>;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  mealType?: string;
  dishes?: Dish[];
  dishInstructions?: DishInstruction[];
  knowledgeBaseReferences?: string[];
  coordinationTips?: string[];
  imageUrl?: string;
  ingredients: Array<{
    item: string;
    amount: string;
    needed?: boolean;
    usedIn?: string;
  }>;
  instructions: string[];
  detailedSteps?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    duration: string;
    tips?: string;
    imagePrompt?: string;
    imageUrl?: string;
  }>;
  tips?: string[];
  nutritionInfo?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

interface RecipeDisplayProps {
  recipes: Recipe[];
  onSaveRecipe?: (recipe: Recipe) => void;
  onShareRecipe?: (recipe: Recipe) => void;
}

export const RecipeDisplay = ({ recipes, onSaveRecipe, onShareRecipe }: RecipeDisplayProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedDishTab, setSelectedDishTab] = useState<string>("overview");
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

  const handleSave = async (recipe: Recipe) => {
    if (!user) {
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
      
      onSaveRecipe?.(recipe);
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

  const handleShare = (recipe: Recipe) => {
    onShareRecipe?.(recipe);
    toast.success(t('linkCopied'));
  };

  const handleCookRecipe = async (recipe: Recipe) => {
    try {
      // Get current ingredients from localStorage
      const bankIngredients = localStorage.getItem('ingredientsBank');
      let currentIngredients: any[] = [];
      
      if (bankIngredients) {
        currentIngredients = JSON.parse(bankIngredients);
      }

      // Track ingredients that couldn't be deducted
      const missingIngredients: string[] = [];
      
      // Deduct recipe ingredients from bank
      const updatedIngredients = currentIngredients.map(ingredient => {
        const recipeIngredient = recipe.ingredients.find(ri => 
          ri.item.toLowerCase().includes(ingredient.name.toLowerCase()) ||
          ingredient.name.toLowerCase().includes(ri.item.toLowerCase())
        );
        
        if (recipeIngredient) {
          const newQuantity = Math.max(0, ingredient.quantity - 1);
          if (newQuantity === 0 && ingredient.quantity > 0) {
            missingIngredients.push(ingredient.name);
          }
          return { ...ingredient, quantity: newQuantity };
        }
        return ingredient;
      });

      // Save to localStorage
      localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));

      // Update Supabase if user is authenticated
      if (user) {
        for (const ingredient of updatedIngredients) {
          await supabase
            .from('ingredients_bank')
            .update({ quantity: ingredient.quantity })
            .eq('user_id', user.id)
            .eq('name', ingredient.name);
        }
      }

      if (missingIngredients.length > 0) {
        toast.success(t('recipeCooked') + ' ' + t('someIngredientsUsedUp'));
      } else {
        toast.success(t('recipeCooked'));
      }
    } catch (error) {
      console.error('Error cooking recipe:', error);
      toast.error(t('cookingFailed'));
    }
  };

  const getDishIcon = (type: string) => {
    switch (type) {
      case 'main': return '🍗';
      case 'side': return '🥗';
      case 'soup': return '🍜';
      default: return '🍽️';
    }
  };

  const getDishTypeText = (type: string) => {
    switch (type) {
      case 'main': return t('main');
      case 'side': return t('side');
      case 'soup': return t('soup');
      default: return t('dish');
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl text-muted-foreground">{t('noMealCombinations')}</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('yourMealPlanCombinations')}
        </h2>
        <p className="text-muted-foreground">
          {t('balancedMealCreated')} {recipes.length} {recipes.length === 1 ? t('balancedMealCombinations') : t('balancedMealCombinationsPlural')} {t('forYou')}
        </p>
      </div>

      <div className="grid gap-6">
        {recipes.map((recipe) => (
          <Card 
            key={recipe.id} 
            className="overflow-hidden shadow-warm hover:shadow-primary transition-all duration-300"
          >
            {/* Recipe Image */}
            {recipe.imageUrl && (
              <div className="w-full h-64 overflow-hidden">
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <CardHeader className="bg-gradient-warm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{recipe.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">{recipe.description}</p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave(recipe);
                    }}
                    className="hover:bg-white/20"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(recipe);
                    }}
                    className="hover:bg-white/20"
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
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
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Traditional inspiration */}
              {recipe.knowledgeBaseReferences && recipe.knowledgeBaseReferences.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-primary" />
                    {t('traditionalInspiration')}
                  </h4>
                  <div className="bg-gradient-subtle p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('thisRecipeInspiredBy')}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recipe.knowledgeBaseReferences.map((ref, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          🍜 {ref}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('enhancedWithKnowledgeBase')}
                    </p>
                  </div>
                </div>
              )}

              {recipe.knowledgeBaseReferences && recipe.knowledgeBaseReferences.length > 0 && <Separator />}

              {/* Meal combination display */}
              {recipe.dishes && recipe.dishes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Coffee className="w-4 h-4 mr-2 text-primary" />
                    {t('mealCombination')}
                  </h4>
                  <div className="grid gap-3">
                    {recipe.dishes.map((dish, index) => (
                      <div key={index} className="flex items-center p-3 bg-cooking-cream rounded-lg">
                        <div className="text-2xl mr-3">{getDishIcon(dish.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{dish.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getDishTypeText(dish.type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{dish.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Ingredients list */}
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
                      <div className="flex-1">
                        <span className="font-medium">{ingredient.item}</span>
                        {ingredient.usedIn && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({ingredient.usedIn})
                          </span>
                        )}
                      </div>
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

              {/* Dish-by-Dish Cooking Instructions */}
              {recipe.dishInstructions && recipe.dishInstructions.length > 0 ? (
                <div className="space-y-6">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {t('detailedCookingSteps')}
                  </h4>
                  
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 gap-1">
                      <TabsTrigger value="overview" className="text-xs px-2">
                        📋 总览
                      </TabsTrigger>
                      {recipe.dishInstructions.map((dishInstruction, index) => (
                        <TabsTrigger 
                          key={index} 
                          value={`dish-${index}`}
                          className="text-xs px-2 flex items-center gap-1"
                        >
                          {getDishIcon(dishInstruction.type)}
                          <span className="hidden sm:inline">
                            {dishInstruction.dishName.replace(/【.*】/, '').substring(0, 6)}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                      <Card className="p-4 bg-gradient-subtle">
                        <h5 className="font-bold mb-3">🍽️ 套餐制作总览</h5>
                        <div className="grid gap-3">
                          {recipe.dishInstructions.map((dishInstruction, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">{getDishIcon(dishInstruction.type)}</div>
                                <div>
                                  <div className="font-medium">{dishInstruction.dishName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {dishInstruction.steps.length} 个制作步骤
                                  </div>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const tabTrigger = document.querySelector(`[data-state="inactive"][value="dish-${index}"]`) as HTMLElement;
                                  if (tabTrigger) tabTrigger.click();
                                }}
                              >
                                查看制作
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        {/* Coordination Tips in Overview */}
                        {recipe.coordinationTips && recipe.coordinationTips.length > 0 && (
                          <div className="mt-4">
                            <h6 className="font-semibold mb-2 flex items-center gap-2">
                              <ChefHat className="h-4 w-4" />
                              协调技巧
                            </h6>
                            <ul className="space-y-2">
                              {recipe.coordinationTips.map((tip, index) => (
                                <li key={index} className="text-sm bg-cooking-cream p-3 rounded-md border-l-4 border-primary">
                                  <span className="font-medium">👨‍🍳 </span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Card>
                    </TabsContent>

                    {/* Individual Dish Tabs */}
                    {recipe.dishInstructions.map((dishInstruction, dishIndex) => (
                      <TabsContent key={dishIndex} value={`dish-${dishIndex}`} className="space-y-4">
                        {/* Dish Header */}
                        <Card className="p-4 bg-gradient-subtle">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-3xl">{getDishIcon(dishInstruction.type)}</div>
                            <div>
                              <h5 className="font-bold text-lg">{dishInstruction.dishName}</h5>
                              <Badge variant="outline">
                                {getDishTypeText(dishInstruction.type)}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Dish-specific Ingredients */}
                          <div className="mt-4">
                            <h6 className="font-semibold mb-2 flex items-center gap-2">
                              <Utensils className="h-4 w-4" />
                              本菜所需食材
                            </h6>
                            <div className="grid gap-2">
                              {recipe.ingredients
                                .filter(ingredient => 
                                  ingredient.usedIn?.includes(dishInstruction.dishName.replace(/【.*】/, '')) ||
                                  ingredient.usedIn?.includes(getDishTypeText(dishInstruction.type))
                                )
                                .map((ingredient, index) => (
                                <div
                                  key={index}
                                  className={`
                                    flex justify-between items-center p-2 rounded-md
                                    ${ingredient.needed 
                                      ? 'bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' 
                                      : 'bg-muted'
                                    }
                                  `}
                                >
                                  <span className="font-medium">{ingredient.item}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-muted-foreground text-sm">{ingredient.amount}</span>
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
                        </Card>
                        
                        {/* Dish Steps */}
                        <div className="space-y-4">
                          <h6 className="font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            制作步骤
                          </h6>
                          {dishInstruction.steps.map((step, stepIndex) => (
                            <Card key={stepIndex} className="p-4 bg-muted/30">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                                    {step.stepNumber}
                                  </span>
                                  <div>
                                    <h6 className="font-semibold">{step.title}</h6>
                                    <span className="text-sm text-muted-foreground">{step.duration}</span>
                                  </div>
                                </div>
                                
                                {step.imageUrl && (
                                  <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                                    <img 
                                      src={step.imageUrl} 
                                      alt={`${dishInstruction.dishName} - Step ${step.stepNumber}: ${step.title}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                
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
                      </TabsContent>
                    ))}
                  </Tabs>
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
                          
                          {step.imageUrl && (
                            <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                              <img 
                                src={step.imageUrl} 
                                alt={`Step ${step.stepNumber}: ${step.title}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
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
                /* Fallback to basic instructions */
                <div>
                  <h4 className="font-semibold mb-3">{t('cookingInstructions')}</h4>
                  <ol className="space-y-3">
                    {recipe.instructions.map((step, index) => (
                      <li key={index} className="flex space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Coordination Tips */}
              {recipe.coordinationTips && recipe.coordinationTips.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ChefHat className="h-4 w-4" />
                      {t('coordinationTips') || '协调技巧'}
                    </h4>
                    <ul className="space-y-2">
                      {recipe.coordinationTips.map((tip, index) => (
                        <li key={index} className="text-sm bg-gradient-subtle p-3 rounded-md border-l-4 border-primary">
                          <span className="font-medium">👨‍🍳 </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Cooking Tips */}
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

              {/* Nutrition Information */}
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

              {/* Cook Recipe Button */}
              <Separator />
              <div className="flex justify-center">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCookRecipe(recipe);
                  }}
                  size="lg"
                  className="px-8 py-3 text-lg font-semibold"
                >
                  <ChefHat className="w-5 h-5 mr-2" />
                  {t('cookThisRecipe')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};