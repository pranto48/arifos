import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, MoreVertical, Calendar, RefreshCw } from 'lucide-react';
import { ReportActions } from '@/components/shared/ReportActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

const INVESTMENT_TYPES = [
  { value: 'dps', label: 'DPS' },
  { value: 'fdr', label: 'FDR' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'business', label: 'Business' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'bonds', label: 'Bonds' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'gold', label: 'Gold' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'other', label: 'Other' },
];

const RECURRING_PATTERNS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

interface Investment {
  id: string;
  name: string;
  type: string;
  principal: number;
  current_value: number | null;
  purchase_date: string | null;
  maturity_date: string | null;
  is_recurring: boolean | null;
  recurring_amount: number | null;
  recurring_pattern: string | null;
  notes: string | null;
}

export default function Investments() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'dps',
    principal: '',
    current_value: '',
    purchase_date: '',
    maturity_date: '',
    is_recurring: false,
    recurring_amount: '',
    recurring_pattern: 'monthly',
    notes: '',
  });

  useEffect(() => {
    if (user) loadInvestments();
  }, [user]);

  const loadInvestments = async () => {
    const { data } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setInvestments(data || []);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'dps',
      principal: '',
      current_value: '',
      purchase_date: '',
      maturity_date: '',
      is_recurring: false,
      recurring_amount: '',
      recurring_pattern: 'monthly',
      notes: '',
    });
    setEditingInvestment(null);
  };

  const openEditDialog = (inv: Investment) => {
    setEditingInvestment(inv);
    setFormData({
      name: inv.name,
      type: inv.type,
      principal: inv.principal.toString(),
      current_value: inv.current_value?.toString() || '',
      purchase_date: inv.purchase_date || '',
      maturity_date: inv.maturity_date || '',
      is_recurring: inv.is_recurring || false,
      recurring_amount: inv.recurring_amount?.toString() || '',
      recurring_pattern: inv.recurring_pattern || 'monthly',
      notes: inv.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.principal || !user) return;

    try {
      const payload = {
        user_id: user.id,
        name: formData.name.trim(),
        type: formData.type,
        principal: parseFloat(formData.principal),
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        purchase_date: formData.purchase_date || null,
        maturity_date: formData.maturity_date || null,
        is_recurring: formData.is_recurring,
        recurring_amount: formData.is_recurring && formData.recurring_amount ? parseFloat(formData.recurring_amount) : null,
        recurring_pattern: formData.is_recurring ? formData.recurring_pattern : null,
        notes: formData.notes.trim() || null,
      };

      if (editingInvestment) {
        const { error } = await supabase
          .from('investments')
          .update(payload)
          .eq('id', editingInvestment.id);
        if (error) throw error;
        toast.success(t('investments.updated'));
      } else {
        const { error } = await supabase.from('investments').insert(payload);
        if (error) throw error;
        toast.success(t('investments.added'));
      }

      setDialogOpen(false);
      resetForm();
      loadInvestments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('investments.deleteConfirm'))) return;
    
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(t('investments.deleted'));
      loadInvestments();
    }
  };

  const totalPrincipal = investments.reduce((s, i) => s + Number(i.principal), 0);
  const totalCurrent = investments.reduce((s, i) => s + Number(i.current_value || i.principal), 0);
  const totalPL = totalCurrent - totalPrincipal;

  const getTypeLabel = (type: string) => {
    return INVESTMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('investments.title')}</h1>
        
        <div className="flex items-center gap-4">
          <ReportActions
            variant="compact"
            headers={['Name', 'Type', 'Principal', 'Current Value', 'P/L', 'Purchase Date', 'Maturity Date', 'Recurring']}
            rows={investments.map(inv => {
              const pl = Number(inv.current_value || inv.principal) - Number(inv.principal);
              return [inv.name, getTypeLabel(inv.type), String(inv.principal), String(inv.current_value || inv.principal), String(pl), inv.purchase_date || '', inv.maturity_date || '', inv.is_recurring ? 'Yes' : 'No'];
            })}
            filename={`lifeos-investments-${new Date().toISOString().split('T')[0]}`}
            title="Investment Portfolio Report"
            summaryCards={[
              { label: 'Total Principal', value: `৳${totalPrincipal.toLocaleString()}` },
              { label: 'Current Value', value: `৳${totalCurrent.toLocaleString()}` },
              { label: 'P/L', value: `৳${totalPL.toLocaleString()}` },
            ]}
          />
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('investments.totalValue')}</p>
            <p className="font-mono text-2xl font-bold text-primary">৳{totalCurrent.toLocaleString()}</p>
            <p className={`text-sm font-mono ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPL >= 0 ? '+' : ''}৳{totalPL.toLocaleString()} ({totalPrincipal > 0 ? ((totalPL / totalPrincipal) * 100).toFixed(1) : 0}%)
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('investments.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingInvestment ? t('investments.edit') : t('investments.add')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>{t('investments.name')}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                      placeholder={t('investments.namePlaceholder')}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('investments.type')}</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('investments.principal')} (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.principal}
                      onChange={(e) => setFormData(f => ({ ...f, principal: e.target.value }))}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('investments.currentValue')} (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.current_value}
                      onChange={(e) => setFormData(f => ({ ...f, current_value: e.target.value }))}
                      className="font-mono"
                      placeholder={t('investments.optional')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('investments.purchaseDate')}</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData(f => ({ ...f, purchase_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('investments.maturityDate')}</Label>
                    <Input
                      type="date"
                      value={formData.maturity_date}
                      onChange={(e) => setFormData(f => ({ ...f, maturity_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Recurring Investment */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">{t('investments.recurringInvestment')}</Label>
                      <p className="text-sm text-muted-foreground">{t('investments.recurringDescription')}</p>
                    </div>
                    <Switch
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData(f => ({ ...f, is_recurring: checked }))}
                    />
                  </div>
                  
                  {formData.is_recurring && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label>{t('investments.recurringAmount')} (৳)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.recurring_amount}
                          onChange={(e) => setFormData(f => ({ ...f, recurring_amount: e.target.value }))}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('investments.frequency')}</Label>
                        <Select value={formData.recurring_pattern} onValueChange={(v) => setFormData(f => ({ ...f, recurring_pattern: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RECURRING_PATTERNS.map(p => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('investments.notes')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    placeholder={t('investments.notesPlaceholder')}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingInvestment ? t('common.save') : t('common.add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('investments.totalPrincipal')}</p>
            <p className="font-mono text-xl font-bold text-foreground">৳{totalPrincipal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('investments.currentValue')}</p>
            <p className="font-mono text-xl font-bold text-primary">৳{totalCurrent.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('investments.totalPL')}</p>
            <p className={`font-mono text-xl font-bold ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPL >= 0 ? '+' : ''}৳{totalPL.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {investments.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('investments.noInvestmentsYet')}</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('investments.addFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          investments.map(inv => {
            const pl = Number(inv.current_value || inv.principal) - Number(inv.principal);
            const plPercent = Number(inv.principal) > 0 ? (pl / Number(inv.principal)) * 100 : 0;
            
            return (
              <Card key={inv.id} className="bg-card border-border group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{inv.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary">{getTypeLabel(inv.type)}</Badge>
                        {inv.is_recurring && (
                          <Badge variant="outline" className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {inv.recurring_pattern}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pl >= 0 ? <TrendingUp className="h-5 w-5 text-green-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(inv)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('investments.principal')}</span>
                    <span className="font-mono text-foreground">৳{Number(inv.principal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('investments.current')}</span>
                    <span className="font-mono text-foreground">৳{Number(inv.current_value || inv.principal).toLocaleString()}</span>
                  </div>
                  
                  {inv.is_recurring && inv.recurring_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('investments.recurringAmount')}</span>
                      <span className="font-mono text-foreground">৳{Number(inv.recurring_amount).toLocaleString()}/{inv.recurring_pattern}</span>
                    </div>
                  )}
                  
                  {inv.maturity_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{t('investments.matures')}: {format(new Date(inv.maturity_date), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">{t('investments.profitLoss')}</span>
                    <span className={`font-mono font-semibold ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pl >= 0 ? '+' : ''}৳{pl.toLocaleString()} ({plPercent.toFixed(1)}%)
                    </span>
                  </div>
                  
                  {inv.notes && (
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">{inv.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
