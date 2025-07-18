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
    appTitle: 'CookSmart AI',
    appSubtitle: 'Your friendly kitchen companion',
    
    // Navigation
    ingredients: 'Ingredients',
    preferences: 'Preferences',
    mealPlans: 'Meal Plans',
    
    // Buttons
    continueToPreferences: 'Continue to Preferences',
    backToIngredients: 'Back to Ingredients',
    generateMealPlans: 'Generate My Meal Plans!',
    regeneratePlans: 'Regenerate Plans',
    viewDetailedRecipes: 'View Detailed Recipes',
    backToPreview: '← Back to Preview',
    createNewMealPlans: 'Create New Meal Plans',
    
    // Steps
    step1: '1. Ingredients ✓',
    step2: '2. Preferences',
    step3: '3. Meal Plans',
    
    // Generating
    creatingMealPlans: 'Creating your meal plans...',
    aiChefAnalyzing: 'Our AI chef is analyzing your ingredients and preferences to create the perfect meal combinations for you!',
    
    // Preview
    recommendMeals: 'We recommend these delicious meal combinations! 🍽️',
    foundMealPlans: 'perfect meal',
    foundMealPlansPlural: 'perfect meal plans',
    foundFor: 'for you',
    
    // Recipe Display
    yourMealPlanCombinations: 'Your Meal Plan Combinations 🍽️',
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
    cookingPreferences: 'Tell us about your cooking preferences 👩‍🍳',
    cookingPreferencesDesc: 'This helps us create the perfect meal combinations for you',
    
    // People Count
    howManyPeople: 'How many people are eating?',
    
    // Meal Type
    whatMeal: 'What meal are you planning?',
    breakfast: 'Breakfast',
    brunch: 'Brunch',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
    
    // Occasion
    whatsOccasion: 'What\'s the occasion?',
    dailyMeal: 'Daily Meal',
    dailyMealDesc: 'Regular everyday cooking',
    gatheringParty: 'Gathering/Party',
    gatheringPartyDesc: 'Special occasion or entertaining guests',
    
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
    
    // Skill Level
    cookingSkillLevel: 'Cooking Skill Level',
    beginnerDesc: 'Simple recipes with basic techniques',
    intermediateDesc: 'Some cooking experience required',
    advancedDesc: 'Complex techniques and ingredients',
    
    // Meal Planning
    planMealsDays: 'Plan meals for how many days?',
    
    // Shopping
    shoppingPreference: 'Shopping preference',
    useWhatIHave: 'Use what I have',
    useWhatIHaveDesc: 'Only recipes with my current ingredients',
    iCanShop: 'I can shop',
    iCanShopDesc: 'Include recipes that need a few extra items',
    
    // Recipe Details
    mealCombination: 'Meal Combination',
    requiredIngredients: 'Required Ingredients',
    needToBuy: 'Need to buy',
    cookingInstructions: 'Cooking Instructions',
    cookingTips: '💡 Cooking Tips',
    nutritionPerServing: 'Nutrition (per serving)',
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
    
    // Messages
    savedToFavorites: 'Meal combination saved to favorites!',
    linkCopied: 'Meal combination link copied to clipboard!',
    addIngredients: 'Please add at least one ingredient',
    addIngredientsFirst: 'Please add some ingredients first',
    recipesGenerated: 'Recipes generated successfully!',
    recipesGenerationFailed: 'Failed to generate recipes. Please try again.',
    noMealCombinations: 'No meal combinations generated yet'
  },
  zh: {
    // App Title
    appTitle: '智慧厨房助手',
    appSubtitle: '您贴心的厨房伙伴',
    
    // Navigation
    ingredients: '食材',
    preferences: '偏好设置',
    mealPlans: '膳食搭配',
    
    // Buttons
    continueToPreferences: '继续设置偏好',
    backToIngredients: '回到食材选择',
    generateMealPlans: '生成我的膳食搭配！',
    regeneratePlans: '重新生成搭配',
    viewDetailedRecipes: '查看详细食谱',
    backToPreview: '← 返回预览',
    createNewMealPlans: '创建新的膳食搭配',
    
    // Steps
    step1: '1. 食材 ✓',
    step2: '2. 偏好设置',
    step3: '3. 膳食搭配',
    
    // Generating
    creatingMealPlans: '正在为您创建膳食搭配...',
    aiChefAnalyzing: '我们的AI大厨正在分析您的食材和偏好，为您创造完美的膳食搭配组合！',
    
    // Preview
    recommendMeals: '我们为您推荐这些美味的膳食搭配！ 🍽️',
    foundMealPlans: '个完美膳食搭配',
    foundMealPlansPlural: '个完美膳食搭配',
    foundFor: '为您准备',
    
    // Recipe Display
    yourMealPlanCombinations: '您的膳食搭配组合 🍽️',
    balancedMealCreated: '我们为您创建了',
    balancedMealCombinations: '个均衡的膳食搭配',
    balancedMealCombinationsPlural: '个均衡的膳食搭配',
    forYou: '',
    
    // Time and Servings
    min: '分钟',
    servings: '人份',
    person: '人',
    people: '人',
    day: '天',
    days: '天',
    
    // Difficulty
    beginner: '初学者',
    intermediate: '中等',
    advanced: '高级',
    
    // Preferences
    cookingPreferences: '告诉我们您的烹饪偏好 👩‍🍳',
    cookingPreferencesDesc: '这有助于我们为您创造完美的膳食搭配',
    
    // People Count
    howManyPeople: '有多少人用餐？',
    
    // Meal Type
    whatMeal: '您要准备什么餐？',
    breakfast: '早餐',
    brunch: '早午餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '点心',
    
    // Occasion
    whatsOccasion: '什么场合？',
    dailyMeal: '日常用餐',
    dailyMealDesc: '平常的家常菜',
    gatheringParty: '聚餐/聚会',
    gatheringPartyDesc: '特殊场合或招待客人',
    
    // Cuisine
    whatCuisine: '您偏好什么菜系？',
    chinese: '中餐',
    american: '美式',
    korean: '韩式',
    japanese: '日式',
    italian: '意式',
    mexican: '墨西哥式',
    indian: '印度式',
    thai: '泰式',
    mediterranean: '地中海式',
    fusion: '融合/混合',
    
    // Skill Level
    cookingSkillLevel: '烹饪技能水平',
    beginnerDesc: '简单食谱配基础技巧',
    intermediateDesc: '需要一些烹饪经验',
    advancedDesc: '复杂技巧和食材',
    
    // Meal Planning
    planMealsDays: '计划几天的膳食？',
    
    // Shopping
    shoppingPreference: '购物偏好',
    useWhatIHave: '使用现有食材',
    useWhatIHaveDesc: '仅使用现有食材的食谱',
    iCanShop: '我可以购买',
    iCanShopDesc: '包括需要购买少量额外食材的食谱',
    
    // Recipe Details
    mealCombination: '膳食搭配',
    requiredIngredients: '所需食材',
    needToBuy: '需要购买',
    cookingInstructions: '烹饪步骤',
    cookingTips: '💡 烹饪小贴士',
    nutritionPerServing: '营养成分（每人份）',
    calories: '卡路里',
    protein: '蛋白质',
    carbs: '碳水化合物',
    fat: '脂肪',
    traditionalInspiration: '传统灵感',
    thisRecipeInspiredBy: '此食谱参考了传统菜肴',
    enhancedWithKnowledgeBase: '结合了传统烹饪技法知识库的精华',
    detailedCookingSteps: '详细烹饪步骤',
    tip: '小贴士',
    
    // Dish Types
    main: '主菜',
    side: '配菜',
    soup: '汤品',
    dish: '菜品',
    
    // Messages
    savedToFavorites: '膳食搭配已保存到收藏夹！',
    linkCopied: '膳食搭配链接已复制到剪贴板！',
    addIngredients: '请至少添加一种食材',
    addIngredientsFirst: '请先添加一些食材',
    recipesGenerated: '食谱生成成功！',
    recipesGenerationFailed: '生成食谱失败，请重试。',
    noMealCombinations: '尚未生成膳食搭配'
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