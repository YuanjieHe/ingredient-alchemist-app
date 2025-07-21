import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // App Title
    appTitle: 'SmartChef AI',
    appSubtitle: 'Transform your ingredients into delicious meals',
    
    // Navigation
    ingredients: 'Ingredients',
    preferences: 'Preferences',
    mealPlans: 'Meal Plans',
    
    // Buttons
    continueToPreferences: 'Continue to Preferences',
    backToIngredients: 'Back to Ingredients',
    generateMealPlans: 'Generate Meal Plans',
    regeneratePlans: 'Regenerate Plans',
    viewDetailedRecipes: 'View Detailed Recipes',
    backToPreview: 'Back to Preview',
    createNewMealPlans: 'Create New Meal Plans',
    
    // Steps
    step1: 'Ingredients',
    step2: 'Preferences',
    step3: 'Generate',
    
    // Generating
    creatingMealPlans: 'Creating Your Meal Plans',
    aiChefAnalyzing: 'Our AI chef is analyzing your ingredients and preferences...',
    
    // Preview
    recommendMeals: 'Recommended Meals',
    foundMealPlans: 'meal plan',
    foundMealPlansPlural: 'meal plans',
    foundFor: 'Found',
    
    // Recipe Display
    yourMealPlanCombinations: 'Your Meal Plan Combinations',
    balancedMealCreated: 'We\'ve created',
    balancedMealCombinations: 'balanced meal combination',
    balancedMealCombinationsPlural: 'balanced meal combinations',
    forYou: 'for you',
    
    // Time and Servings
    min: 'min',
    servings: 'servings',
    person: 'person',
    people: 'people',
    day: 'day',
    days: 'days',
    
    // Difficulty
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    
    // Preferences
    cookingPreferences: 'Cooking Preferences',
    cookingPreferencesDesc: 'Customize your meal preferences',
    customizeYourMeals: 'Customize your meal preferences',
    
    // People Count
    howManyPeople: 'How many people are eating?',
    
    // Meal Type
    whatMeal: 'What meal are you planning?',
    breakfast: 'Breakfast',
    brunch: 'Brunch',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
    mealType: 'Meal Type',
    
    // Occasion
    whatsOccasion: 'What\'s the occasion?',
    dailyMeal: 'Daily Meal',
    dailyMealDesc: 'Regular everyday cooking',
    gatheringParty: 'Gathering/Party',
    gatheringPartyDesc: 'Special occasion or entertaining guests',
    daily: 'Daily',
    weekend: 'Weekend',
    party: 'Party',
    romantic: 'Romantic',
    occasionType: 'Occasion',
    
    // Cuisine
    whatCuisine: 'What cuisine do you prefer?',
    chinese: 'Chinese',
    american: 'American',
    korean: 'Korean',
    japanese: 'Japanese',
    italian: 'Italian',
    mexican: 'Mexican',
    indian: 'Indian',
    thai: 'Thai',
    mediterranean: 'Mediterranean',
    fusion: 'Fusion/Mixed',
    french: 'French',
    other: 'Other',
    cuisineType: 'Cuisine Type',
    
    // Skill Level
    cookingSkillLevel: 'Cooking Skill Level',
    skillLevel: 'Cooking Skill Level',
    beginnerDesc: 'Simple recipes with basic techniques',
    intermediateDesc: 'Some cooking experience required',
    advancedDesc: 'Complex techniques and ingredients',
    
    // Meal Planning
    planMealsDays: 'Plan meals for how many days?',
    mealPlanDays: 'Meal Plan Duration',
    servingSize: 'Number of People',
    
    // Shopping
    shoppingPreference: 'Shopping preference',
    useWhatIHave: 'Use what I have',
    useWhatIHaveDesc: 'Only recipes with my current ingredients',
    iCanShop: 'I can shop',
    iCanShopDesc: 'Include recipes that need a few extra items',
    allowShopping: 'Allow additional shopping',
    allowShoppingDesc: 'AI can suggest ingredients you don\'t have',
    
    // Recipe Details
    mealCombination: 'Meal Combination',
    requiredIngredients: 'Required Ingredients',
    needToBuy: 'Need to buy',
    cookingInstructions: 'Cooking Instructions',
    instructions: 'Instructions',
    cookingTips: 'Cooking Tips',
    nutritionPerServing: 'Nutrition (per serving)',
    nutritionInfo: 'Nutrition Information',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    traditionalInspiration: 'Traditional Inspiration',
    thisRecipeInspiredBy: 'This recipe was inspired by traditional dishes',
    enhancedWithKnowledgeBase: 'Enhanced with traditional cooking techniques from our culinary knowledge base',
    detailedCookingSteps: 'Detailed Cooking Steps',
    tip: 'Tip',
    
    // Dish Types
    main: 'Main',
    side: 'Side',
    soup: 'Soup',
    dish: 'Dish',
    
    // Common
    add: 'Add',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Ingredients
    addIngredients: 'Add ingredients to continue',
    addIngredientsFirst: 'Please add ingredients first',
    ingredientPlaceholder: 'Enter ingredient name',
    addIngredient: 'Add Ingredient',
    ingredientAdded: 'Ingredient added',
    ingredientRemoved: 'Ingredient removed',
    
    // Messages
    savedToFavorites: 'Meal combination saved to favorites!',
    linkCopied: 'Meal combination link copied to clipboard!',
    recipesGenerated: 'Recipes generated successfully!',
    recipesGenerationFailed: 'Failed to generate recipes. Please try again.',
    noMealCombinations: 'No meal combinations generated yet',
    cookThisRecipe: 'Cook This Recipe',
    cookingRecipe: 'Cooking recipe and updating ingredients!',
    
    // Auth
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    loginSuccess: 'Login successful!',
    loginError: 'Login failed',
    logoutSuccess: 'Logout successful!',
    
    // Ingredients Bank
    ingredientsBank: 'Ingredients Bank',
    bankTitle: 'Ingredients Bank',
    bankSubtitle: 'Manage your available ingredients',
    bankEmpty: 'Your ingredients bank is empty',
    bankEmptyDesc: 'Add ingredients to start creating meal plans',
    addToBank: 'Add to Bank',
    removeFromBank: 'Remove from Bank',
    clearBank: 'Clear All',
    importIngredients: 'Import Ingredients',
    exportIngredients: 'Export Ingredients',
    usingIngredientsFromBank: 'Using ingredients from bank',
    items: 'items',
    
    // Knowledge Base
    knowledgeTitle: 'Knowledge Base',
    knowledgeSubtitle: 'Manage and maintain recipe database',
    dishManagement: 'Dish Management',
    addDish: 'Add New Dish',
    bulkImport: 'Bulk Import',
    dishName: 'Dish Name',
    difficultyLevel: 'Difficulty Level',
    cookingTime: 'Cooking Time (minutes)',
    description: 'Description',
    culturalBackground: 'Cultural Background',
    ingredientsList: 'Ingredients List',
    dishNameRequired: 'Dish name is required',
    instructionsRequired: 'Instructions are required',
    dishAdded: 'Dish added successfully!',
    dishDeleted: 'Dish deleted successfully!',
    dishAddFailed: 'Failed to add dish',
    dishDeleteFailed: 'Failed to delete dish',
    confirmDelete: 'Are you sure you want to delete this dish?',
    fetchDataFailed: 'Failed to fetch dish data',
    fetchIngredientsFailed: 'Failed to fetch dish ingredients',
    selectFile: 'Select File (Excel or JSON)',
    fileFormatError: 'Please select Excel file (.xlsx or .xls) or JSON file (.json)',
    fileEmpty: 'File is empty',
    uploadProgress: 'Upload Progress',
    importComplete: 'Import complete! Success: {success}, Failed: {failed}',
    uploadFailed: 'File upload failed',
    downloadTemplate: 'Download Template',
    templateDownloaded: 'Template downloaded successfully!',
    excelFormat: 'Excel file format:',
    jsonFormat: 'JSON file format:',
    loginRequired: 'Please login first',
    loginRequiredKnowledge: 'Please login first to manage knowledge base',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard'
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};