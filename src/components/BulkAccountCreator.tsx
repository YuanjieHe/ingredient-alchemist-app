import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Users } from 'lucide-react';

interface CreatedAccount {
  email: string;
  password: string;
  userId: string;
  subscriptionStatus: string;
}

export const BulkAccountCreator = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<CreatedAccount[]>([]);
  const { toast } = useToast();

  const createBulkAccounts = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bulk-accounts');
      
      if (error) {
        throw error;
      }

      if (data.success) {
        setCreatedAccounts(data.accounts);
        toast({
          title: "账号创建成功",
          description: `成功创建了 ${data.accounts.length} 个月度会员账号`,
        });
      } else {
        throw new Error(data.error || '创建账号失败');
      }
    } catch (error) {
      console.error('创建账号错误:', error);
      toast({
        title: "创建失败",
        description: error.message || '批量创建账号时发生错误',
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const downloadAccountsCSV = () => {
    if (createdAccounts.length === 0) return;

    const csvContent = [
      ['邮箱', '密码', '订阅状态', '用户ID'],
      ...createdAccounts.map(account => [
        account.email,
        account.password,
        account.subscriptionStatus,
        account.userId
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `推广账号_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          批量创建推广账号
        </CardTitle>
        <CardDescription>
          为地推活动创建20个月度会员账号
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={createBulkAccounts} 
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                创建20个月度会员账号
              </>
            )}
          </Button>
          
          {createdAccounts.length > 0 && (
            <Button 
              variant="outline" 
              onClick={downloadAccountsCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              下载账号信息
            </Button>
          )}
        </div>

        {createdAccounts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">创建的账号列表</h3>
              <Badge variant="secondary">
                共 {createdAccounts.length} 个账号
              </Badge>
            </div>
            
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {createdAccounts.map((account, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{account.email}</span>
                    <span className="font-mono text-xs text-muted-foreground">{account.password}</span>
                  </div>
                  <Badge 
                    variant={account.subscriptionStatus === 'active' ? 'default' : 'destructive'}
                  >
                    {account.subscriptionStatus === 'active' ? '月度会员' : '创建失败'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};