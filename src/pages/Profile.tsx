import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, Trash2, Clock, Users, ChefHat, Utensils, User, LogOut, LogIn, Crown, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ApplePaymentService } from '@/services/applePaymentService';
import { supabase } from '@/integrations/supabase/client';

// Stripe Payment Links (no server needed)
const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  monthly: 'https://buy.stripe.com/8x200i9hpbLb3Ea4HbbjW03',
  seasonal: 'https://buy.stripe.com/8x24gy2T15mN2A6ddHbjW02',
  annual: 'https://buy.stripe.com/bJe3cubpx3eFb6C6PjbjW01',
  lifetime: 'https://buy.stripe.com/6oU14mgJR4iJb6C1uZbjW00',
};

interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  imageUrl?: string;
  ingredients: Array<{
    item: string;
    amount: string;
    needed?: boolean;
  }>;
  instructions: string[];
  tips?: string[];
  nutritionInfo?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

interface FavoriteRecipe {
  id: string;
  recipe_id: string;
  recipe_data: any; // Use any to handle JSONB data from Supabase
  created_at: string;
}

export default function Profile() {
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const { subscription, loading: subscriptionLoading, remainingGenerations, refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorite_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites((data || []) as FavoriteRecipe[]);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error(t('loadFavoritesFailed') || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorite_recipes')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      toast.success(t('removedFromFavorites') || 'Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error(t('removeFavoriteFailed') || 'Failed to remove favorite');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`
          }
        });
        if (error) throw error;
        toast.success(t('signUpSuccess') || 'Account created successfully! Please check your email to verify your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast.success(t('loginSuccess') || 'Logged in successfully');
        setShowLogin(false);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || (isSignUp ? t('signUpFailed') : t('loginFailed')) || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setFavorites([]);
      toast.success(t('logoutSuccess') || 'Logged out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(t('logoutFailed') || 'Failed to log out');
    }
  };

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

  const handlePurchase = async (planType: string, price: number) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setSelectedPlan(planType);
    setPaymentLoading(true);

    try {
      const applePaymentService = ApplePaymentService.getInstance();
      
      // 优先使用Apple支付（如果在iOS设备上）
      if (applePaymentService.isApplePayAvailable()) {
        toast.info('正在启动Apple内购...');
        
        const result = await applePaymentService.purchaseProduct(planType);
        
        if (result.success && result.transactionId) {
          toast.success('购买成功！欢迎成为高级会员！');
          // 刷新页面数据
          window.location.reload();
        } else if (result.error === 'Redirected to web payment') {
          toast.info('已跳转到网页支付');
        } else {
          throw new Error(result.error || '购买失败');
        }
      } else {
        // 根据语言选择支付系统
        if (language === 'zh') {
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-zpay-checkout', {
            body: { planType }
          });

          if (checkoutError) {
            throw new Error(checkoutError.message);
          }

          if (checkoutData?.url) {
            const newWindow = window.open(checkoutData.url, '_blank');
            if (!newWindow) {
              toast.error('请允许弹窗或手动点击链接完成支付');
              setTimeout(() => {
                window.location.href = checkoutData.url;
              }, 100);
            } else {
              toast.info('正在跳转到支付页面...');
            }
          } else {
            throw new Error('未能创建支付链接');
          }
        } else {
          // Web 直接跳转 Stripe Payment Link（无需后端）
          const url = STRIPE_PAYMENT_LINKS[planType];
          if (!url) throw new Error('无效的计划类型');
          const win = window.open(url, '_blank');
          if (!win) {
            window.location.href = url;
          }
          toast.info('已在新标签页打开支付页面');
        }
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(`购买失败: ${error.message || '请重试'}`);
    } finally {
      setPaymentLoading(false);
      setSelectedPlan(null);
    }
  };

  // 确认支付功能
  const handleConfirmPayment = async () => {
    setPaymentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const { data, error } = await supabase.functions.invoke('verify-stripe-payment', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.hasActivePremium) {
        await refreshSubscription();
        toast.success(t('language') === 'English' ? 'Premium subscription activated!' : '高级订阅已激活！');
      } else {
        toast.info(t('language') === 'English' ? 'No premium subscription found. Please complete payment first.' : '未找到高级订阅，请先完成付款。');
      }
    } catch (error: any) {
      console.error('Verify payment error:', error);
      toast.error(error.message || (t('language') === 'English' ? 'Failed to verify payment' : '验证付款失败'));
    } finally {
      setPaymentLoading(false);
    }
  };

  // 检查 URL 参数，显示支付结果
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('支付成功！欢迎成为高级会员！');
      // 清除 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname);
      // 刷新订阅状态
      window.location.reload();
    } else if (urlParams.get('cancelled') === 'true') {
      toast.error('支付已取消');
      // 清除 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <User className="w-6 h-6" />
              {t('myProfile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showLogin ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {t('loginToViewFavorites')}
                </p>
                <Button onClick={() => navigate('/auth')} className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('login')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? t('loading') : 
                   isSignUp ? t('signUp') : t('login')}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowLogin(false)}
                  className="w-full"
                >
                  {t('cancel')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              {t('myProfile')}
            </CardTitle>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('totalFavorites')}: {favorites.length} {t('recipes')}
          </p>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            {t('membershipStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionLoading ? (
            <p className="text-muted-foreground">{t('loadingSubscription')}</p>
          ) : subscription ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={subscription.subscription_type === 'premium' ? 'default' : 'secondary'}
                  className={subscription.subscription_type === 'premium' ? 'bg-yellow-500 text-white' : ''}
                >
                  {subscription.subscription_type === 'premium' ? (
                    <>
                      <Star className="w-3 h-3 mr-1" />
                      {t('premiumMember')}
                    </>
                  ) : (
                    t('freeUser')
                  )}
                </Badge>
                {subscription.subscription_type === 'premium' && (
                  <span className="text-sm text-muted-foreground">
                    {t('status')}: {subscription.subscription_status === 'active' ? t('active') : t('expired')}
                  </span>
                )}
              </div>
              
              {subscription.subscription_type === 'free' ? (
                <>
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{t('freeTrialProgress')}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('remainingGenerations')}: {remainingGenerations}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {remainingGenerations}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('generationsRemaining')}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{t('usedGenerations')} {subscription.free_generations_used}</span>
                        <span>{t('totalGenerations')} {subscription.free_generations_limit}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(subscription.free_generations_used / subscription.free_generations_limit) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    {remainingGenerations === 0 && (
                      <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                        <p className="text-xs text-orange-800 dark:text-orange-200 text-center">
                          {t('freeTrialExhausted')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 购买选项 */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {t('upgradeToPremium')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Monthly */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer">
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">
                            {language === 'zh' ? '¥9.9' : '$4.99'}
                          </div>
                          <div className="text-sm text-muted-foreground">{t('monthly')}</div>
                          <div className="text-xs text-muted-foreground mt-1">{t('perMonth')}</div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('monthly', language === 'zh' ? 9.9 : 4.99)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'monthly' ? t('processing') : t('select')}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Quarterly */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer">
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">
                            {language === 'zh' ? '¥29.9' : '$13.99'}
                          </div>
                          <div className="text-sm text-muted-foreground">{t('quarterly')}</div>
                          <div className="text-xs text-muted-foreground mt-1">{t('months3')}</div>
                          <div className="text-xs text-green-600">
                            {t('saveAmount')} {language === 'zh' ? '¥4.9' : '$4.99'}
                          </div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('seasonal', language === 'zh' ? 29.9 : 13.99)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'seasonal' ? t('processing') : t('select')}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Annual */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer relative">
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-orange-500 text-white">{t('recommended')}</Badge>
                        </div>
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">
                            {language === 'zh' ? '¥99.9' : '$49.99'}
                          </div>
                          <div className="text-sm text-muted-foreground">{t('annual')}</div>
                          <div className="text-xs text-muted-foreground mt-1">{t('months12')}</div>
                          <div className="text-xs text-green-600">
                            {t('saveAmount')} {language === 'zh' ? '¥18.9' : '$9.89'}
                          </div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('annual', language === 'zh' ? 99.9 : 49.99)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'annual' ? t('processing') : t('select')}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Lifetime */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer relative">
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-purple-500 text-white">{t('lifetime')}</Badge>
                        </div>
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">
                            {language === 'zh' ? '¥159.9' : '$79.99'}
                          </div>
                          <div className="text-sm text-muted-foreground">{t('lifetime')}</div>
                          <div className="text-xs text-muted-foreground mt-1">{t('permanentUse')}</div>
                          <div className="text-xs text-green-600">{t('mostValue')}</div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('lifetime', language === 'zh' ? 159.9 : 79.99)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'lifetime' ? t('processing') : t('select')}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* 确认支付按钮 */}
                    <div className="mt-4 flex justify-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleConfirmPayment}
                        disabled={paymentLoading}
                        className="flex items-center gap-2"
                      >
                        <Crown className="w-4 h-4" />
                        {language === 'zh' ? '确认支付 (付款后请点击此按钮)' : 'Confirm Payment (Please press this button after purchase)'}
                      </Button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2 text-sm">{t('premiumBenefits')}</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>{t('unlimitedRecipes')}</li>
                        <li>{t('smartPortioning')}</li>
                        <li>{t('completeMealPlans')}</li>
                        <li>{t('prioritySupport')}</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                // 高级会员状态显示
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">{t('premiumBenefits')}</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ {t('unlimitedRecipes')}</li>
                    <li>✅ {t('smartPortioning')}</li>
                    <li>✅ {t('completeMealPlans')}</li>
                    <li>✅ {t('prioritySupport')}</li>
                  </ul>
                </div>
              )}

              {subscription.subscription_end_date && (
                <p className="text-sm text-muted-foreground">
                  {t('activeUntil')}: {new Date(subscription.subscription_end_date).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('loadSubscriptionFailed')}</p>
          )}
        </CardContent>
      </Card>

      {/* Favorites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            {t('myFavorites')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">
              {t('loading')}
            </p>
          ) : favorites.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {t('noFavorites')}
            </p>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => {
                const recipe = favorite.recipe_data;
                return (
                  <Card key={favorite.id} className="overflow-hidden">
                    {recipe.imageUrl && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={recipe.imageUrl} 
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{recipe.title}</h3>
                          <p className="text-sm text-muted-foreground">{recipe.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFavorite(favorite.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getDifficultyColor(recipe.difficulty)}>
                          <ChefHat className="w-3 h-3 mr-1" />
                          {recipe.difficulty === 'beginner' ? t('beginner') : 
                           recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
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

                      <Separator className="my-3" />

                      {/* 简化的食材列表 */}
                      <div className="mb-3">
                        <h4 className="font-medium mb-2 flex items-center">
                          <Utensils className="w-4 h-4 mr-1" />
                          {t('ingredients')}
                        </h4>
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          {recipe.ingredients.slice(0, 6).map((ingredient, index) => (
                            <div key={index} className="text-muted-foreground">
                              {ingredient.item}
                            </div>
                          ))}
                          {recipe.ingredients.length > 6 && (
                            <div className="text-muted-foreground">
                              +{recipe.ingredients.length - 6} {t('more')}
                            </div>
                          )}
                        </div>
                      </div>

                      {recipe.nutritionInfo && (
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.calories}</div>
                            <div className="text-muted-foreground">{t('calories')}</div>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.protein}</div>
                            <div className="text-muted-foreground">{t('protein')}</div>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.carbs}</div>
                            <div className="text-muted-foreground">{t('carbs')}</div>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.fat}</div>
                            <div className="text-muted-foreground">{t('fat')}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}