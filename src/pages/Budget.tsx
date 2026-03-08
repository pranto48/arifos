import { useState, useEffect, useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Users, Plus, Filter, MoreVertical, Pencil, Trash2, Target, AlertTriangle, Settings, Tag, CreditCard, Banknote, PiggyBank, Receipt, ShoppingCart, ShoppingBag, Utensils, Coffee, Car, Fuel, Home, Lightbulb, Wifi, Phone, Laptop, Gamepad2, Music, Film, Book, GraduationCap, Briefcase, Heart, Activity, Pill, Plane, Train, Bus, Gift, Baby, Dog, Shirt, Scissors, Wrench, Building, DollarSign, HandCoins, Coins, MoreHorizontal, CheckSquare, FolderKanban, FileText, Zap, Link2 } from 'lucide-react';
import { ReportActions } from '@/components/shared/ReportActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { FieldVisibility } from '@/components/shared/FieldVisibility';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  merchant: string | null;
  date: string;
  category_id: string | null;
  family_member_id: string | null;
  account: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  budget_categories: { name: string; color: string } | null;
  family_members: { name: string; relationship: string } | null;
}

type EntityType = 'goal' | 'task' | 'project' | 'note' | 'habit';

interface LinkedEntity {
  id: string;
  title: string;
  type: EntityType;
}

const ENTITY_ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  goal: Target,
  task: CheckSquare,
  project: FolderKanban,
  note: FileText,
  habit: Zap,
};

const ENTITY_COLORS: Record<EntityType, string> = {
  goal: 'text-green-400 bg-green-500/20',
  task: 'text-blue-400 bg-blue-500/20',
  project: 'text-purple-400 bg-purple-500/20',
  note: 'text-orange-400 bg-orange-500/20',
  habit: 'text-cyan-400 bg-cyan-500/20',
};

// Income sources will be translated in component
const INCOME_SOURCE_KEYS = [
  { value: 'salary', key: 'income.salary' },
  { value: 'freelance', key: 'income.freelance' },
  { value: 'business', key: 'income.business' },
  { value: 'investment', key: 'income.investment' },
  { value: 'rental', key: 'income.rental' },
  { value: 'gift', key: 'income.gift' },
  { value: 'other', key: 'income.other' },
] as const;

interface Category {
  id: string;
  name: string;
  is_income: boolean;
  color: string | null;
  icon: string | null;
}

const CATEGORY_ICONS = [
  'Wallet', 'CreditCard', 'Banknote', 'PiggyBank', 'Receipt', 'ShoppingCart', 'ShoppingBag',
  'Utensils', 'Coffee', 'Car', 'Fuel', 'Home', 'Lightbulb', 'Wifi', 'Phone', 'Laptop',
  'Gamepad2', 'Music', 'Film', 'Book', 'GraduationCap', 'Briefcase', 'Heart', 'Activity',
  'Pill', 'Plane', 'Train', 'Bus', 'Gift', 'Baby', 'Dog', 'Shirt', 'Scissors', 'Wrench',
  'Building', 'TrendingUp', 'DollarSign', 'HandCoins', 'Coins', 'MoreHorizontal'
] as const;

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, CreditCard, Banknote, PiggyBank, Receipt, ShoppingCart, ShoppingBag,
  Utensils, Coffee, Car, Fuel, Home, Lightbulb, Wifi, Phone, Laptop,
  Gamepad2, Music, Film, Book, GraduationCap, Briefcase, Heart, Activity,
  Pill, Plane, Train, Bus, Gift, Baby, Dog, Shirt, Scissors, Wrench,
  Building, TrendingUp, DollarSign, HandCoins, Coins, MoreHorizontal
};

const CategoryIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
};

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
}

export default function Budget() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', is_income: false, color: '#6b7280', icon: 'Wallet' });
  const [availableEntities, setAvailableEntities] = useState<LinkedEntity[]>([]);
  const [entityNamesMap, setEntityNamesMap] = useState<Record<string, string>>({});
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'expense' | 'income',
    category_id: '',
    family_member_id: '',
    merchant: '',
    account: 'cash',
    date: new Date().toISOString().split('T')[0],
    linked_entity_type: '' as EntityType | '',
    linked_entity_id: '',
  });

  const [budgetForm, setBudgetForm] = useState({
    category_id: '',
    amount: '',
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadAllTransactions();
      loadCategories();
      loadFamilyMembers();
      loadBudgets();
      loadAvailableEntities();
    }
  }, [user]);

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, budget_categories(name, color), family_members(name, relationship)')
      .eq('user_id', user?.id)
      .order('date', { ascending: false })
      .limit(100);
    setTransactions((data as Transaction[]) || []);
    
    // Build entity names map for linked entities
    if (data) {
      const linkedIds = data
        .filter((t: any) => t.linked_entity_id)
        .map((t: any) => ({ type: t.linked_entity_type, id: t.linked_entity_id }));
      
      if (linkedIds.length > 0) {
        const namesMap: Record<string, string> = {};
        // Fetch names for each entity type
        for (const entityType of ['goal', 'task', 'project', 'note', 'habit'] as EntityType[]) {
          const ids = linkedIds.filter(e => e.type === entityType).map(e => e.id);
          if (ids.length > 0) {
            const table = entityType === 'goal' ? 'goals' : 
                          entityType === 'task' ? 'tasks' :
                          entityType === 'project' ? 'projects' :
                          entityType === 'note' ? 'notes' : 'habits';
            const { data: entityData } = await supabase
              .from(table)
              .select('id, title')
              .in('id', ids);
            entityData?.forEach((e: any) => {
              namesMap[e.id] = e.title;
            });
          }
        }
        setEntityNamesMap(prev => ({ ...prev, ...namesMap }));
      }
    }
  };

  const loadAllTransactions = async () => {
    // Load last 12 months of transactions for the chart
    const sixMonthsAgo = format(subMonths(new Date(), 11), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('transactions')
      .select('id, amount, type, date')
      .eq('user_id', user?.id)
      .gte('date', sixMonthsAgo)
      .order('date', { ascending: true });
    setAllTransactions((data as Transaction[]) || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');
    setCategories(data || []);
  };

  const loadBudgets = async () => {
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user?.id)
      .eq('month', currentMonth)
      .eq('year', currentYear);
    setBudgets(data || []);
  };

  const loadAvailableEntities = async () => {
    if (!user) return;
    
    const entities: LinkedEntity[] = [];
    
    // Load Goals
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    goals?.forEach(g => entities.push({ id: g.id, title: g.title, type: 'goal' }));
    
    // Load Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    tasks?.forEach(t => entities.push({ id: t.id, title: t.title, type: 'task' }));
    
    // Load Projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    projects?.forEach(p => entities.push({ id: p.id, title: p.title, type: 'project' }));
    
    // Load Notes
    const { data: notes } = await supabase
      .from('notes')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    notes?.forEach(n => entities.push({ id: n.id, title: n.title, type: 'note' }));
    
    // Load Habits
    const { data: habits } = await supabase
      .from('habits')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    habits?.forEach(h => entities.push({ id: h.id, title: h.title, type: 'habit' }));
    
    setAvailableEntities(entities);
  };

  const loadFamilyMembers = async () => {
    const { data } = await supabase
      .from('family_members')
      .select('id, name, relationship')
      .eq('user_id', user?.id)
      .order('name');
    setFamilyMembers(data || []);
  };

  // Apply filters
  const filteredByMember = filterMember === 'all' 
    ? transactions 
    : transactions.filter(t => t.family_member_id === filterMember);
    
  const filteredTransactions = filterEntity === 'all'
    ? filteredByMember
    : filteredByMember.filter(t => t.linked_entity_type === filterEntity);

  // Entity statistics
  const entityStats = useMemo(() => {
    const stats: Record<EntityType, { count: number; total: number }> = {
      goal: { count: 0, total: 0 },
      task: { count: 0, total: 0 },
      project: { count: 0, total: 0 },
      note: { count: 0, total: 0 },
      habit: { count: 0, total: 0 },
    };
    
    transactions.forEach(t => {
      if (t.linked_entity_type && t.type === 'expense') {
        const type = t.linked_entity_type as EntityType;
        if (stats[type]) {
          stats[type].count++;
          stats[type].total += Number(t.amount);
        }
      }
    });
    
    return stats;
  }, [transactions]);
  // Filter to current month for budget tracking
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  // Calculate monthly trend data for chart (last 12 months)
  const monthlyTrendData = useMemo(() => {
    const months: { month: string; income: number; expense: number; balance: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'MMM yyyy');
      
      const monthTransactions = allTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });
      
      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const monthExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      months.push({
        month: format(monthDate, 'MMM'),
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense,
      });
    }
    
    return months;
  }, [allTransactions]);

  // Apply filters to current month transactions for summary cards
  const filteredCurrentMonthTransactions = filterMember === 'all' 
    ? currentMonthTransactions 
    : currentMonthTransactions.filter(t => t.family_member_id === filterMember);
  
  const income = filteredCurrentMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = filteredCurrentMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const filteredCategories = categories.filter(c => c.is_income === (formData.type === 'income'));
  const expenseCategories = categories.filter(c => !c.is_income);

  // Calculate spending per category for current month
  const spendingByCategory = expenseCategories.map(cat => {
    const spent = currentMonthTransactions
      .filter(t => t.category_id === cat.id && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const budget = budgets.find(b => b.category_id === cat.id);
    const limit = budget ? Number(budget.amount) : 0;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    
    return {
      ...cat,
      spent,
      limit,
      percentage: Math.min(percentage, 100),
      overBudget: spent > limit && limit > 0,
      nearLimit: percentage >= 80 && percentage < 100,
    };
  }).filter(c => c.limit > 0 || c.spent > 0);

  // Pie chart data for expense breakdown
  const pieChartData = useMemo(() => {
    const categorySpending = categories
      .filter(c => !c.is_income)
      .map(cat => {
        const spent = currentMonthTransactions
          .filter(t => t.category_id === cat.id && t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          name: cat.name,
          value: spent,
          color: cat.color || '#6b7280',
        };
      })
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
    
    // Add "Uncategorized" if there are expenses without category
    const uncategorized = currentMonthTransactions
      .filter(t => !t.category_id && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    if (uncategorized > 0) {
      categorySpending.push({
        name: t('budget.uncategorized'),
        value: uncategorized,
        color: '#9ca3af',
      });
    }
    
    return categorySpending;
  }, [currentMonthTransactions, categories]);

  const totalPieValue = pieChartData.reduce((sum, d) => sum + d.value, 0);

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'expense',
      category_id: '',
      family_member_id: '',
      merchant: '',
      account: 'cash',
      date: new Date().toISOString().split('T')[0],
      linked_entity_type: '',
      linked_entity_id: '',
    });
    setEditingTransaction(null);
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: String(transaction.amount),
      type: transaction.type as 'expense' | 'income',
      category_id: transaction.category_id || '',
      family_member_id: transaction.family_member_id || '',
      merchant: transaction.merchant || '',
      account: transaction.account || 'cash',
      date: transaction.date,
      linked_entity_type: (transaction.linked_entity_type as EntityType) || '',
      linked_entity_id: transaction.linked_entity_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !user) return;

    try {
      const payload = {
        user_id: user.id,
        amount: parseFloat(formData.amount),
        type: formData.type,
        category_id: formData.category_id || null,
        family_member_id: formData.family_member_id || null,
        merchant: formData.merchant.trim() || null,
        account: formData.type === 'income' ? formData.account : 'cash',
        date: formData.date,
        linked_entity_type: formData.linked_entity_type || null,
        linked_entity_id: formData.linked_entity_id || null,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editingTransaction.id);
        if (error) throw error;
        toast.success(t('budget.transactionUpdated'));
      } else {
        const { error } = await supabase.from('transactions').insert(payload);
        if (error) throw error;
        
        // Check if this transaction exceeds budget
        if (formData.category_id && formData.type === 'expense') {
          const budget = budgets.find(b => b.category_id === formData.category_id);
          if (budget) {
            const currentSpent = currentMonthTransactions
              .filter(t => t.category_id === formData.category_id && t.type === 'expense')
              .reduce((sum, t) => sum + Number(t.amount), 0);
            const newTotal = currentSpent + parseFloat(formData.amount);
            
            if (newTotal > Number(budget.amount)) {
              toast.warning(`${t('budget.budgetExceeded')} ৳${newTotal.toLocaleString()} / ৳${Number(budget.amount).toLocaleString()}`);
            } else if ((newTotal / Number(budget.amount)) >= 0.8) {
              toast.info(`${t('budget.approachingLimit')} ${Math.round((newTotal / Number(budget.amount)) * 100)}% ${t('budget.used')}`);
            }
          }
        }
        
        toast.success(t('budget.transactionAdded'));
      }

      setDialogOpen(false);
      resetForm();
      loadTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.category_id || !budgetForm.amount || !user) return;

    try {
      // Check if budget exists for this category/month/year
      const existingBudget = budgets.find(b => b.category_id === budgetForm.category_id);

      if (existingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update({ amount: parseFloat(budgetForm.amount) })
          .eq('id', existingBudget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('budgets').insert({
          user_id: user.id,
          category_id: budgetForm.category_id,
          amount: parseFloat(budgetForm.amount),
          month: currentMonth,
          year: currentYear,
        });
        if (error) throw error;
      }

      toast.success(t('budget.budgetSaved'));
      setBudgetDialogOpen(false);
      setBudgetForm({ category_id: '', amount: '' });
      loadBudgets();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('budget.deleteConfirm'))) return;
    
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(t('budget.transactionDeleted'));
      loadTransactions();
    }
  };

  // Calculate spending by family member
  const spendingByMember = familyMembers.map(member => {
    const memberTransactions = transactions.filter(t => t.family_member_id === member.id && t.type === 'expense');
    const total = memberTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    return { ...member, total, count: memberTransactions.length };
  }).filter(m => m.total > 0).sort((a, b) => b.total - a.total);

  // Categories with budget alerts
  const alertCategories = spendingByCategory.filter(c => c.overBudget || c.nearLimit);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim() || !user) return;

    try {
      const { error } = await supabase.from('budget_categories').insert({
        user_id: user.id,
        name: newCategory.name.trim(),
        is_income: newCategory.is_income,
        color: newCategory.color,
        icon: newCategory.icon,
      });
      if (error) throw error;

      toast.success(t('budget.categoryAdded'));
      setNewCategory({ name: '', is_income: false, color: '#6b7280', icon: 'Wallet' });
      loadCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm(t('budget.deleteCategoryConfirm'))) return;

    const { error } = await supabase.from('budget_categories').delete().eq('id', categoryId);
    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success(t('budget.categoryDeleted'));
      loadCategories();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('budget.title')}</h1>
        
        <div className="flex items-center gap-2 flex-wrap">
          <ReportActions
            variant="compact"
            headers={['Date', 'Type', 'Category', 'Amount', 'Merchant', 'Account', 'Notes']}
            rows={filteredTransactions.map(t => [
              t.date, t.type, t.budget_categories?.name || '', String(t.amount),
              t.merchant || '', t.account || '', ''
            ])}
            filename={`lifeos-budget-${new Date().toISOString().split('T')[0]}`}
            title="Budget Report"
            subtitle={`${new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}`}
            summaryCards={[
              { label: 'Income', value: `৳${filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString()}` },
              { label: 'Expenses', value: `৳${filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}` },
              { label: 'Transactions', value: filteredTransactions.length },
            ]}
          />
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('budget.allMembers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('budget.allMembers')}</SelectItem>
              {familyMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                {t('budget.setBudget')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('budget.setMonthlyLimit')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBudgetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('budget.category')}</Label>
                  <Select value={budgetForm.category_id} onValueChange={(v) => setBudgetForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('budget.selectCategory')} /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('budget.monthlyLimit')} (৳)</Label>
                  <Input
                    type="number"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                    className="font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('budget.limitApplies')} {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setBudgetDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button type="submit">{t('budget.saveLimit')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                {t('budget.manageCategories')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('budget.addCategory')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('budget.categoryName')}</Label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(c => ({ ...c, name: e.target.value }))}
                    placeholder={t('budget.categoryName')}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('budget.categoryType')}</Label>
                    <Select 
                      value={newCategory.is_income ? 'income' : 'expense'} 
                      onValueChange={(v) => setNewCategory(c => ({ ...c, is_income: v === 'income' }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">{t('budget.expenseCategory')}</SelectItem>
                        <SelectItem value="income">{t('budget.incomeCategory')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('budget.categoryColor')}</Label>
                    <Input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory(c => ({ ...c, color: e.target.value }))}
                      className="h-10 p-1 cursor-pointer"
                    />
                  </div>
                </div>
                
                {/* Icon Picker */}
                <div className="space-y-2">
                  <Label>{t('budget.categoryIcon')}</Label>
                  <div className="grid grid-cols-8 gap-1.5 p-2 border rounded-md max-h-32 overflow-y-auto">
                    {CATEGORY_ICONS.map(iconName => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewCategory(c => ({ ...c, icon: iconName }))}
                        className={`p-2 rounded-md hover:bg-muted transition-colors ${
                          newCategory.icon === iconName ? 'bg-primary/20 ring-2 ring-primary' : ''
                        }`}
                      >
                        <CategoryIcon name={iconName} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="submit">{t('common.add')}</Button>
                </div>
              </form>

              {/* Existing Categories List */}
              <div className="mt-4 border-t pt-4">
                <Label className="text-sm font-medium">{t('budget.existingCategories')}</Label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('budget.noCategories')}</p>
                  ) : (
                    categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 group">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-md flex items-center justify-center" 
                            style={{ backgroundColor: cat.color || '#6b7280' }}
                          >
                            <CategoryIcon name={cat.icon || 'Wallet'} className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm">{cat.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {cat.is_income ? t('budget.income') : t('budget.expense')}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t('budget.addTransaction')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTransaction ? t('budget.editTransaction') : t('budget.addTransaction')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('budget.type')}</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(v: 'expense' | 'income') => setFormData(f => ({ ...f, type: v, category_id: '' }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">{t('budget.expense')}</SelectItem>
                        <SelectItem value="income">{t('budget.income')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('budget.amount')} (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FieldVisibility entityType="transaction" fieldName="category_id">
                    <div className="space-y-2">
                      <Label>{t('budget.category')}</Label>
                      <Select value={formData.category_id || "none"} onValueChange={(v) => setFormData(f => ({ ...f, category_id: v === "none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder={t('budget.select')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('common.none')}</SelectItem>
                          {filteredCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldVisibility>
                  <FieldVisibility entityType="transaction" fieldName="date">
                    <div className="space-y-2">
                      <Label>{t('budget.date')}</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                      />
                    </div>
                  </FieldVisibility>
                </div>

                {/* Income Source - Only show for income type */}
                {formData.type === 'income' && (
                  <FieldVisibility entityType="transaction" fieldName="account">
                    <div className="space-y-2">
                      <Label>{t('budget.incomeSource')}</Label>
                      <Select value={formData.account} onValueChange={(v) => setFormData(f => ({ ...f, account: v }))}>
                        <SelectTrigger><SelectValue placeholder={t('budget.selectSource')} /></SelectTrigger>
                        <SelectContent>
                          {INCOME_SOURCE_KEYS.map(source => (
                            <SelectItem key={source.value} value={source.value}>{t(source.key as any)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldVisibility>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FieldVisibility entityType="transaction" fieldName="merchant">
                    <div className="space-y-2">
                      <Label>{t('budget.description')}</Label>
                      <Input
                        value={formData.merchant}
                        onChange={(e) => setFormData(f => ({ ...f, merchant: e.target.value }))}
                        placeholder={t('budget.whereWhat')}
                      />
                    </div>
                  </FieldVisibility>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {t('family.familyMember')}
                    </Label>
                    <Select value={formData.family_member_id || "none"} onValueChange={(v) => setFormData(f => ({ ...f, family_member_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder={t('common.optional')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('common.none')}</SelectItem>
                        {familyMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Entity Linking */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Link to Entity
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={formData.linked_entity_type || "none"} 
                      onValueChange={(v) => setFormData(f => ({ 
                        ...f, 
                        linked_entity_type: v === "none" ? '' : v as EntityType,
                        linked_entity_id: '' 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="goal">
                          <span className="flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-green-400" /> Goal
                          </span>
                        </SelectItem>
                        <SelectItem value="task">
                          <span className="flex items-center gap-2">
                            <CheckSquare className="h-3.5 w-3.5 text-blue-400" /> Task
                          </span>
                        </SelectItem>
                        <SelectItem value="project">
                          <span className="flex items-center gap-2">
                            <FolderKanban className="h-3.5 w-3.5 text-purple-400" /> Project
                          </span>
                        </SelectItem>
                        <SelectItem value="note">
                          <span className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-orange-400" /> Note
                          </span>
                        </SelectItem>
                        <SelectItem value="habit">
                          <span className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-cyan-400" /> Habit
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {formData.linked_entity_type && (
                      <Select 
                        value={formData.linked_entity_id || "none"} 
                        onValueChange={(v) => setFormData(f => ({ ...f, linked_entity_id: v === "none" ? '' : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {availableEntities
                            .filter(e => e.type === formData.linked_entity_type)
                            .map(entity => (
                              <SelectItem key={entity.id} value={entity.id}>
                                {entity.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button type="submit">{editingTransaction ? t('common.save') : t('common.add')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Alerts */}
      {alertCategories.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Budget Alerts</p>
                <div className="mt-1 space-y-1">
                  {alertCategories.map(cat => (
                    <p key={cat.id} className="text-sm text-muted-foreground">
                      <span className="font-medium">{cat.name}:</span>{' '}
                      {cat.overBudget ? (
                        <span className="text-red-500">Over budget by ৳{(cat.spent - cat.limit).toLocaleString()}</span>
                      ) : (
                        <span className="text-orange-500">{Math.round(cat.percentage)}% used</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20"><ArrowUpRight className="h-5 w-5 text-green-400" /></div>
            <div><p className="text-sm text-muted-foreground">Income</p><p className="font-mono text-xl font-bold text-green-400">৳{income.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/20"><ArrowDownRight className="h-5 w-5 text-red-400" /></div>
            <div><p className="text-sm text-muted-foreground">Expenses</p><p className="font-mono text-xl font-bold text-red-400">৳{expense.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Balance</p><p className={`font-mono text-xl font-bold ${income - expense >= 0 ? 'text-green-400' : 'text-red-400'}`}>৳{(income - expense).toLocaleString()}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Entity Expense Indicators */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Expenses by Entity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(['goal', 'task', 'project', 'note', 'habit'] as EntityType[]).map(type => {
              const Icon = ENTITY_ICONS[type];
              const colorClass = ENTITY_COLORS[type];
              const stats = entityStats[type];
              const isActive = filterEntity === type;
              
              return (
                <button
                  key={type}
                  onClick={() => setFilterEntity(isActive ? 'all' : type)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    isActive 
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${colorClass.split(' ')[1]}`}>
                      <Icon className={`h-4 w-4 ${colorClass.split(' ')[0]}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground capitalize">{type}s</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-mono text-lg font-bold text-foreground">
                      ৳{stats.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.count} expense{stats.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {filterEntity !== 'all' && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing expenses linked to <span className="font-medium text-foreground capitalize">{filterEntity}s</span>
              </p>
              <Button variant="ghost" size="sm" onClick={() => setFilterEntity('all')}>
                Clear filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {allTransactions.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="Income"
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#22c55e' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expense" 
                    name="Expense"
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown Pie Chart */}
      {pieChartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Expense Breakdown - {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {pieChartData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ৳{entry.value.toLocaleString()} ({totalPieValue > 0 ? Math.round((entry.value / totalPieValue) * 100) : 0}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Progress */}
      {spendingByCategory.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Budget Progress - {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {spendingByCategory.map(cat => (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color || '#6b7280' }}
                    />
                    <span className="font-medium text-foreground">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${cat.overBudget ? 'text-red-500' : 'text-muted-foreground'}`}>
                      ৳{cat.spent.toLocaleString()}
                    </span>
                    {cat.limit > 0 && (
                      <span className="text-muted-foreground">/ ৳{cat.limit.toLocaleString()}</span>
                    )}
                    {cat.overBudget && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {cat.limit > 0 && (
                  <Progress 
                    value={cat.percentage} 
                    className={`h-2 ${cat.overBudget ? '[&>div]:bg-red-500' : cat.nearLimit ? '[&>div]:bg-orange-500' : ''}`}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Family Spending Summary */}
      {spendingByMember.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Spending by Family Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {spendingByMember.map(member => (
                <div 
                  key={member.id} 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setFilterMember(member.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ৳{member.total.toLocaleString()} • {member.count} transactions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {filterMember !== 'all' 
              ? `Transactions for ${familyMembers.find(m => m.id === filterMember)?.name}` 
              : filterEntity !== 'all'
                ? `${filterEntity.charAt(0).toUpperCase() + filterEntity.slice(1)} Expenses`
                : 'Recent Transactions'
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {filterMember !== 'all' ? 'No transactions for this family member' : "No transactions yet. Press 'e' to add one!"}
            </p>
          ) : (
            filteredTransactions.slice(0, 20).map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group">
                <div className="flex items-center gap-3">
                  {t.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-green-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{t.merchant || t.budget_categories?.name || 'Transaction'}</p>
                      {t.family_members && (
                        <Badge variant="secondary" className="text-xs py-0">
                          <Users className="h-3 w-3 mr-1" />
                          {t.family_members.name}
                        </Badge>
                      )}
                      {t.linked_entity_type && (
                        (() => {
                          const Icon = ENTITY_ICONS[t.linked_entity_type as EntityType];
                          const colorClass = ENTITY_COLORS[t.linked_entity_type as EntityType];
                          return (
                            <Badge variant="outline" className={`text-xs py-0 ${colorClass}`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {entityNamesMap[t.linked_entity_id!] || t.linked_entity_type}
                            </Badge>
                          );
                        })()
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}৳{Number(t.amount).toLocaleString()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(t)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
