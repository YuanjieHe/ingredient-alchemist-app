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
          <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-large p-8 space-y-8">
            <div className="text-center text-foreground space-y-3">
              <h2 className="text-3xl font-bold">{t('ingredients')}</h2>
              <p className="text-lg text-muted-foreground">{t('addIngredientsPrompt')}</p>
            </div>
            <IngredientInput 
              ingredients={ingredients} 
              onIngredientsChange={setIngredients} 
            />
            {ingredients.length > 0 && (
              <div className="flex justify-center">
                <Button 
                  onClick={handleContinueToPreferences} 
                  size="lg"
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-8 py-3 text-lg font-semibold"
                >
                  {t('continueToPreferences')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
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
            <Card className="shadow-large border-0 bg-gradient-card">
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
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-8 py-3 text-lg font-semibold"
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
            <Card className="w-full max-w-lg shadow-large border-0 bg-gradient-card">
              <CardContent className="p-12 text-center space-y-8">
                <div className="relative">
                  <div className="mx-auto w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse shadow-glow">
                    <ChefHat className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-20 animate-ping" />
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
              <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {t('recommendMeals')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('foundFor')} {recipes.length} {recipes.length === 1 ? t('foundMealPlans') : t('foundMealPlansPlural')}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe, index) => (
                <Card key={recipe.id} className="group overflow-hidden shadow-elegant hover:shadow-glow transition-all duration-500 cursor-pointer border-0 bg-gradient-card">
                  <CardContent className="p-0">
                    <div className="relative h-48 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-primary opacity-90" />
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
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-8 py-3 text-lg font-semibold"
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
            <div className="bg-gradient-card rounded-2xl p-6 shadow-large">
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {step === 'ingredients' && (
        <div className="relative h-screen overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <img 
            src={heroImage} 
            alt="Fresh ingredients and cooking" 
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="relative z-10 flex items-center justify-center h-full">
            <div className="text-center text-white space-y-8 px-4">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                  {t('appTitle')}
                </h1>
                <p className="text-xl md:text-2xl font-light max-w-2xl mx-auto opacity-90">
                  {t('appSubtitle')}
                </p>
              </div>
              <div className="pt-8">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Navigation Header */}
      {(step === 'preferences' || step === 'generating' || step === 'preview' || step === 'recipes') && (
        <div className="bg-card/95 backdrop-blur-xl border-b sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">{t('appTitle')}</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground shadow-glow">
                    {t('step1')}
                  </div>
                  <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    step === 'preferences' || step === 'generating' || step === 'preview' || step === 'recipes'
                      ? 'bg-primary text-primary-foreground shadow-glow' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {t('step2')}
                  </div>
                  <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    step === 'generating' || step === 'preview' || step === 'recipes'
                      ? 'bg-primary text-primary-foreground shadow-glow' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {t('step3')}
                  </div>
                </div>
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${step === 'ingredients' ? 'absolute inset-0 z-20 flex items-center justify-center pt-20' : 'container mx-auto px-6 py-12'}`}>
        <div className={`${step === 'ingredients' ? 'w-full max-w-2xl' : 'max-w-6xl mx-auto'}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
