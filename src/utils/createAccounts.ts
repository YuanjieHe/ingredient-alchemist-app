import { supabase } from '@/integrations/supabase/client';

export const createBulkAccounts = async () => {
  try {
    console.log('正在创建20个推广账号...');
    
    const { data, error } = await supabase.functions.invoke('auto-create-accounts');
    
    if (error) {
      console.error('创建账号失败:', error);
      throw error;
    }

    if (data.success) {
      console.log(`成功创建了 ${data.totalCreated} 个账号`);
      console.log('账号列表:', data.accounts);
      
      // 将账号信息格式化输出
      console.log('\n=== 推广账号列表 ===');
      data.accounts.forEach((account: any, index: number) => {
        console.log(`${index + 1}. 邮箱: ${account.email} | 密码: ${account.password} | 状态: ${account.subscriptionStatus}`);
      });
      
      return data;
    } else {
      throw new Error(data.error || '创建账号失败');
    }
  } catch (error) {
    console.error('创建账号错误:', error);
    throw error;
  }
};

// 立即执行创建账号
createBulkAccounts().then(() => {
  console.log('✅ 所有推广账号创建完成！');
}).catch((error) => {
  console.error('❌ 创建账号失败:', error);
});