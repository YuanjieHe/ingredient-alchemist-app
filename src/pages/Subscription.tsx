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

const Subscription = () => {
  const { subscription, remainingGenerations, canGenerate, refreshSubscription } = useSubscription();
  const { language } = useLanguage();
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
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant={subscription.subscription_type === 'premium' ? 'default' : 'secondary'}>
                    {subscription.subscription_type === 'premium' 
                      ? (isEN ? 'Premium' : '高级版') 
                      : (isEN ? 'Free' : '免费版')
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

        {/* Coming Tomorrow Message */}
        <div className="text-center mb-6">
          <Card className="border-2 border-primary bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                {isEN ? 'Coming Tomorrow' : '明日即将推出'}
              </CardTitle>
              <CardDescription className="text-lg">
                {isEN 
                  ? 'Premium features and payment options will be available tomorrow!' 
                  : '高级功能和付款选项将于明日推出！'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <p className="text-muted-foreground">
                {isEN 
                  ? 'Stay tuned for unlimited recipe generations and advanced features.'
                  : '敬请期待无限食谱生成和高级功能。'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;