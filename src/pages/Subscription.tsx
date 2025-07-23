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

  const handleUpgrade = async (planType?: string) => {
    // This will be replaced with actual Apple IAP integration later
    const message = planType === 'restore' 
      ? (isEN ? 'Restore purchase functionality coming soon!' : '恢复购买功能即将推出！')
      : (isEN ? `Apple In-App Purchase for ${planType} plan coming soon!` : `${planType} 方案的苹果内购集成即将推出！`);
    alert(message);
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

        {/* Upgrade Plans */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            {isEN ? 'Upgrade to Premium' : '升级到高级会员'}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Monthly Plan */}
          <Card className="relative">
            <CardHeader className="text-center pb-2">
              <div className="text-3xl font-bold text-primary">¥14</div>
              <CardTitle className="text-base">{isEN ? 'Monthly' : '月付'}</CardTitle>
              <CardDescription className="text-sm">
                {isEN ? 'Billed monthly' : '每月'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button onClick={() => handleUpgrade('monthly')} className="w-full">
                {isEN ? 'Select' : '选择'}
              </Button>
            </CardContent>
          </Card>

          {/* Quarterly Plan */}
          <Card className="relative">
            <CardHeader className="text-center pb-2">
              <div className="text-3xl font-bold text-primary">¥30</div>
              <CardTitle className="text-base">{isEN ? 'Quarterly' : '季付'}</CardTitle>
              <CardDescription className="text-sm">
                {isEN ? '3 months' : '3个月'}
              </CardDescription>
              <div className="text-xs text-green-600 font-medium">
                {isEN ? 'Save ¥12' : '节省 ¥12'}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <Button onClick={() => handleUpgrade('quarterly')} className="w-full">
                {isEN ? 'Select' : '选择'}
              </Button>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="relative border-2 border-primary">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-orange-500 text-white">
                {isEN ? 'Recommended' : '推荐'}
              </Badge>
            </div>
            <CardHeader className="text-center pb-2">
              <div className="text-3xl font-bold text-primary">¥98</div>
              <CardTitle className="text-base">{isEN ? 'Annual' : '年付'}</CardTitle>
              <CardDescription className="text-sm">
                {isEN ? '12 months' : '12个月'}
              </CardDescription>
              <div className="text-xs text-green-600 font-medium">
                {isEN ? 'Save ¥70' : '节省 ¥70'}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <Button onClick={() => handleUpgrade('annual')} className="w-full">
                {isEN ? 'Select' : '选择'}
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime Plan */}
          <Card className="relative border-2 border-purple-500">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-500 text-white">
                {isEN ? 'Lifetime' : '终生'}
              </Badge>
            </div>
            <CardHeader className="text-center pb-2">
              <div className="text-3xl font-bold text-purple-600">¥168</div>
              <CardTitle className="text-base">{isEN ? 'Lifetime' : '终生会员'}</CardTitle>
              <CardDescription className="text-sm">
                {isEN ? 'Forever access' : '永久使用'}
              </CardDescription>
              <div className="text-xs text-purple-600 font-medium">
                {isEN ? 'Best value' : '最超值'}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <Button onClick={() => handleUpgrade('lifetime')} className="w-full bg-purple-600 hover:bg-purple-700">
                {isEN ? 'Select' : '选择'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-center">
              {isEN ? 'Premium Features' : '高级功能'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">{isEN ? 'Unlimited recipe generations' : '无限食谱生成'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">{isEN ? 'Advanced recipe features' : '高级食谱功能'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">{isEN ? 'Save favorite recipes' : '收藏喜爱食谱'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">{isEN ? 'Recipe history' : '食谱历史记录'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">{isEN ? 'Priority support' : '优先客服支持'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm">{isEN ? 'No ads' : '无广告'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restore Purchase Button */}
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => handleUpgrade('restore')}>
            📱 {isEN ? 'Restore Purchase (iOS)' : '恢复购买 (iOS)'}
          </Button>
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