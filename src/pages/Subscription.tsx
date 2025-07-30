import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ApplePaymentService } from '@/services/applePaymentService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Subscription = () => {
  const { subscription, remainingGenerations, canGenerate, refreshSubscription } = useSubscription();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEN = language === 'en';
  const paymentService = ApplePaymentService.getInstance();

  // 初始化RevenueCat（需要在真实环境中设置API Key）
  useEffect(() => {
    const initializePayments = async () => {
      if (paymentService.isApplePayAvailable() && !isInitialized) {
        try {
          // 从RevenueCat Dashboard获取您的API Key
          await paymentService.initialize('appl_LEqcSLDEpQZHdoExLXklqriNXPs', user?.id);
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize payments:', error);
        }
      }
    };

    if (user) {
      initializePayments();
    }
  }, [user, isInitialized, paymentService]);

  const handleUpgrade = async (planType?: string) => {
    if (!user) {
      toast.error(isEN ? 'Please log in first' : '请先登录');
      navigate('/auth');
      return;
    }

    if (planType === 'restore') {
      setIsLoading(true);
      try {
        const success = await paymentService.restorePurchases();
        if (success) {
          await refreshSubscription();
          toast.success(isEN ? 'Purchases restored successfully!' : '购买恢复成功！');
        }
      } catch (error) {
        toast.error(isEN ? 'Failed to restore purchases' : '恢复购买失败');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!planType) return;

    setIsLoading(true);
    try {
      // Use different payment systems based on language
      if (language === 'zh') {
        // Use Z-Pay for Chinese users
        const { data, error } = await supabase.functions.invoke('create-zpay-checkout', {
          body: { planType }
        });

        if (error) throw error;
        
        window.open(data.url, '_blank');
        toast.info('请在新窗口中完成支付');
      } else {
        // Use Apple Pay or fallback to Stripe for English users
        if (paymentService.isApplePayAvailable()) {
          const result = await paymentService.purchaseProduct(planType);
          
          if (result.success) {
            await refreshSubscription();
            toast.success('Purchase successful!');
          } else {
            toast.error(result.error || 'Purchase failed');
          }
        } else {
          // Fallback to Stripe checkout for web users
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: { planType }
          });

          if (error) throw error;
          
          window.open(data.url, '_blank');
          toast.info('Please complete payment in the new tab');
        }
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || (isEN ? 'Purchase failed' : '购买失败'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    setIsLoading(true);
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
        toast.success(isEN ? 'Premium subscription activated!' : '高级订阅已激活！');
      } else {
        toast.info(isEN ? 'No premium subscription found. Please complete payment first.' : '未找到高级订阅，请先完成付款。');
      }
    } catch (error: any) {
      console.error('Verify payment error:', error);
      toast.error(error.message || (isEN ? 'Failed to verify payment' : '验证付款失败'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{isEN ? 'Login Required' : '需要登录'}</CardTitle>
            <CardDescription>
              {isEN ? 'Please log in to view subscription details' : '请登录查看订阅详情'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              {isEN ? 'Go to Login' : '前往登录'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isEN ? 'Subscription Plans' : '订阅方案'}
          </h1>
          <p className="text-muted-foreground">
            {isEN ? 'Choose the plan that works best for you' : '选择最适合您的方案'}
          </p>
        </div>

        {/* Current Status */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                {isEN ? 'Current Plan' : '当前方案'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Badge variant={subscription.subscription_type === 'premium' ? 'default' : 'secondary'}>
                    {subscription.subscription_type === 'premium' 
                      ? t('premium') 
                      : t('free')
                    }
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subscription.subscription_type === 'free' 
                      ? (isEN 
                          ? `${remainingGenerations} generations remaining`
                          : `剩余 ${remainingGenerations} 次生成机会`
                        )
                      : (isEN ? 'Unlimited generations' : '无限生成')
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className={`w-3 h-3 rounded-full ${canGenerate ? 'bg-green-500' : 'bg-red-500'}`} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {canGenerate ? (isEN ? 'Active' : '活跃') : (isEN ? 'Inactive' : '非活跃')}
                  </p>
                </div>
              </div>
              {subscription.subscription_type === 'free' && (
                <div className="text-center">
                  <Button 
                    onClick={handleVerifyPayment} 
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading 
                      ? (isEN ? 'Verifying...' : '验证中...') 
                      : (isEN ? 'I just paid - Activate Premium' : '我刚付款了 - 激活高级版')
                    }
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isEN 
                      ? 'Complete payment first, then click to activate premium features'
                      : '请先完成付款，然后点击激活高级功能'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Free Plan */}
          <Card className={subscription?.subscription_type === 'free' ? 'ring-2 ring-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Free Plan
                {subscription?.subscription_type === 'free' && (
                  <Badge variant="outline">Current</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Perfect for trying out our service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                Free
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  3 recipe generations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Basic features
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={subscription?.subscription_type === 'free'}
              >
                {subscription?.subscription_type === 'free' 
                  ? 'Current Plan'
                  : 'Get Started'
                }
              </Button>
            </CardContent>
          </Card>

          {/* Basic Monthly Plan */}
          <Card className={subscription?.subscription_type === 'premium' ? 'ring-2 ring-primary' : 'ring-2 ring-blue-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-blue-500" />
                {language === 'zh' ? '月付计划' : 'Basic Monthly'}
                {subscription?.subscription_type === 'premium' && (
                  <Badge variant="outline">{language === 'zh' ? '当前' : 'Current'}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '轻度用户的理想选择' : 'Great for light users'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {language === 'zh' ? '¥14' : '$8'}
                <span className="text-lg font-normal">
                  {language === 'zh' ? '/月' : '/month'}
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited recipe generations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Basic features
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => handleUpgrade('monthly')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择月付' : 'Choose Basic')}
              </Button>
            </CardContent>
          </Card>

          {/* Quarterly Plan */}
          <Card className="ring-2 ring-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                {language === 'zh' ? '季付计划' : 'Quarterly'}
                <Badge variant="secondary">{language === 'zh' ? '热门' : 'Popular'}</Badge>
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '普通用户最受欢迎的选择' : 'Most popular choice for regular users'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {language === 'zh' ? '¥30' : '$20'}
                <span className="text-lg font-normal">
                  {language === 'zh' ? '/3个月' : '/3 months'}
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited recipe generations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Advanced features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Premium ingredients database
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => handleUpgrade('quarterly')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择季付' : 'Choose Quarterly')}
              </Button>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="ring-2 ring-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-orange-500" />
                {language === 'zh' ? '年付计划' : 'Annual'}
                <Badge variant="secondary">{language === 'zh' ? '推荐' : 'Recommended'}</Badge>
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '普通用户的最佳性价比' : 'Best value for regular users'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {language === 'zh' ? '¥98' : '$98'}
                <span className="text-lg font-normal">
                  {language === 'zh' ? '/年' : '/year'}
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited recipe generations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Advanced features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Premium ingredients database
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Save $70 compared to monthly
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => handleUpgrade('yearly')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择年付' : 'Choose Annual')}
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-500" />
                {language === 'zh' ? '终身计划' : 'Lifetime'}
                <Badge variant="secondary">{language === 'zh' ? '最佳价值' : 'Best Value'}</Badge>
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '一次付款，永久使用' : 'One-time payment, forever access'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {language === 'zh' ? '¥168' : '$168'}
                <span className="text-lg font-normal">
                  {language === 'zh' ? ' 一次性' : ' once'}
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited recipe generations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  All premium features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Premium ingredients database
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Lifetime access - no recurring payments
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => handleUpgrade('lifetime')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择终身' : 'Choose Lifetime')}
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Subscription;