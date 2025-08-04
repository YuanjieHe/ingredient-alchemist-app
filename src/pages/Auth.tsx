import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChefHat, ArrowRight, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';


const Auth = () => {
  const { t } = useLanguage();
  const { signIn, signUp, signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // 检查是否是密码重置页面
  useEffect(() => {
    const isReset = searchParams.get('reset');
    if (isReset) {
      toast.info('请输入新密码完成重置');
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('signInSuccess'));
        navigate('/');
      }
    } catch (error) {
      toast.error(t('signInError'));
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
        toast.success(t('signUpSuccess'));
        navigate('/');
      }
    } catch (error) {
      toast.error(t('signUpError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await signInWithOtp(phone);
      if (error) {
        toast.error(error.message);
      } else {
        setShowOtpInput(true);
        toast.success(t('otpSent'));
      }
    } catch (error) {
      toast.error(t('otpSendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await verifyOtp(phone, otp);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('signInSuccess'));
        navigate('/');
      }
    } catch (error) {
      toast.error(t('otpVerifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('密码重置链接已发送到您的邮箱');
        setShowForgotPassword(false);
      }
    } catch (error) {
      toast.error('发送重置链接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('appTitle')}</h1>
          </div>
          <p className="text-muted-foreground">{t('authSubtitle')}</p>
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
                <TabsTrigger value="signin">{t('signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('signIn')}</CardTitle>
                  <CardDescription>
                    {t('signInDescription')}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('signingIn') : t('signIn')}
                  </Button>
                </form>
                
                <div className="text-center mt-4">
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm"
                  >
                    忘记密码？
                  </Button>
                </div>
              </TabsContent>

              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('signUp')}</CardTitle>
                  <CardDescription>
                    {t('signUpDescription')}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('signingUp') : t('signUp')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone" className="space-y-4 mt-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('phoneLogin')}</CardTitle>
                  <CardDescription>
                    {t('phoneLoginDescription')}
                  </CardDescription>
                </CardHeader>
                
                {!showOtpInput ? (
                  <form onSubmit={handlePhoneSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phoneNumber')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t('phonePlaceholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t('sendingOtp') : t('sendOtp')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">{t('verificationCode')}</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder={t('otpPlaceholder')}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t('verifying') : t('verify')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setShowOtpInput(false)}
                    >
                      {t('backToPhone')}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="w-full text-muted-foreground"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {t('skipLogin')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 忘记密码弹出框 */}
        {showForgotPassword && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>忘记密码</CardTitle>
              <CardDescription>
                输入您的邮箱地址，我们将发送密码重置链接
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">邮箱地址</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="输入您的邮箱"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? '发送中...' : '发送重置链接'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;