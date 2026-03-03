import { useState, useEffect } from 'react';
import { DollarSign, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { ReportActions } from '@/components/shared/ReportActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface SalaryEntry {
  id: string;
  month: number;
  year: number;
  gross_amount: number;
  net_amount: number;
  allowances: number | null;
  deductions: number | null;
  notes: string | null;
}

export default function Salary() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SalaryEntry | null>(null);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    month: currentMonth.toString(),
    year: currentYear.toString(),
    gross_amount: '',
    net_amount: '',
    allowances: '',
    deductions: '',
    notes: '',
  });

  useEffect(() => {
    if (user) loadEntries();
  }, [user]);

  const loadEntries = async () => {
    const { data } = await supabase
      .from('salary_entries')
      .select('*')
      .eq('user_id', user?.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    setEntries(data || []);
  };

  const resetForm = () => {
    setFormData({
      month: currentMonth.toString(),
      year: currentYear.toString(),
      gross_amount: '',
      net_amount: '',
      allowances: '',
      deductions: '',
      notes: '',
    });
    setEditingEntry(null);
  };

  const openEditDialog = (entry: SalaryEntry) => {
    setEditingEntry(entry);
    setFormData({
      month: entry.month.toString(),
      year: entry.year.toString(),
      gross_amount: entry.gross_amount.toString(),
      net_amount: entry.net_amount.toString(),
      allowances: entry.allowances?.toString() || '',
      deductions: entry.deductions?.toString() || '',
      notes: entry.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gross_amount || !formData.net_amount || !user) return;

    try {
      const payload = {
        user_id: user.id,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        gross_amount: parseFloat(formData.gross_amount),
        net_amount: parseFloat(formData.net_amount),
        allowances: formData.allowances ? parseFloat(formData.allowances) : null,
        deductions: formData.deductions ? parseFloat(formData.deductions) : null,
        notes: formData.notes.trim() || null,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('salary_entries')
          .update(payload)
          .eq('id', editingEntry.id);
        if (error) throw error;
        toast.success(t('salary.entryUpdated'));
      } else {
        // Check if entry exists for this month/year
        const existing = entries.find(e => e.month === payload.month && e.year === payload.year);
        if (existing) {
          toast.error(t('salary.entryExists'));
          return;
        }
        
        const { error } = await supabase.from('salary_entries').insert(payload);
        if (error) throw error;
        toast.success(t('salary.entryAdded'));
      }

      setDialogOpen(false);
      resetForm();
      loadEntries();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('salary.deleteConfirm'))) return;
    
    const { error } = await supabase.from('salary_entries').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(t('salary.entryDeleted'));
      loadEntries();
    }
  };

  // Auto-calculate net amount
  const calculateNet = () => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const net = gross + allowances - deductions;
    setFormData(f => ({ ...f, net_amount: net.toString() }));
  };

  const totalNet = entries.reduce((s, e) => s + Number(e.net_amount), 0);
  const totalGross = entries.reduce((s, e) => s + Number(e.gross_amount), 0);
  const avgNet = entries.length > 0 ? totalNet / entries.length : 0;

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('salary.salaryHistory')}</h1>
        
        <div className="flex items-center gap-4">
          <ReportActions
            variant="compact"
            headers={['Month', 'Year', 'Gross', 'Allowances', 'Deductions', 'Net', 'Notes']}
            rows={entries.map(e => [months[e.month - 1], String(e.year), String(e.gross_amount), String(e.allowances || 0), String(e.deductions || 0), String(e.net_amount), e.notes || ''])}
            filename={`lifeos-salary-${new Date().toISOString().split('T')[0]}`}
            title="Salary History Report"
            summaryCards={[
              { label: 'Total Gross', value: `৳${totalGross.toLocaleString()}` },
              { label: 'Total Net', value: `৳${totalNet.toLocaleString()}` },
              { label: 'Average Net', value: `৳${Math.round(avgNet).toLocaleString()}` },
              { label: 'Entries', value: entries.length },
            ]}
          />
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('salary.totalNetEarned')}</p>
            <p className="font-mono text-2xl font-bold text-primary">৳{totalNet.toLocaleString()}</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('salary.addEntry')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEntry ? t('salary.editEntry') : t('salary.addEntry')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('salary.month')}</Label>
                    <Select value={formData.month} onValueChange={(v) => setFormData(f => ({ ...f, month: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {months.map((m, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('salary.year')}</Label>
                    <Select value={formData.year} onValueChange={(v) => setFormData(f => ({ ...f, year: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('salary.grossAmount')} (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.gross_amount}
                      onChange={(e) => setFormData(f => ({ ...f, gross_amount: e.target.value }))}
                      onBlur={calculateNet}
                      className="font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('salary.netAmount')} (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.net_amount}
                      onChange={(e) => setFormData(f => ({ ...f, net_amount: e.target.value }))}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('salary.allowances')} (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.allowances}
                      onChange={(e) => setFormData(f => ({ ...f, allowances: e.target.value }))}
                      onBlur={calculateNet}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('salary.deductions')} (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.deductions}
                      onChange={(e) => setFormData(f => ({ ...f, deductions: e.target.value }))}
                      onBlur={calculateNet}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('salary.notes')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    placeholder={t('salary.notesPlaceholder')}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingEntry ? t('common.save') : t('common.add')}
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
            <p className="text-sm text-muted-foreground">{t('salary.totalGross')}</p>
            <p className="font-mono text-xl font-bold text-foreground">৳{totalGross.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('salary.totalNet')}</p>
            <p className="font-mono text-xl font-bold text-primary">৳{totalNet.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('salary.avgMonthly')}</p>
            <p className="font-mono text-xl font-bold text-foreground">৳{avgNet.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{t('salary.salaryTimeline')}</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('salary.noEntriesYet')}</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('salary.addFirstEntry')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{months[e.month - 1]} {e.year}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                      <span>{t('salary.gross')}: ৳{Number(e.gross_amount).toLocaleString()}</span>
                      {e.allowances && <span>{t('salary.allowances')}: +৳{Number(e.allowances).toLocaleString()}</span>}
                      {e.deductions && <span>{t('salary.deductions')}: -৳{Number(e.deductions).toLocaleString()}</span>}
                    </div>
                    {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-primary">৳{Number(e.net_amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{t('salary.net')}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(e)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(e.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
