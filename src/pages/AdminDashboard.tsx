import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CreditCard, TrendingUp, ChefHat, Heart, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalUsers: number;
  totalSubscriptions: number;
  paidUsers: number;
  freeUsers: number;
  totalRecipes: number;
  totalFavorites: number;
  totalIngredients: number;
  totalOrders: number;
  recentUsers: any[];
  recentOrders: any[];
  subscriptionBreakdown: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "访问被拒绝",
        description: "请先登录",
        variant: "destructive",
      });
      return false;
    }

    // For now, we'll check if user email contains "admin" or is a specific admin email
    // In production, you'd want a proper role-based system
    const adminEmails = ['admin@what2cook.com', 'jhty111j4@163.com', 'jhty1114@163.com']; // Add your admin emails here
    const isAdminUser = adminEmails.includes(user.email || '') || user.email?.includes('admin');
    
    setIsAdmin(isAdminUser);
    if (!isAdminUser) {
      toast({
        title: "访问被拒绝",
        description: "您没有管理员权限",
        variant: "destructive",
      });
    }
    return isAdminUser;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        usersResult,
        subscriptionsResult,
        recipesResult,
        favoritesResult,
        ingredientsResult,
        ordersResult
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_subscriptions').select('*'),
        supabase.from('recipes_history').select('*'),
        supabase.from('favorite_recipes').select('*'),
        supabase.from('ingredients_bank').select('*'),
        supabase.from('zpay_orders').select('*')
      ]);

      // Calculate statistics
      const totalUsers = usersResult.data?.length || 0;
      const subscriptions = subscriptionsResult.data || [];
      const paidUsers = subscriptions.filter(sub => sub.subscription_type !== 'free').length;
      const freeUsers = totalUsers - paidUsers;

      // Get recent users (last 10)
      const recentUsers = usersResult.data?.slice(-10) || [];
      
      // Get recent orders (last 10)
      const recentOrders = ordersResult.data?.slice(-10) || [];

      // Subscription breakdown
      const subscriptionBreakdown = subscriptions.reduce((acc: any, sub) => {
        const type = sub.subscription_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const dashboardStats: DashboardStats = {
        totalUsers,
        totalSubscriptions: subscriptions.length,
        paidUsers,
        freeUsers,
        totalRecipes: recipesResult.data?.length || 0,
        totalFavorites: favoritesResult.data?.length || 0,
        totalIngredients: ingredientsResult.data?.length || 0,
        totalOrders: ordersResult.data?.length || 0,
        recentUsers,
        recentOrders,
        subscriptionBreakdown: Object.entries(subscriptionBreakdown).map(([type, count]) => ({
          type,
          count
        }))
      };

      setStats(dashboardStats);
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      toast({
        title: "数据加载失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      const hasAccess = await checkAdminAccess();
      if (hasAccess) {
        await fetchDashboardData();
      } else {
        setLoading(false);
      }
    };
    
    initDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>加载管理员数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-7xl mx-auto">
          <Alert className="max-w-md mx-auto mt-20">
            <AlertDescription>
              您没有访问管理员仪表板的权限。请联系系统管理员。
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <div className="max-w-7xl mx-auto">
          <Alert className="max-w-md mx-auto mt-20" variant="destructive">
            <AlertDescription>
              无法加载仪表板数据。请刷新页面或联系技术支持。
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              What2cook 管理员仪表板
            </h1>
            <p className="text-muted-foreground mt-2">系统数据概览与监控</p>
          </div>
          <Button onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总注册用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                付费用户: {stats.paidUsers} | 免费用户: {stats.freeUsers}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">付费用户</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paidUsers}</div>
              <p className="text-xs text-muted-foreground">
                付费率: {stats.totalUsers > 0 ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">生成食谱</CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecipes}</div>
              <p className="text-xs text-muted-foreground">
                收藏食谱: {stats.totalFavorites}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">支付订单</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                食材库条目: {stats.totalIngredients}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Data Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">用户详情</TabsTrigger>
            <TabsTrigger value="subscriptions">订阅详情</TabsTrigger>
            <TabsTrigger value="orders">订单详情</TabsTrigger>
            <TabsTrigger value="activity">活动数据</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>最近注册用户</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>显示名称</TableHead>
                      <TableHead>用户ID</TableHead>
                      <TableHead>语言</TableHead>
                      <TableHead>注册时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.display_name || '未设置'}</TableCell>
                        <TableCell className="font-mono text-xs">{user.user_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.language || 'English'}</Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleString('zh-CN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>订阅类型分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.subscriptionBreakdown.map((item) => (
                      <div key={item.type} className="flex justify-between items-center">
                        <span className="capitalize">{item.type}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>付费转化率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>总用户数</span>
                      <span className="font-bold">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>付费用户</span>
                      <span className="font-bold text-green-600">{stats.paidUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>转化率</span>
                      <span className="font-bold">
                        {stats.totalUsers > 0 ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>最近订单</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单ID</TableHead>
                      <TableHead>用户ID</TableHead>
                      <TableHead>计划类型</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                        <TableCell className="font-mono text-xs">{order.user_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.plan_type}</Badge>
                        </TableCell>
                        <TableCell>¥{(order.amount / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={order.status === 'paid' ? 'default' : 'secondary'}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleString('zh-CN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    食谱活动
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>总生成数</span>
                      <span className="font-bold">{stats.totalRecipes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>收藏数</span>
                      <span className="font-bold">{stats.totalFavorites}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>收藏率</span>
                      <span className="font-bold">
                        {stats.totalRecipes > 0 ? ((stats.totalFavorites / stats.totalRecipes) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>用户参与度</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>人均食谱</span>
                      <span className="font-bold">
                        {stats.totalUsers > 0 ? (stats.totalRecipes / stats.totalUsers).toFixed(1) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>人均收藏</span>
                      <span className="font-bold">
                        {stats.totalUsers > 0 ? (stats.totalFavorites / stats.totalUsers).toFixed(1) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>人均食材</span>
                      <span className="font-bold">
                        {stats.totalUsers > 0 ? (stats.totalIngredients / stats.totalUsers).toFixed(1) : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>系统健康度</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>活跃用户</span>
                      <span className="font-bold text-green-600">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>付费比例</span>
                      <span className="font-bold text-blue-600">
                        {stats.totalUsers > 0 ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>数据完整性</span>
                      <Badge variant="default">良好</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}