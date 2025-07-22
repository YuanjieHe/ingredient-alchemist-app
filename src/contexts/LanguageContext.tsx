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
    
    // Cooking
    cookThisRecipe: 'Cook This Recipe',
    recipeCooked: 'Recipe cooked! Ingredients have been deducted from your bank.',
    cookingFailed: 'Failed to update ingredients. Please try again.',
    someIngredientsUsedUp: 'Some ingredients have been used up.',
    
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
    hard: 'Hard',
    
    // New ingredient bank terms
    addNewIngredients: 'Add New Ingredients',
    yourCurrentInventory: 'Your Current Inventory',
    selectAll: 'Select All', 
    clearSelection: 'Clear Selection',
    unit: 'Unit',
    selectedForCooking: 'Selected for Cooking',
    ingredientsCount: 'ingredients',
    cookWithSelected: 'Cook With Selected',
    loggedInAs: 'Logged in as',
    ingredientsSyncedToCloud: 'Ingredients will automatically sync to cloud database',
    authRequiredForPersistence: 'Authentication required for persistence',
    authNoticeMessage: 'Current ingredients will be saved to local storage. Login to sync across devices and save permanently.',
    added: 'Added',
    ingredientsToBank: 'ingredients to bank',
    savedToDatabase: 'saved to database',
    localStorageOnly: 'local storage only',
    updated: 'Updated',
    removed: 'Removed',
    navigatingToRecipeGenerator: 'Navigating to recipe generator',
    
    // Input guidance
    enterKeyTip: 'Tip: Press',
    enterKey: 'Enter',
    toQuicklyAdd: 'to quickly add ingredients'
  },
  zh: {
    // App Title
    appTitle: 'SmartChef AI',
    appSubtitle: '将您的食材转化为美味佳肴',
    
    // Navigation
    ingredients: '食材',
    preferences: '偏好',
    mealPlans: '餐食计划',
    
    // Buttons
    continueToPreferences: '继续到偏好设置',
    backToIngredients: '返回食材',
    generateMealPlans: '生成餐食计划',
    regeneratePlans: '重新生成计划',
    viewDetailedRecipes: '查看详细食谱',
    backToPreview: '返回预览',
    createNewMealPlans: '创建新的餐食计划',
    
    // Steps
    step1: '食材',
    step2: '偏好',
    step3: '生成',
    
    // Generating
    creatingMealPlans: '正在创建您的餐食计划',
    aiChefAnalyzing: '我们的AI厨师正在分析您的食材和偏好...',
    
    // Preview
    recommendMeals: '推荐餐食',
    foundMealPlans: '个餐食计划',
    foundMealPlansPlural: '个餐食计划',
    foundFor: '找到',
    
    // Recipe Display
    yourMealPlanCombinations: '您的餐食计划组合',
    balancedMealCreated: '我们已创建',
    balancedMealCombinations: '个平衡餐食组合',
    balancedMealCombinationsPlural: '个平衡餐食组合',
    forYou: '为您',
    
    // Time and Servings
    min: '分钟',
    servings: '人份',
    person: '人',
    people: '人',
    day: '天',
    days: '天',
    
    // Difficulty
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级',
    
    // Preferences
    cookingPreferences: '烹饪偏好',
    cookingPreferencesDesc: '自定义您的餐食偏好',
    customizeYourMeals: '自定义您的餐食偏好',
    
    // People Count
    howManyPeople: '有多少人用餐？',
    
    // Meal Type
    whatMeal: '您计划什么餐食？',
    breakfast: '早餐',
    brunch: '早午餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '小食',
    mealType: '餐食类型',
    
    // Occasion
    whatsOccasion: '什么场合？',
    dailyMeal: '日常餐食',
    dailyMealDesc: '常规日常烹饪',
    gatheringParty: '聚会/派对',
    gatheringPartyDesc: '特殊场合或招待客人',
    daily: '日常',
    weekend: '周末',
    party: '聚会',
    romantic: '浪漫',
    occasionType: '场合',
    
    // Cuisine
    whatCuisine: '您偏好什么菜系？',
    chinese: '中式',
    american: '美式',
    korean: '韩式',
    japanese: '日式',
    italian: '意式',
    mexican: '墨西哥式',
    indian: '印度式',
    thai: '泰式',
    mediterranean: '地中海式',
    fusion: '融合式',
    french: '法式',
    other: '其他',
    cuisineType: '菜系类型',
    
    // Skill Level
    cookingSkillLevel: '烹饪技能水平',
    skillLevel: '烹饪技能水平',
    beginnerDesc: '简单食谱，基础技巧',
    intermediateDesc: '需要一些烹饪经验',
    advancedDesc: '复杂技巧和食材',
    
    // Meal Planning
    planMealsDays: '计划几天的餐食？',
    mealPlanDays: '餐食计划天数',
    servingSize: '人数',
    
    // Shopping
    shoppingPreference: '购物偏好',
    useWhatIHave: '使用现有食材',
    useWhatIHaveDesc: '仅使用当前食材的食谱',
    iCanShop: '我可以购物',
    iCanShopDesc: '包含需要一些额外食材的食谱',
    allowShopping: '允许额外购物',
    allowShoppingDesc: 'AI可以建议您没有的食材',
    
    // Recipe Details
    mealCombination: '餐食组合',
    requiredIngredients: '所需食材',
    needToBuy: '需要购买',
    cookingInstructions: '烹饪说明',
    instructions: '说明',
    cookingTips: '烹饪小贴士',
    nutritionPerServing: '营养信息（每份）',
    nutritionInfo: '营养信息',
    calories: '卡路里',
    protein: '蛋白质',
    carbs: '碳水化合物',
    fat: '脂肪',
    traditionalInspiration: '传统灵感',
    thisRecipeInspiredBy: '此食谱受传统菜品启发',
    enhancedWithKnowledgeBase: '通过我们的烹饪知识库中的传统烹饪技术增强',
    detailedCookingSteps: '详细烹饪步骤',
    tip: '小贴士',
    
    // Dish Types
    main: '主菜',
    side: '配菜',
    soup: '汤',
    dish: '菜品',
    
    // Common
    add: '添加',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    search: '搜索',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    
    // Ingredients
    addIngredients: '添加食材以继续',
    addIngredientsFirst: '请先添加食材',
    ingredientPlaceholder: '输入食材名称',
    addIngredient: '添加食材',
    ingredientAdded: '食材已添加',
    ingredientRemoved: '食材已移除',
    
    // Messages
    savedToFavorites: '餐食组合已保存到收藏夹！',
    linkCopied: '餐食组合链接已复制到剪贴板！',
    recipesGenerated: '食谱生成成功！',
    recipesGenerationFailed: '生成食谱失败，请重试。',
    noMealCombinations: '尚未生成餐食组合',
    
    // Cooking
    cookThisRecipe: '制作这道菜',
    recipeCooked: '菜谱已制作！食材已从您的食材银行中扣除。',
    cookingFailed: '更新食材失败，请重试。',
    someIngredientsUsedUp: '某些食材已用完。',
    
    // Auth
    login: '登录',
    logout: '登出',
    email: '邮箱',
    password: '密码',
    loginSuccess: '登录成功！',
    loginError: '登录失败',
    logoutSuccess: '登出成功！',
    
    // Ingredients Bank
    ingredientsBank: '食材银行',
    bankTitle: '食材银行',
    bankSubtitle: '管理您的可用食材',
    bankEmpty: '您的食材银行为空',
    bankEmptyDesc: '添加食材以开始创建餐食计划',
    addToBank: '添加到银行',
    removeFromBank: '从银行移除',
    clearBank: '清空全部',
    importIngredients: '导入食材',
    exportIngredients: '导出食材',
    usingIngredientsFromBank: '使用食材银行中的食材',
    items: '项',
    
    // Knowledge Base
    knowledgeTitle: '知识库',
    knowledgeSubtitle: '管理和维护食谱数据库',
    dishManagement: '菜品管理',
    addDish: '添加新菜品',
    bulkImport: '批量导入',
    dishName: '菜品名称',
    difficultyLevel: '难度等级',
    cookingTime: '烹饪时间（分钟）',
    description: '描述',
    culturalBackground: '文化背景',
    ingredientsList: '食材清单',
    dishNameRequired: '菜品名称是必需的',
    instructionsRequired: '说明是必需的',
    dishAdded: '菜品添加成功！',
    dishDeleted: '菜品删除成功！',
    dishAddFailed: '添加菜品失败',
    dishDeleteFailed: '删除菜品失败',
    confirmDelete: '您确定要删除此菜品吗？',
    fetchDataFailed: '获取菜品数据失败',
    fetchIngredientsFailed: '获取菜品食材失败',
    selectFile: '选择文件（Excel或JSON）',
    fileFormatError: '请选择Excel文件（.xlsx或.xls）或JSON文件（.json）',
    fileEmpty: '文件为空',
    uploadProgress: '上传进度',
    importComplete: '导入完成！成功：{success}，失败：{failed}',
    uploadFailed: '文件上传失败',
    downloadTemplate: '下载模板',
    templateDownloaded: '模板下载成功！',
    excelFormat: 'Excel文件格式：',
    jsonFormat: 'JSON文件格式：',
    loginRequired: '请先登录',
    loginRequiredKnowledge: '请先登录以管理知识库',
    easy: '简单',
    medium: '中等',
    hard: '困难',
    
    // New ingredient bank terms
    addNewIngredients: '添加新食材',
    yourCurrentInventory: '您当前的库存',
    selectAll: '全选',
    clearSelection: '清空选择',
    unit: '单位',
    selectedForCooking: '已选择用于烹饪',
    ingredientsCount: '种食材',
    cookWithSelected: '用选中食材烹饪',
    loggedInAs: '已登录',
    ingredientsSyncedToCloud: '食材将自动同步到云端数据库',
    authRequiredForPersistence: '需要登录以启用持久存储',
    authNoticeMessage: '当前食材将保存到本地存储。登录后可在设备间同步和永久保存。',
    added: '已添加',
    ingredientsToBank: '种食材到银行',
    savedToDatabase: '已保存到数据库',
    localStorageOnly: '仅本地存储',
    updated: '已更新',
    removed: '已移除',
    navigatingToRecipeGenerator: '正在跳转到食谱生成器',
    
    // Input guidance
    enterKeyTip: '💡 提示：按',
    enterKey: 'Enter',
    toQuicklyAdd: '键快速添加食材'
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('zh');

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