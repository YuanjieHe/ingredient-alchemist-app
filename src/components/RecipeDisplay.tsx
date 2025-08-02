import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, ChefHat, Utensils, Heart, Share, Coffee, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Dish {
  name: string;
  type: 'main' | 'side' | 'soup';
  description: string;
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

      <div className="space-y-8">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="space-y-4">
            {/* If recipe has dishes, show them as separate cards */}
            {recipe.dishes && recipe.dishes.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    {recipe.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recipe.dishes.map((dish, dishIndex) => (
                    <Card 
                      key={`${recipe.id}-${dishIndex}`} 
                      className="overflow-hidden shadow-warm hover:shadow-primary transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        // Get available ingredients from bank
                        const bankIngredients = localStorage.getItem('ingredientsBank');
                        let availableIngredients: string[] = [];
                        if (bankIngredients) {
                          try {
                            const parsedIngredients = JSON.parse(bankIngredients);
                            availableIngredients = parsedIngredients
                              .filter((ing: any) => ing.quantity > 0)
                              .map((ing: any) => ing.name);
                          } catch (error) {
                            console.error('Error parsing bank ingredients:', error);
                          }
                        }
                        
                        // Process ingredients for this dish to mark availability correctly
                        const processedIngredients = recipe.ingredients
                          .filter(ing => !ing.usedIn || ing.usedIn === dish.name)
                          .map(ing => {
                            const isAvailable = availableIngredients.some(available => 
                              available.toLowerCase().includes(ing.item.toLowerCase()) ||
                              ing.item.toLowerCase().includes(available.toLowerCase())
                            );
                            return {
                              ...ing,
                              needed: !isAvailable
                            };
                          });

                        // Create a sub-recipe for this dish
                        const dishRecipe = {
                          ...recipe,
                          id: `${recipe.id}-dish-${dishIndex}`,
                          title: dish.name,
                          description: dish.description,
                          dishes: [dish],
                          // Use processed ingredients with correct availability status
                          ingredients: processedIngredients,
                          // Clear detailed steps so they regenerate for this specific dish
                          detailedSteps: [],
                          instructions: recipe.instructions || []
                        };
                        localStorage.setItem('selectedRecipe', JSON.stringify(dishRecipe));
                        window.location.href = `/recipe/${dishRecipe.id}`;
                      }}
                    >
                      <CardHeader className="bg-gradient-warm pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-start space-x-2 mb-2">
                              <span className="text-2xl flex-shrink-0">{getDishIcon(dish.type)}</span>
                              <CardTitle className="text-lg line-clamp-2 flex-1 min-w-0">{dish.name}</CardTitle>
                            </div>
                            <p className="text-muted-foreground text-sm line-clamp-2">{dish.description}</p>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 // Get available ingredients from bank
                                 const bankIngredients = localStorage.getItem('ingredientsBank');
                                 let availableIngredients: string[] = [];
                                 if (bankIngredients) {
                                   try {
                                     const parsedIngredients = JSON.parse(bankIngredients);
                                     availableIngredients = parsedIngredients
                                       .filter((ing: any) => ing.quantity > 0)
                                       .map((ing: any) => ing.name);
                                   } catch (error) {
                                     console.error('Error parsing bank ingredients:', error);
                                   }
                                 }
                                 
                                 const processedIngredients = recipe.ingredients
                                   .filter(ing => !ing.usedIn || ing.usedIn === dish.name)
                                   .map(ing => {
                                     const isAvailable = availableIngredients.some(available => 
                                       available.toLowerCase().includes(ing.item.toLowerCase()) ||
                                       ing.item.toLowerCase().includes(available.toLowerCase())
                                     );
                                     return {
                                       ...ing,
                                       needed: !isAvailable
                                     };
                                   });

                                 const dishRecipe = {
                                   ...recipe,
                                   id: `${recipe.id}-dish-${dishIndex}`,
                                   title: dish.name,
                                   description: dish.description,
                                   dishes: [dish],
                                   ingredients: processedIngredients,
                                   detailedSteps: []
                                 };
                                 handleSave(dishRecipe);
                              }}
                              className="hover:bg-white/20 h-8 w-8"
                            >
                              <Heart className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 // Get available ingredients from bank
                                 const bankIngredients = localStorage.getItem('ingredientsBank');
                                 let availableIngredients: string[] = [];
                                 if (bankIngredients) {
                                   try {
                                     const parsedIngredients = JSON.parse(bankIngredients);
                                     availableIngredients = parsedIngredients
                                       .filter((ing: any) => ing.quantity > 0)
                                       .map((ing: any) => ing.name);
                                   } catch (error) {
                                     console.error('Error parsing bank ingredients:', error);
                                   }
                                 }
                                 
                                 const processedIngredients = recipe.ingredients
                                   .filter(ing => !ing.usedIn || ing.usedIn === dish.name)
                                   .map(ing => {
                                     const isAvailable = availableIngredients.some(available => 
                                       available.toLowerCase().includes(ing.item.toLowerCase()) ||
                                       ing.item.toLowerCase().includes(available.toLowerCase())
                                     );
                                     return {
                                       ...ing,
                                       needed: !isAvailable
                                     };
                                   });

                                 const dishRecipe = {
                                   ...recipe,
                                   id: `${recipe.id}-dish-${dishIndex}`,
                                   title: dish.name,
                                   description: dish.description,
                                   dishes: [dish],
                                   ingredients: processedIngredients,
                                   detailedSteps: []
                                 };
                                 handleShare(dishRecipe);
                              }}
                              className="hover:bg-white/20 h-8 w-8"
                            >
                              <Share className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {getDishTypeText(dish.type)}
                          </Badge>
                          <Badge className={getDifficultyColor(recipe.difficulty) + " text-xs"}>
                            <ChefHat className="w-3 h-3 mr-1" />
                            {recipe.difficulty === 'beginner' ? t('beginner') : recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {Math.ceil((recipe.prepTime + recipe.cookTime) / recipe.dishes.length)} {t('min')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {recipe.servings} {t('servings')}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm flex items-center">
                            <Utensils className="w-3 h-3 mr-2 text-primary" />
                            {t('mainIngredients')}
                          </h5>
                          <div className="space-y-1">
                            {recipe.ingredients
                              .filter(ing => !ing.usedIn || ing.usedIn === dish.name)
                              .slice(0, 3)
                              .map((ingredient, index) => (
                                <div key={index} className="flex justify-between text-xs">
                                  <span>{ingredient.item}</span>
                                  <span className="text-muted-foreground">{ingredient.amount}</span>
                                </div>
                              ))}
                            {recipe.ingredients.filter(ing => !ing.usedIn || ing.usedIn === dish.name).length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                + {recipe.ingredients.filter(ing => !ing.usedIn || ing.usedIn === dish.name).length - 3} {t('more')}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              // Fallback for recipes without dishes structure
              <Card 
                className="overflow-hidden shadow-warm hover:shadow-primary transition-all duration-300 cursor-pointer"
                onClick={() => {
                  localStorage.setItem('selectedRecipe', JSON.stringify(recipe));
                  window.location.href = `/recipe/${recipe.id}`;
                }}
              >
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

                  {/* Cook Recipe Button */}
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};