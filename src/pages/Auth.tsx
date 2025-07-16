import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChefHat, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

const Auth = () => {
  const { t } = useLanguage();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('signInSuccess') || '登录成功');
        navigate('/');
      }
    } catch (error) {
      toast.error(t('signInError') || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await signUp(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('signUpSuccess') || '注册成功');
        navigate('/');
      }
    } catch (error) {
      toast.error(t('signUpError') || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('appTitle')}</h1>
          </div>
          <p className="text-muted-foreground">{t('authSubtitle') || '开始您的美食之旅'}</p>
        </div>

        <Card>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-end">
              <LanguageToggle />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('signIn') || '登录'}</TabsTrigger>
                <TabsTrigger value="signup">{t('signUp') || '注册'}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('signIn') || '登录'}</CardTitle>
                  <CardDescription>
                    {t('signInDescription') || '使用您的账户登录'}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('email') || '邮箱'}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('emailPlaceholder') || '请输入邮箱'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('password') || '密码'}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t('passwordPlaceholder') || '请输入密码'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (t('signingIn') || '登录中...') : (t('signIn') || '登录')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('signUp') || '注册'}</CardTitle>
                  <CardDescription>
                    {t('signUpDescription') || '创建新账户'}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email') || '邮箱'}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('emailPlaceholder') || '请输入邮箱'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password') || '密码'}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t('passwordPlaceholder') || '请输入密码（至少6位）'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (t('signingUp') || '注册中...') : (t('signUp') || '注册')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="w-full text-muted-foreground"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {t('skipLogin') || '跳过登录，直接体验'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;