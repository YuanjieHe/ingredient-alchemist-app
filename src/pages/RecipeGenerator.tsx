import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PreferencesSelector } from '@/components/PreferencesSelector';
import { RecipeDisplay } from '@/components/RecipeDisplay';
import { RecipeService, Recipe } from '@/services/recipeService';
import { ChefHat, Sparkles, ArrowRight, Clock, Users, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const RecipeGenerator = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<'preferences' | 'generating' | 'preview' | 'recipes'>('preferences');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [mealDays, setMealDays] = useState(3);
  const [allowShopping, setAllowShopping] = useState(false);
  const [peopleCount, setPeopleCount] = useState(4);
  const [mealType, setMealType] = useState('lunch');
  const [occasionType, setOccasionType] = useState('daily');
  const [cuisineType, setCuisineType] = useState('chinese');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const API_KEY = 'AIzaSyBqc53GHt1LfXyvYaD4XZm99XLCQ9vtLu0';
  const recipeService = new RecipeService(API_KEY);

  // Load a default set of ingredients or get from localStorage
  useEffect(() => {
    const savedIngredients = localStorage.getItem('selectedIngredients');
    if (savedIngredients) {
      const parsedIngredients = JSON.parse(savedIngredients);
      setIngredients(parsedIngredients);
      localStorage.removeItem('selectedIngredients');
    } else {
      // Set default ingredients if none provided
      setIngredients(['chicken', 'rice', 'vegetables', 'onions', 'garlic']);
    }
  }, []);

  const handleGenerateRecipes = async () => {
    setIsGenerating(true);
    setStep('generating');

    try {
      const generatedRecipes = await recipeService.generateRecipes({
        ingredients,
        skillLevel,
        mealDays,
        allowShopping,
        peopleCount,
        mealType,
        occasionType,
        cuisineType,
        apiKey: API_KEY
      });

      setRecipes(generatedRecipes);
      setStep('preview');
      toast.success(t('recipesGenerated'));
    } catch (error) {
      console.error('Error generating recipes:', error);
      toast.error(t('recipesGenerationFailed'));
      setStep('preferences');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    setRecipes([]);
    setStep('preferences');
  };

  const handleViewFullRecipes = () => {
    setStep('recipes');
  };

  const renderContent = () => {
    switch (step) {
      case 'preferences':
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-foreground">{t('preferences') || '偏好设置'}</h2>
              <p className="text-lg text-muted-foreground">{t('customizeYourMeals') || '自定义您的餐食'}</p>
              
              {ingredients.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <p className="text-green-800 text-sm font-medium mb-2">
                    {t('usingIngredients') || '使用食材'}: {ingredients.length} {t('items') || '项'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {ingredients.slice(0, 8).map((ingredient, index) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        {ingredient}
                      </Badge>
                    ))}
                    {ingredients.length > 8 && (
                      <Badge variant="outline" className="border-green-300 text-green-600 text-xs">
                        +{ingredients.length - 8}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <PreferencesSelector
                  skillLevel={skillLevel}
                  onSkillLevelChange={setSkillLevel}
                  mealDays={mealDays}
                  onMealDaysChange={setMealDays}
                  allowShopping={allowShopping}
                  onAllowShoppingChange={setAllowShopping}
                  peopleCount={peopleCount}
                  onPeopleCountChange={setPeopleCount}
                  mealType={mealType}
                  onMealTypeChange={setMealType}
                  occasionType={occasionType}
                  onOccasionTypeChange={setOccasionType}
                  cuisineType={cuisineType}
                  onCuisineTypeChange={setCuisineType}
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-center">
              <Button 
                onClick={handleGenerateRecipes} 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('generateMealPlans') || '生成餐食计划'}
              </Button>
            </div>
          </div>
        );

      case 'generating':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-lg shadow-lg">
              <CardContent className="p-12 text-center space-y-8">
                <div className="relative">
                  <div className="mx-auto w-24 h-24 bg-primary rounded-full flex items-center justify-center animate-pulse">
                    <ChefHat className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">{t('creatingMealPlans')}</h3>
                  <p className="text-lg text-muted-foreground">
                    {t('aiChefAnalyzing')}
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold text-primary">
                {t('recommendMeals')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('foundFor')} {recipes.length} {recipes.length === 1 ? t('foundMealPlans') : t('foundMealPlansPlural')}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe, index) => (
                <Card key={recipe.id} className="group overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer">
                  <CardContent className="p-0">
                    <div className="relative h-48 overflow-hidden">
                      <div className="absolute inset-0 bg-primary opacity-90" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-6xl opacity-80">
                          {index === 0 ? '🍗' : index === 1 ? '🥗' : index === 2 ? '🍜' : '🍽️'}
                        </div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                          <Clock className="w-3 h-3 mr-1" />
                          {recipe.prepTime + recipe.cookTime} {t('min')}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {recipe.title}
                        </h3>
                        <p className="text-muted-foreground line-clamp-2">{recipe.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-muted/50">
                            <Users className="w-3 h-3 mr-1" />
                            {recipe.servings}
                          </Badge>
                          <Badge variant="secondary" className="bg-muted/50">
                            {recipe.difficulty === 'beginner' ? t('beginner') : recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
                          </Badge>
                        </div>
                        <ChefHat className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center space-x-6">
              <Button 
                variant="outline" 
                onClick={() => setStep('preferences')}
                className="px-6 py-3 text-base font-medium"
              >
                {t('regeneratePlans')}
              </Button>
              <Button 
                onClick={handleViewFullRecipes} 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('viewDetailedRecipes')}
              </Button>
            </div>
          </div>
        );

      case 'recipes':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setStep('preview')}
                className="px-6 py-3 text-base font-medium"
              >
                {t('backToPreview')}
              </Button>
            </div>
            <div className="bg-card rounded-2xl p-6 shadow-lg">
              <RecipeDisplay recipes={recipes} />
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={handleStartOver} 
                variant="outline"
                className="px-8 py-3 text-base font-medium"
              >
                {t('createNewMealPlans')}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="pb-20">
      {renderContent()}
    </div>
  );
};

export default RecipeGenerator;