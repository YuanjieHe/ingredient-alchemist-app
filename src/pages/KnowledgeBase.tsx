import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, ChefHat, Book, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Dish {
  id: string;
  name: string;
  cuisine_type: string;
  difficulty_level: string;
  cooking_time: number;
  serving_size: number;
  description: string;
  instructions: any;
  nutrition_info: any;
  cultural_background: string;
}

interface Ingredient {
  id: string;
  ingredient_name: string;
  quantity: string;
  is_optional: boolean;
  is_substitutable: boolean;
  substitute_options: string[];
}

const KnowledgeBase = () => {
  const { user } = useAuth();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [dishIngredients, setDishIngredients] = useState<Ingredient[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New dish form state
  const [newDish, setNewDish] = useState({
    name: '',
    cuisine_type: 'chinese',
    difficulty_level: 'medium',
    cooking_time: 30,
    serving_size: 2,
    description: '',
    instructions: '',
    cultural_background: '',
    ingredients: [{ name: '', quantity: '', isOptional: false, isSubstitutable: false, substitutes: '' }]
  });

  const cuisineTypes = [
    { value: 'chinese', label: '中式菜肴' },
    { value: 'japanese', label: '日式料理' },
    { value: 'korean', label: '韩式料理' },
    { value: 'thai', label: '泰式料理' },
    { value: 'italian', label: '意式料理' },
    { value: 'french', label: '法式料理' },
    { value: 'american', label: '美式料理' },
    { value: 'indian', label: '印度料理' },
    { value: 'mexican', label: '墨西哥料理' },
    { value: 'mediterranean', label: '地中海料理' },
    { value: 'other', label: '其他' }
  ];

  const difficultyLevels = [
    { value: 'easy', label: '简单' },
    { value: 'medium', label: '中等' },
    { value: 'hard', label: '困难' }
  ];

  useEffect(() => {
    if (user) {
      fetchDishes();
    }
  }, [user]);

  const fetchDishes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dishes_knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDishes(data || []);
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('获取菜肴数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDishIngredients = async (dishId: string) => {
    try {
      const { data, error } = await supabase
        .from('dish_ingredients')
        .select('*')
        .eq('dish_id', dishId);

      if (error) throw error;
      setDishIngredients(data || []);
    } catch (error) {
      console.error('Error fetching dish ingredients:', error);
      toast.error('获取菜肴食材失败');
    }
  };

  const handleAddDish = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (!newDish.name || !newDish.instructions) {
      toast.error('请填写菜肴名称和制作步骤');
      return;
    }

    setIsLoading(true);
    try {
      // Parse instructions as JSON
      let instructionsJson;
      try {
        instructionsJson = JSON.parse(newDish.instructions);
      } catch {
        // If not valid JSON, convert to simple array format
        instructionsJson = newDish.instructions.split('\n').filter(step => step.trim());
      }

      // Insert dish
      const { data: dishData, error: dishError } = await supabase
        .from('dishes_knowledge_base')
        .insert({
          name: newDish.name,
          cuisine_type: newDish.cuisine_type,
          difficulty_level: newDish.difficulty_level,
          cooking_time: newDish.cooking_time,
          serving_size: newDish.serving_size,
          description: newDish.description,
          instructions: instructionsJson,
          cultural_background: newDish.cultural_background
        })
        .select()
        .single();

      if (dishError) throw dishError;

      // Insert ingredients
      const ingredientsToInsert = newDish.ingredients
        .filter(ing => ing.name.trim())
        .map(ing => ({
          dish_id: dishData.id,
          ingredient_name: ing.name,
          quantity: ing.quantity,
          is_optional: ing.isOptional,
          is_substitutable: ing.isSubstitutable,
          substitute_options: ing.substitutes ? ing.substitutes.split(',').map(s => s.trim()) : []
        }));

      if (ingredientsToInsert.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('dish_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) throw ingredientsError;
      }

      toast.success('菜肴添加成功！');
      setIsAddDialogOpen(false);
      setNewDish({
        name: '',
        cuisine_type: 'chinese',
        difficulty_level: 'medium',
        cooking_time: 30,
        serving_size: 2,
        description: '',
        instructions: '',
        cultural_background: '',
        ingredients: [{ name: '', quantity: '', isOptional: false, isSubstitutable: false, substitutes: '' }]
      });
      fetchDishes();
    } catch (error) {
      console.error('Error adding dish:', error);
      toast.error('添加菜肴失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm('确定要删除这道菜肴吗？')) return;

    try {
      const { error } = await supabase
        .from('dishes_knowledge_base')
        .delete()
        .eq('id', dishId);

      if (error) throw error;
      toast.success('菜肴删除成功！');
      fetchDishes();
    } catch (error) {
      console.error('Error deleting dish:', error);
      toast.error('删除菜肴失败');
    }
  };

  const addIngredientRow = () => {
    setNewDish(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', isOptional: false, isSubstitutable: false, substitutes: '' }]
    }));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    setNewDish(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const removeIngredient = (index: number) => {
    setNewDish(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dish.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuisine = selectedCuisine === 'all' || dish.cuisine_type === selectedCuisine;
    return matchesSearch && matchesCuisine;
  });

  const handleDishSelect = (dish: Dish) => {
    setSelectedDish(dish);
    fetchDishIngredients(dish.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|json)$/)) {
      toast.error('请选择Excel文件 (.xlsx 或 .xls) 或 JSON文件 (.json)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let jsonData: any[];

      if (file.name.match(/\.json$/)) {
        // Handle JSON file
        const text = await file.text();
        const parsedData = JSON.parse(text);
        jsonData = Array.isArray(parsedData) ? parsedData : [parsedData];
      } else {
        // Handle Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }

      if (jsonData.length === 0) {
        throw new Error('文件为空');
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        setUploadProgress(Math.round((i / jsonData.length) * 100));

        try {
          const dishName = row['菜肴名称'] || row['name'] || row.name;
          if (!dishName) {
            errorCount++;
            continue;
          }

          // 映射菜系
          const cuisineMap: { [key: string]: string } = {
            '中式菜肴': 'chinese',
            '日式料理': 'japanese',
            '韩式料理': 'korean',
            '泰式料理': 'thai',
            '意式料理': 'italian',
            '法式料理': 'french',
            '美式料理': 'american',
            '印度料理': 'indian',
            '墨西哥料理': 'mexican',
            '地中海料理': 'mediterranean',
            '其他': 'other'
          };

          // 映射难度
          const difficultyMap: { [key: string]: string } = {
            '简单': 'easy',
            '中等': 'medium',
            '困难': 'hard'
          };

          const cuisineType = cuisineMap[row['菜系'] || row['cuisine'] || row.cuisine_type] || 'chinese';
          const difficultyLevel = difficultyMap[row['难度'] || row['difficulty'] || row.difficulty_level] || 'medium';
          const cookingTime = parseInt(row['烹饪时间'] || row['cooking_time'] || row.cooking_time) || 30;
          const servingSize = parseInt(row['份量'] || row['serving_size'] || row.serving_size) || 2;
          const description = row['描述'] || row['description'] || row.description || '';
          const instructions = row['制作步骤'] || row['instructions'] || row.instructions || '';
          const culturalBackground = row['文化背景'] || row['cultural_background'] || row.cultural_background || '';
          const ingredientsList = row['食材列表'] || row['ingredients'] || row.ingredients || '';

          // 解析制作步骤
          let instructionsJson;
          try {
            instructionsJson = JSON.parse(instructions);
          } catch {
            instructionsJson = instructions.toString().split('\n').filter((step: string) => step.trim());
          }

          // 插入菜肴
          const { data: dishData, error: dishError } = await supabase
            .from('dishes_knowledge_base')
            .insert({
              name: dishName,
              cuisine_type: cuisineType,
              difficulty_level: difficultyLevel,
              cooking_time: cookingTime,
              serving_size: servingSize,
              description: description,
              instructions: instructionsJson,
              cultural_background: culturalBackground
            })
            .select()
            .single();

          if (dishError) {
            console.error('Error inserting dish:', dishError);
            errorCount++;
            continue;
          }

          // 解析并插入食材
          if (ingredientsList && dishData) {
            let ingredients: string[] = [];
            
            if (Array.isArray(ingredientsList)) {
              // JSON格式：数组形式的食材列表
              ingredients = ingredientsList.map((ing: any) => 
                typeof ing === 'string' ? ing : (ing.name || ing.ingredient_name || String(ing))
              ).filter(ing => ing);
            } else {
              // Excel格式：分号分隔的字符串
              ingredients = ingredientsList.toString().split(';')
                .map((ing: string) => ing.trim())
                .filter((ing: string) => ing);
            }

            if (ingredients.length > 0) {
              const ingredientsToInsert = ingredients.map((ingredient: string) => ({
                dish_id: dishData.id,
                ingredient_name: ingredient,
                quantity: '',
                is_optional: false,
                is_substitutable: false,
                substitute_options: []
              }));

              const { error: ingredientsError } = await supabase
                .from('dish_ingredients')
                .insert(ingredientsToInsert);

              if (ingredientsError) {
                console.error('Error inserting ingredients:', ingredientsError);
              }
            }
          }

          successCount++;
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      }

      setUploadProgress(100);
      toast.success(`导入完成！成功：${successCount} 条，失败：${errorCount} 条`);
      setIsUploadDialogOpen(false);
      fetchDishes();

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('文件上传失败：' + (error as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // 清空文件输入
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        '菜肴名称': '宫保鸡丁',
        '菜系': '中式菜肴',
        '难度': '中等',
        '烹饪时间': 20,
        '份量': 2,
        '描述': '经典川菜，口感鲜美',
        '制作步骤': '1. 鸡肉切丁\n2. 爆炒花生米\n3. 下鸡丁炒制\n4. 调味装盘',
        '文化背景': '四川传统名菜',
        '食材列表': '鸡胸肉;花生米;干辣椒;花椒;葱;姜;蒜'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '菜肴模板');
    
    XLSX.writeFile(workbook, '菜肴导入模板.xlsx');
    toast.success('模板下载成功！');
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">请先登录以管理知识库</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">菜肴知识库</h1>
          <p className="text-muted-foreground">管理和维护菜肴数据库</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                批量导入
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>批量导入菜肴</DialogTitle>
              <DialogDescription>
                支持 Excel 和 JSON 文件批量导入菜肴数据。
              </DialogDescription>
            </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="excel-file">选择文件 (Excel 或 JSON)</Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls,.json"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Excel文件格式：</strong></p>
                  <ul className="list-disc list-inside mt-1 mb-3">
                    <li>菜肴名称 (必需)</li>
                    <li>菜系 (中式菜肴/日式料理/等)</li>
                    <li>难度 (简单/中等/困难)</li>
                    <li>烹饪时间 (分钟)</li>
                    <li>份量 (人数)</li>
                    <li>描述</li>
                    <li>制作步骤</li>
                    <li>文化背景</li>
                    <li>食材列表 (用分号分隔)</li>
                  </ul>
                  <p><strong>JSON文件格式：</strong></p>
                  <p className="mt-1">应为对象数组，每个对象包含：name, cuisine_type, difficulty_level, cooking_time, serving_size, description, instructions, cultural_background, ingredients (数组)</p>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>导入进度</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
                  取消
                </Button>
                <Button onClick={downloadTemplate} variant="ghost">
                  <Download className="h-4 w-4 mr-2" />
                  下载模板
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加菜肴
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加新菜肴</DialogTitle>
              <DialogDescription>
                向知识库添加新的菜肴信息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">菜肴名称</Label>
                  <Input
                    id="name"
                    value={newDish.name}
                    onChange={(e) => setNewDish(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：宫保鸡丁"
                  />
                </div>
                <div>
                  <Label htmlFor="cuisine">菜系</Label>
                  <Select value={newDish.cuisine_type} onValueChange={(value) => setNewDish(prev => ({ ...prev, cuisine_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cuisineTypes.map(cuisine => (
                        <SelectItem key={cuisine.value} value={cuisine.value}>
                          {cuisine.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="difficulty">难度</Label>
                  <Select value={newDish.difficulty_level} onValueChange={(value) => setNewDish(prev => ({ ...prev, difficulty_level: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cookingTime">烹饪时间(分钟)</Label>
                  <Input
                    id="cookingTime"
                    type="number"
                    value={newDish.cooking_time}
                    onChange={(e) => setNewDish(prev => ({ ...prev, cooking_time: parseInt(e.target.value) || 30 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="servingSize">份量(人数)</Label>
                  <Input
                    id="servingSize"
                    type="number"
                    value={newDish.serving_size}
                    onChange={(e) => setNewDish(prev => ({ ...prev, serving_size: parseInt(e.target.value) || 2 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={newDish.description}
                  onChange={(e) => setNewDish(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="简短描述这道菜的特点..."
                />
              </div>

              <div>
                <Label htmlFor="instructions">制作步骤</Label>
                <Textarea
                  id="instructions"
                  value={newDish.instructions}
                  onChange={(e) => setNewDish(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="每行一个步骤，或者输入 JSON 格式..."
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="cultural">文化背景</Label>
                <Textarea
                  id="cultural"
                  value={newDish.cultural_background}
                  onChange={(e) => setNewDish(prev => ({ ...prev, cultural_background: e.target.value }))}
                  placeholder="这道菜的历史和文化背景..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>食材列表</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addIngredientRow}>
                    <Plus className="h-3 w-3 mr-1" />
                    添加食材
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {newDish.ingredients.map((ingredient, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-4"
                        placeholder="食材名称"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      />
                      <Input
                        className="col-span-3"
                        placeholder="用量"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      />
                      <div className="col-span-2 flex gap-1">
                        <label className="flex items-center text-xs">
                          <input
                            type="checkbox"
                            checked={ingredient.isOptional}
                            onChange={(e) => updateIngredient(index, 'isOptional', e.target.checked)}
                            className="mr-1"
                          />
                          可选
                        </label>
                      </div>
                      <Input
                        className="col-span-2"
                        placeholder="替代品"
                        value={ingredient.substitutes}
                        onChange={(e) => updateIngredient(index, 'substitutes', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="col-span-1"
                        onClick={() => removeIngredient(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddDish} disabled={isLoading}>
                {isLoading ? '添加中...' : '添加菜肴'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">
            <Book className="h-4 w-4 mr-2" />
            菜肴列表
          </TabsTrigger>
          <TabsTrigger value="details">
            <ChefHat className="h-4 w-4 mr-2" />
            菜肴详情
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="搜索菜肴名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有菜系</SelectItem>
                {cuisineTypes.map(cuisine => (
                  <SelectItem key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDishes.map((dish) => (
              <Card key={dish.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{dish.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDishSelect(dish);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDish(dish.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {cuisineTypes.find(c => c.value === dish.cuisine_type)?.label}
                    </Badge>
                    <Badge variant="outline">
                      {difficultyLevels.find(d => d.value === dish.difficulty_level)?.label}
                    </Badge>
                    <Badge variant="outline">{dish.cooking_time}分钟</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {dish.description || '暂无描述'}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDishes.length === 0 && !isLoading && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {dishes.length === 0 ? '暂无菜肴数据，请添加一些菜肴' : '没有找到匹配的菜肴'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details">
          {selectedDish ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedDish.name}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {cuisineTypes.find(c => c.value === selectedDish.cuisine_type)?.label}
                  </Badge>
                  <Badge variant="outline">
                    {difficultyLevels.find(d => d.value === selectedDish.difficulty_level)?.label}
                  </Badge>
                  <Badge variant="outline">{selectedDish.cooking_time}分钟</Badge>
                  <Badge variant="outline">{selectedDish.serving_size}人份</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedDish.description && (
                  <div>
                    <h3 className="font-semibold mb-2">描述</h3>
                    <p className="text-muted-foreground">{selectedDish.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">所需食材</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dishIngredients.map((ingredient) => (
                      <div key={ingredient.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{ingredient.ingredient_name}</span>
                        <div className="text-sm text-muted-foreground">
                          {ingredient.quantity}
                          {ingredient.is_optional && <Badge variant="outline" className="ml-2">可选</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">制作步骤</h3>
                  <div className="space-y-2">
                    {Array.isArray(selectedDish.instructions) ? (
                      selectedDish.instructions.map((step: string, index: number) => (
                        <div key={index} className="flex gap-3">
                          <Badge variant="outline" className="mt-1 text-xs">
                            {index + 1}
                          </Badge>
                          <p className="flex-1">{step}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        {typeof selectedDish.instructions === 'string' 
                          ? selectedDish.instructions 
                          : JSON.stringify(selectedDish.instructions, null, 2)
                        }
                      </p>
                    )}
                  </div>
                </div>

                {selectedDish.cultural_background && (
                  <div>
                    <h3 className="font-semibold mb-2">文化背景</h3>
                    <p className="text-muted-foreground">{selectedDish.cultural_background}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">请从菜肴列表中选择一道菜查看详情</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeBase;