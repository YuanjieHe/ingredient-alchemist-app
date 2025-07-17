import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PreferencesSelector } from '@/components/PreferencesSelector';
import { RecipeDisplay } from '@/components/RecipeDisplay';
import { RecipeService, Recipe } from '@/services/recipeService';
import { ChefHat, Sparkles, ArrowRight, Clock, Users, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const RecipeGenerator = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<'ingredients' | 'preferences' | 'generating' | 'preview' | 'recipes'>('ingredients');
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

  // Check for ingredients from localStorage on component mount
  useEffect(() => {
    const savedIngredients = localStorage.getItem('selectedIngredients');
    if (savedIngredients) {
      const parsedIngredients = JSON.parse(savedIngredients);
      setIngredients(parsedIngredients);
      setStep('preferences');
      localStorage.removeItem('selectedIngredients'); // Clear after use
    }
  }, []);

  const handleContinueToPreferences = () => {
    if (ingredients.length === 0) {
      toast.error(t('addIngredients'));
      return;
    }
    setStep('preferences');
  };

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      toast.error(t('addIngredientsFirst'));
      return;
    }

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
    setIngredients([]);
    setRecipes([]);
    setStep('ingredients');
  };

  const handleViewFullRecipes = () => {
    setStep('recipes');
  };

  const renderContent = () => {
    switch (step) {
      case 'ingredients':
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <ChefHat className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">{t('recipeGenerator') || 'AI 食谱生成器'}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('welcomeMessage') || '欢迎使用智能食谱生成器！'}
                </p>
              </div>
            </div>

            <Card className="shadow-lg max-w-md mx-auto">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Package className="w-8 h-8 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">{t('startWithIngredients') || '首先添加您的食材'}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('addIngredientsDescription') || '前往食材银行添加您现有的食材，然后返回生成食谱'}
                  </p>
                </div>
                
                <Button 
                  onClick={() => navigate('/ingredients')}
                  size="lg"
                  className="w-full"
                >
                  <Package className="w-4 h-4 mr-2" />
                  {t('goToIngredientsBank') || '前往食材银行'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {ingredients.length > 0 && (
              <Card className="shadow-lg max-w-md mx-auto bg-green-50 border-green-200">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-green-800">
                      {t('ingredientsReady') || '食材已准备好！'}
                    </h3>
                    <p className="text-green-600 text-sm">
                      {t('foundIngredients') || '找到'} {ingredients.length} {t('ingredients') || '种食材'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    {ingredients.slice(0, 6).map((ingredient, index) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                        {ingredient}
                      </Badge>
                    ))}
                    {ingredients.length > 6 && (
                      <Badge variant="outline" className="border-green-300 text-green-600">
                        +{ingredients.length - 6}
                      </Badge>
                    )}
                  </div>

                  <Button 
                    onClick={handleContinueToPreferences}
                    size="lg"
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('continueToPreferences') || '继续设置偏好'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-foreground">{t('preferences')}</h2>
              <p className="text-lg text-muted-foreground">{t('customizeYourMeals')}</p>
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
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setStep('ingredients')}
                className="px-6 py-3 text-base font-medium"
              >
                {t('backToIngredients')}
              </Button>
              <Button 
                onClick={handleGenerateRecipes} 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('generateMealPlans')}
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