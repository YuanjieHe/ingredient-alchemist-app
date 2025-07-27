import { supabase } from '@/integrations/supabase/client';

// 测试登录函数
export const testAccountLogin = async () => {
  try {
    console.log('测试账号登录...');
    
    // 测试第一个账号
    const testEmail = 'user847532@recipe-ai.com';
    const testPassword = 'What2cook@2025';
    
    console.log(`尝试登录: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.error('登录失败:', error.message);
      console.log('正在重置所有推广账号密码...');
      
      // 调用密码重置函数
      const { data: resetResult, error: resetError } = await supabase.functions.invoke('reset-account-password');
      
      if (resetError) {
        console.error('密码重置失败:', resetError);
      } else {
        console.log('密码重置成功:', resetResult);
        
        // 重新尝试登录
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        
        if (retryError) {
          console.error('重试登录失败:', retryError.message);
        } else {
          console.log('重试登录成功!', retryData);
          await supabase.auth.signOut();
        }
      }
    } else {
      console.log('登录成功!', data);
      // 登出以便其他测试
      await supabase.auth.signOut();
    }
    
    return { success: !error, error: error?.message };
  } catch (error) {
    console.error('测试登录错误:', error);
    return { success: false, error: error.message };
  }
};

// 立即执行测试
testAccountLogin();