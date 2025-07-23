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
import { supabase } from '@/integrations/supabase/client';

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
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { subscription, loading: subscriptionLoading, remainingGenerations } = useSubscription();
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
      // 这里模拟支付流程，实际项目中需要集成真实的支付接口
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟支付成功后更新订阅状态
      const endDate = new Date();
      switch (planType) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'annual':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        case 'lifetime':
          endDate.setFullYear(endDate.getFullYear() + 100); // 设置为100年后
          break;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_type: 'premium',
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: planType === 'lifetime' ? null : endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('购买成功！欢迎成为高级会员！');
      // 刷新页面数据
      window.location.reload();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('购买失败，请重试');
    } finally {
      setPaymentLoading(false);
      setSelectedPlan(null);
    }
  };

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
            会员状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionLoading ? (
            <p className="text-muted-foreground">加载中...</p>
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
                      高级会员
                    </>
                  ) : (
                    '免费用户'
                  )}
                </Badge>
                {subscription.subscription_type === 'premium' && (
                  <span className="text-sm text-muted-foreground">
                    状态: {subscription.subscription_status === 'active' ? '有效' : '已过期'}
                  </span>
                )}
              </div>
              
              {subscription.subscription_type === 'free' ? (
                <>
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">免费试用进度</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          剩余 {remainingGenerations} 次免费生成机会
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {remainingGenerations}
                        </div>
                        <div className="text-xs text-muted-foreground">次剩余</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>已使用 {subscription.free_generations_used}</span>
                        <span>总共 {subscription.free_generations_limit}</span>
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
                          免费次数已用完，升级到高级会员享受无限生成
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 购买选项 */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      升级到高级会员
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Monthly */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer">
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">¥14</div>
                          <div className="text-sm text-muted-foreground">月付</div>
                          <div className="text-xs text-muted-foreground mt-1">每月</div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('monthly', 14)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'monthly' ? '处理中...' : '选择'}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Quarterly */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer">
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">¥30</div>
                          <div className="text-sm text-muted-foreground">季付</div>
                          <div className="text-xs text-muted-foreground mt-1">3个月</div>
                          <div className="text-xs text-green-600">节省 ¥12</div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('quarterly', 30)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'quarterly' ? '处理中...' : '选择'}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Annual */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer relative">
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-orange-500 text-white">推荐</Badge>
                        </div>
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">¥98</div>
                          <div className="text-sm text-muted-foreground">年付</div>
                          <div className="text-xs text-muted-foreground mt-1">12个月</div>
                          <div className="text-xs text-green-600">节省 ¥70</div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('annual', 98)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'annual' ? '处理中...' : '选择'}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Lifetime */}
                      <Card className="border-2 hover:border-primary transition-colors cursor-pointer relative">
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-purple-500 text-white">终生</Badge>
                        </div>
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold text-primary">¥168</div>
                          <div className="text-sm text-muted-foreground">终生会员</div>
                          <div className="text-xs text-muted-foreground mt-1">永久使用</div>
                          <div className="text-xs text-green-600">最超值</div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            onClick={() => handlePurchase('lifetime', 168)}
                            disabled={paymentLoading}
                          >
                            {paymentLoading && selectedPlan === 'lifetime' ? '处理中...' : '选择'}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2 text-sm">高级会员特权:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 无限次菜谱生成</li>
                        <li>• 根据人数智能搭配菜品</li>
                        <li>• 主菜 + 配菜完整搭配</li>
                        <li>• 优先客服支持</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                // 高级会员状态显示
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">高级会员特权</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ 无限次菜谱生成</li>
                    <li>✅ 智能菜品搭配</li>
                    <li>✅ 完整餐桌方案</li>
                    <li>✅ 优先客服支持</li>
                  </ul>
                </div>
              )}

              {subscription.subscription_end_date && (
                <p className="text-sm text-muted-foreground">
                  到期时间: {new Date(subscription.subscription_end_date).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">加载订阅信息失败</p>
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