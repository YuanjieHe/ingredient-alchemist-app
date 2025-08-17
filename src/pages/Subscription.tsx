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

// Stripe Payment Links (web fallback)
const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  monthly: 'https://buy.stripe.com/8x200i9hpbLb3Ea4HbbjW03',
  seasonal: 'https://buy.stripe.com/8x24gy2T15mN2A6ddHbjW02',
  annual: 'https://buy.stripe.com/bJe3cubpx3eFb6C6PjbjW01',
  lifetime: 'https://buy.stripe.com/6oU14mgJR4iJb6C1uZbjW00',
};

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
          // Web 直接跳转 Stripe Payment Link（无需后端）
          const url = STRIPE_PAYMENT_LINKS[planType];
          if (!url) throw new Error('Invalid plan type');
          const win = window.open(url, '_blank');
          if (!win) {
            window.location.href = url;
          }
          toast.info(isEN ? 'Opened checkout in a new tab' : '已在新标签页打开支付页面');
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
      <div className="container mx-auto max-w-6xl py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isEN ? 'Upgrade to Premium' : '升级到高级版'}
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
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Monthly Plan */}
          <Card className="border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="w-5 h-5 text-yellow-500" />
                {language === 'zh' ? '月付' : 'Monthly'}
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '每月' : 'per month'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4 text-yellow-600">
                $4.99
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '无限食谱生成' : 'Unlimited generations'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '所有功能' : 'All features'}
                </li>
              </ul>
              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={() => handleUpgrade('monthly')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择' : 'Select')}
              </Button>
            </CardContent>
          </Card>

          {/* Seasonal Plan */}
          <Card className="border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="w-5 h-5 text-yellow-500" />
                {language === 'zh' ? '季付' : 'Quarterly'}
                <Badge className="bg-green-100 text-green-700 text-xs">
                  {language === 'zh' ? '省 $4' : 'Save $4'}
                </Badge>
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '3个月' : '3 months'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4 text-yellow-600">
                $13.99
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '无限食谱生成' : 'Unlimited generations'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '所有功能' : 'All features'}
                </li>
              </ul>
              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={() => handleUpgrade('seasonal')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择' : 'Select')}
              </Button>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="border-orange-500/20 hover:border-orange-500/40 transition-colors relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-orange-500 text-white">
                {language === 'zh' ? '推荐' : 'Recommended'}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="w-5 h-5 text-orange-500" />
                {language === 'zh' ? '年付' : 'Annual'}
                <Badge className="bg-green-100 text-green-700 text-xs">
                  {language === 'zh' ? '省 $10' : 'Save $10'}
                </Badge>
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '12个月' : '12 months'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4 text-orange-600">
                $49.99
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '无限食谱生成' : 'Unlimited generations'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '所有功能' : 'All features'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '最佳性价比' : 'Best value'}
                </li>
              </ul>
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => handleUpgrade('annual')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择' : 'Select')}
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime Plan */}
          <Card className="border-purple-500/20 hover:border-purple-500/40 transition-colors relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-500 text-white">
                {language === 'zh' ? '终身' : 'Lifetime'}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-purple-500" />
                {language === 'zh' ? '终身' : 'Lifetime'}
                <Badge className="bg-green-100 text-green-700 text-xs">
                  {language === 'zh' ? '最佳价值' : 'Best Value'}
                </Badge>
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '永久使用' : 'Permanent use'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4 text-purple-600">
                $79.99
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '无限食谱生成' : 'Unlimited generations'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '终身更新' : 'Lifetime updates'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === 'zh' ? '无需续费' : 'No renewals'}
                </li>
              </ul>
              <Button 
                className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                onClick={() => handleUpgrade('lifetime')}
                disabled={isLoading}
              >
                {isLoading ? (language === 'zh' ? '处理中...' : 'Processing...') : 
                 (language === 'zh' ? '选择' : 'Select')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Payment Confirmation */}
        {subscription?.subscription_type === 'free' && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Crown className="w-5 h-5" />
                {language === 'zh' ? '确认付款' : 'Confirm Payment'}
              </CardTitle>
              <CardDescription>
                {language === 'zh' ? '完成付款后点击此按钮激活高级功能' : 'Click this button after completing payment to activate premium features'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={handleVerifyPayment} 
                disabled={isLoading}
                className="w-full max-w-md"
                size="lg"
              >
                {isLoading 
                  ? (language === 'zh' ? '验证中...' : 'Verifying...') 
                  : (language === 'zh' ? '确认付款（请在购买后点击此按钮）' : 'Confirm Payment (Please press this button after purchase)')
                }
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Restore Purchases for Apple Pay */}
        {paymentService.isApplePayAvailable() && (
          <Card className="mt-6">
            <CardContent className="pt-6 text-center">
              <Button 
                variant="outline"
                onClick={() => handleUpgrade('restore')}
                disabled={isLoading}
              >
                {language === 'zh' ? '恢复购买' : 'Restore Purchases'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {language === 'zh' 
                  ? '如果您之前购买过，可以点击此按钮恢复'
                  : 'If you previously purchased, click to restore'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Subscription;