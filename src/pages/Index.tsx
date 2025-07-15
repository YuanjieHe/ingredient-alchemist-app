import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IngredientInput } from '@/components/IngredientInput';
import { PreferencesSelector } from '@/components/PreferencesSelector';
import { RecipeDisplay } from '@/components/RecipeDisplay';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { RecipeService, Recipe } from '@/services/recipeService';
import { ChefHat, Sparkles, ArrowRight, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import heroImage from '@/assets/kitchen-hero.jpg';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

const Index = () => {
  const { t } = useLanguage();
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
  
  // Hardcoded API key - provided by the service
  const API_KEY = 'AIzaSyBqc53GHt1LfXyvYaD4XZm99XLCQ9vtLu0';
  const recipeService = new RecipeService(API_KEY);

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
          <div className="space-y-6">
            <IngredientInput 
              ingredients={ingredients} 
              onIngredientsChange={setIngredients} 
            />
            {ingredients.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={handleContinueToPreferences} size="lg">
                  {t('continueToPreferences')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
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
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('ingredients')}>
                {t('backToIngredients')}
              </Button>
              <Button onClick={handleGenerateRecipes} size="lg" variant="spice">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('generateMealPlans')}
              </Button>
            </div>
          </div>
        );

      case 'generating':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-cooking-warm rounded-full flex items-center justify-center animate-pulse">
                <ChefHat className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{t('creatingMealPlans')}</h3>
              <p className="text-muted-foreground">
                {t('aiChefAnalyzing')}
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        );

      case 'preview':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t('recommendMeals')}
              </h2>
              <p className="text-muted-foreground">
                {t('foundFor')} {recipes.length} {recipes.length === 1 ? t('foundMealPlans') : t('foundMealPlansPlural')}
              </p>
            </div>

            <div className="grid gap-4">
              {recipes.map((recipe, index) => (
                <Card key={recipe.id} className="overflow-hidden shadow-warm hover:shadow-primary transition-all duration-300 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{recipe.title}</h3>
                        <p className="text-muted-foreground mb-3">{recipe.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            {recipe.prepTime + recipe.cookTime} {t('min')}
                          </Badge>
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {recipe.servings} {t('servings')}
                          </Badge>
                          <Badge className="bg-cooking-herb text-white">
                            <ChefHat className="w-3 h-3 mr-1" />
                            {recipe.difficulty === 'beginner' ? t('beginner') : recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-4xl ml-4">
                        {index === 0 ? '🍗' : index === 1 ? '🥗' : index === 2 ? '🍜' : '🍽️'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setStep('preferences')}>
                {t('regeneratePlans')}
              </Button>
              <Button onClick={handleViewFullRecipes} size="lg" variant="spice">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('viewDetailedRecipes')}
              </Button>
            </div>
          </div>
        );

      case 'recipes':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('preview')}>
                {t('backToPreview')}
              </Button>
            </div>
            <RecipeDisplay recipes={recipes} />
            <div className="flex justify-center">
              <Button onClick={handleStartOver} variant="outline">
                {t('createNewMealPlans')}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Hero Section */}
      {step === 'ingredients' && (
        <div className="relative h-64 mb-8 overflow-hidden">
          <img 
            src={heroImage} 
            alt="Fresh ingredients and cooking" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white space-y-2">
              <div className="flex items-center justify-center space-x-4 mb-2">
                <h1 className="text-4xl md:text-5xl font-bold">{t('appTitle')}</h1>
              </div>
              <p className="text-lg md:text-xl opacity-90">{t('appSubtitle')}</p>
              <div className="pt-4">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      {(step === 'preferences' || step === 'generating' || step === 'preview' || step === 'recipes') && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ChefHat className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">{t('appTitle')}</h1>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="px-3 py-1 rounded-full bg-primary text-primary-foreground">
                  {t('step1')}
                </div>
                <div className={`px-3 py-1 rounded-full ${step === 'preferences' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {t('step2')}
                </div>
                <div className={`px-3 py-1 rounded-full ${step === 'recipes' || step === 'generating' || step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {t('step3')}
                </div>
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
