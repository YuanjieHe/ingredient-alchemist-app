import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  ingredients?: Array<{
    item: string;
    amount: string;
    needed?: boolean;
  }>;
  instructions?: string[];
  detailedSteps?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    duration: string;
    tips?: string;
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
  knowledgeBaseReferences?: string[];
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
  const [selectedDishes, setSelectedDishes] = useState<{[key: string]: string}>({});
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
      // Get current ingredients from localStorage and Supabase
      let currentIngredients: any[] = [];
      
      if (user) {
        // Get from Supabase for authenticated users
        const { data: bankData, error } = await supabase
          .from('ingredients_bank')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        currentIngredients = bankData || [];
      } else {
        // Get from localStorage for non-authenticated users
        const bankIngredients = localStorage.getItem('ingredientsBank');
        if (bankIngredients) {
          currentIngredients = JSON.parse(bankIngredients);
        }
      }

      // Track ingredients that were used and missing
      const usedIngredients: string[] = [];
      const missingIngredients: string[] = [];
      
      // Deduct recipe ingredients from bank
      const updatedIngredients = currentIngredients.map(ingredient => {
        const recipeIngredient = recipe.ingredients.find(ri => {
          // More precise matching
          const itemName = ri.item.toLowerCase().trim();
          const ingredientName = ingredient.name.toLowerCase().trim();
          return itemName.includes(ingredientName) || 
                 ingredientName.includes(itemName) ||
                 itemName === ingredientName;
        });
        
        if (recipeIngredient) {
          // Parse amount to get numeric value (simple parsing)
          let amountNeeded = 1; // default to 1 if can't parse
          const amountMatch = recipeIngredient.amount.match(/(\d+\.?\d*)/);
          if (amountMatch) {
            amountNeeded = Math.max(1, Math.ceil(parseFloat(amountMatch[1]) / 100)); // Convert to reasonable units
          }
          
          const currentQty = Number(ingredient.quantity) || 0;
          const newQuantity = Math.max(0, currentQty - amountNeeded);
          
          if (currentQty >= amountNeeded) {
            usedIngredients.push(`${ingredient.name} (${amountNeeded}${ingredient.unit || ''})`);
          } else if (currentQty > 0) {
            usedIngredients.push(`${ingredient.name} (${currentQty}${ingredient.unit || ''}, 不足)`);
            missingIngredients.push(ingredient.name);
          } else {
            missingIngredients.push(ingredient.name);
          }
          
          return { ...ingredient, quantity: newQuantity };
        }
        return ingredient;
      });

      // Update storage
      if (user) {
        // Update Supabase for authenticated users
        for (const ingredient of updatedIngredients) {
          if (ingredient.quantity !== currentIngredients.find(ci => ci.id === ingredient.id)?.quantity) {
            await supabase
              .from('ingredients_bank')
              .update({ quantity: ingredient.quantity })
              .eq('id', ingredient.id);
          }
        }
      } else {
        // Update localStorage for non-authenticated users
        localStorage.setItem('ingredientsBank', JSON.stringify(updatedIngredients));
      }

      // Show appropriate success message
      if (usedIngredients.length > 0) {
        if (missingIngredients.length > 0) {
          toast.success(`${t('recipeCooked')} 使用了: ${usedIngredients.join(', ')}。部分食材不足: ${missingIngredients.join(', ')}`);
        } else {
          toast.success(`${t('recipeCooked')} 使用了: ${usedIngredients.join(', ')}`);
        }
      } else {
        toast.warning('没有找到匹配的食材可以扣除');
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

              {/* Meal combination display with tabs */}
              {recipe.dishes && recipe.dishes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Coffee className="w-4 h-4 mr-2 text-primary" />
                    {t('mealCombination')}
                  </h4>
                  <Tabs 
                    value={selectedDishes[recipe.id] || recipe.dishes[0]?.name} 
                    onValueChange={(value) => setSelectedDishes(prev => ({ ...prev, [recipe.id]: value }))}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                      {recipe.dishes.map((dish, index) => (
                        <TabsTrigger key={index} value={dish.name} className="text-sm">
                          <span className="mr-2">{getDishIcon(dish.type)}</span>
                          {dish.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {recipe.dishes.map((dish, index) => (
                      <TabsContent key={index} value={dish.name} className="mt-4">
                        <Card className="bg-cooking-cream/50">
                          <CardHeader className="pb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{getDishIcon(dish.type)}</span>
                              <div>
                                <CardTitle className="text-lg">{dish.name}</CardTitle>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {getDishTypeText(dish.type)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{dish.description}</p>
                          </CardHeader>
                          
                          {/* Dish-specific ingredients */}
                          {dish.ingredients && dish.ingredients.length > 0 && (
                            <CardContent className="pt-0">
                              <h5 className="font-medium mb-2 text-sm">{t('ingredients')}:</h5>
                              <div className="grid gap-1">
                                {dish.ingredients.map((ingredient, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white/50 rounded">
                                    <span>{ingredient.item}</span>
                                    <span className="text-muted-foreground">{ingredient.amount}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          )}
                          
                          {/* Dish-specific instructions */}
                          {dish.instructions && dish.instructions.length > 0 && (
                            <CardContent className="pt-0">
                              <h5 className="font-medium mb-2 text-sm">{t('instructions')}:</h5>
                              <ol className="space-y-1">
                                {dish.instructions.map((step, idx) => (
                                  <li key={idx} className="flex space-x-2 text-xs">
                                    <span className="flex-shrink-0 w-4 h-4 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                                      {idx + 1}
                                    </span>
                                    <span className="leading-relaxed">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </CardContent>
                          )}
                          
                          {/* Dish-specific detailed steps */}
                          {dish.detailedSteps && dish.detailedSteps.length > 0 && (
                            <CardContent className="pt-0">
                              <h5 className="font-medium mb-2 text-sm">{t('detailedSteps')}:</h5>
                              <div className="space-y-2">
                                {dish.detailedSteps.map((step, idx) => (
                                  <div key={idx} className="p-2 bg-white/50 rounded">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                                        {step.stepNumber}
                                      </span>
                                      <span className="font-medium text-sm">{step.title}</span>
                                      <span className="text-xs text-muted-foreground">({step.duration})</span>
                                    </div>
                                    <p className="text-xs leading-relaxed ml-7">{step.description}</p>
                                    {step.tips && (
                                      <div className="ml-7 mt-1 p-1 bg-cooking-herb/10 rounded text-xs">
                                        <span className="font-medium">💡 {t('tip')}: </span>
                                        {step.tips}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
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

              {/* Dynamic Detailed Cooking Steps based on selected dish */}
              {recipe.dishes && recipe.dishes.length > 0 ? (
                (() => {
                  const selectedDishName = selectedDishes[recipe.id] || recipe.dishes[0]?.name;
                  const selectedDish = recipe.dishes.find(dish => dish.name === selectedDishName);
                  
                  if (selectedDish && selectedDish.detailedSteps && selectedDish.detailedSteps.length > 0) {
                    return (
                      <div className="space-y-6">
                        <h4 className="font-semibold flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {selectedDish.name} - {t('detailedCookingSteps')}
                        </h4>
                        <div className="space-y-6">
                          {selectedDish.detailedSteps.map((step, index) => (
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
                    );
                  } else if (selectedDish && selectedDish.instructions && selectedDish.instructions.length > 0) {
                    return (
                      <div>
                        <h4 className="font-semibold mb-3">{selectedDish.name} - {t('cookingInstructions')}</h4>
                        <ol className="space-y-3">
                          {selectedDish.instructions.map((step, index) => (
                            <li key={index} className="flex space-x-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <p className="text-sm leading-relaxed">{step}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  } else {
                    return null;
                  }
                })()
              ) : (
                /* Fallback to recipe-level instructions if no dishes */
                recipe.detailedSteps && recipe.detailedSteps.length > 0 ? (
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
                )
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