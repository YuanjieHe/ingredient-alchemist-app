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
      const result = await paymentService.purchaseProduct(planType);
      
      if (result.success) {
        await refreshSubscription();
        toast.success(isEN ? 'Purchase successful!' : '购买成功！');
      } else {
        toast.error(result.error || (isEN ? 'Purchase failed' : '购买失败'));
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
                {isEN ? 'Free Plan' : '免费版'}
                {subscription?.subscription_type === 'free' && (
                  <Badge variant="outline">{isEN ? 'Current' : '当前'}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isEN ? 'Perfect for trying out our service' : '非常适合试用我们的服务'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {isEN ? 'Free' : '免费'}
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? '3 recipe generations' : '3次食谱生成'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Basic features' : '基础功能'}
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={subscription?.subscription_type === 'free'}
              >
                {subscription?.subscription_type === 'free' 
                  ? (isEN ? 'Current Plan' : '当前方案')
                  : (isEN ? 'Get Started' : '开始使用')
                }
              </Button>
            </CardContent>
          </Card>

          {/* Basic Monthly Plan */}
          <Card className={subscription?.subscription_type === 'premium' ? 'ring-2 ring-primary' : 'ring-2 ring-blue-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-blue-500" />
                {isEN ? 'Basic Monthly' : '基础月付'}
                {subscription?.subscription_type === 'premium' && (
                  <Badge variant="outline">{isEN ? 'Current' : '当前'}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isEN ? 'Great for light users' : '适合轻度用户'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                $8<span className="text-lg font-normal">{isEN ? '/month' : '/月'}</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Unlimited recipe generations' : '无限食谱生成'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Basic features' : '基础功能'}
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => window.open('https://buy.stripe.com/cNi4grawf5b84izdUP2Ji02', '_blank')}
              >
                {isEN ? 'Choose Basic' : '选择基础版'}
              </Button>
            </CardContent>
          </Card>

          {/* Quarterly Plan */}
          <Card className="ring-2 ring-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                {isEN ? 'Quarterly' : '季付'}
                <Badge variant="secondary">{isEN ? 'Popular' : '热门'}</Badge>
              </CardTitle>
              <CardDescription>
                {isEN ? 'Most popular choice for regular users' : '常规用户的最受欢迎选择'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                $20<span className="text-lg font-normal">{isEN ? '/3 months' : '/3个月'}</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Unlimited recipe generations' : '无限食谱生成'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Advanced features' : '高级功能'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Priority support' : '优先支持'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Premium ingredients database' : '高级食材数据库'}
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => window.open('https://buy.stripe.com/bJe8wH6fZ1YWbL12c72Ji01', '_blank')}
              >
                {isEN ? 'Choose Quarterly' : '选择季付'}
              </Button>
            </CardContent>
          </Card>

          {/* 5-Year Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-500" />
                {isEN ? '5-Year Premium' : '五年高级版'}
              </CardTitle>
              <CardDescription>
                {isEN ? 'Best value - long-term savings' : '最超值 - 长期节省'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                $125<span className="text-lg font-normal">{isEN ? '/5 years' : '/5年'}</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Unlimited recipe generations' : '无限食谱生成'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Advanced features' : '高级功能'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Priority support' : '优先支持'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Premium ingredients database' : '高级食材数据库'}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {isEN ? 'Huge savings vs short-term plans' : '比短期方案大幅节省'}
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => window.open('https://buy.stripe.com/4gMcMX7k3avs9CT8Av2Ji00', '_blank')}
              >
                {isEN ? 'Choose 5-Year' : '选择五年'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;