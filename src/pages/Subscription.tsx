import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Subscription = () => {
  const { subscription, remainingGenerations, canGenerate } = useSubscription();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isEN = language === 'en';

  const handleUpgrade = async () => {
    // This will be replaced with actual Apple IAP integration later
    alert(isEN ? 'Apple In-App Purchase integration coming soon!' : '苹果内购集成即将推出！');
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

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card className={`relative ${subscription?.subscription_type === 'free' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {isEN ? 'Free Plan' : '免费版'}
              </CardTitle>
              <CardDescription>
                {isEN ? 'Perfect for trying out the app' : '适合体验应用功能'}
              </CardDescription>
              <div className="text-2xl font-bold">
                {isEN ? 'Free' : '免费'}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? '3 free recipe generations' : '3次免费食谱生成'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? 'Basic recipe features' : '基础食谱功能'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? 'Ingredient management' : '食材管理'}
                  </span>
                </li>
              </ul>
              {subscription?.subscription_type === 'free' && (
                <Badge variant="outline" className="w-full justify-center">
                  {isEN ? 'Current Plan' : '当前方案'}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className={`relative ${subscription?.subscription_type === 'premium' ? 'ring-2 ring-primary' : ''}`}>
            {subscription?.subscription_type !== 'premium' && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-primary to-primary-foreground">
                  {isEN ? 'Recommended' : '推荐'}
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                {isEN ? 'Premium Plan' : '高级版'}
              </CardTitle>
              <CardDescription>
                {isEN ? 'Unlimited cooking possibilities' : '无限烹饪可能'}
              </CardDescription>
              <div className="text-2xl font-bold">
                ¥12<span className="text-sm font-normal text-muted-foreground">/{isEN ? 'month' : '月'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? 'Unlimited recipe generations' : '无限食谱生成'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? 'Advanced recipe features' : '高级食谱功能'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? 'Save favorite recipes' : '收藏喜爱食谱'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? 'Recipe history' : '食谱历史记录'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {isEN ? 'Priority support' : '优先客服支持'}
                  </span>
                </li>
              </ul>
              {subscription?.subscription_type === 'premium' ? (
                <Badge variant="outline" className="w-full justify-center">
                  {isEN ? 'Current Plan' : '当前方案'}
                </Badge>
              ) : (
                <Button onClick={handleUpgrade} className="w-full">
                  {isEN ? 'Upgrade Now' : '立即升级'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            {isEN 
              ? 'Subscriptions will be charged to your Apple ID account. Auto-renewal can be turned off in Account Settings.'
              : '订阅费用将从您的Apple ID账户扣除。可在账户设置中关闭自动续费。'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;