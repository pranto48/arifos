import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ReportActions } from '@/components/shared/ReportActions';
import { 
  Plus, 
  Wallet, 
  Calendar, 
  TrendingDown, 
  AlertCircle,
  DollarSign,
  Edit2,
  Trash2,
  CreditCard,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useLoans, Loan, LoanFormData, PaymentFormData } from '@/hooks/useLoans';
import { cn } from '@/lib/utils';

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'business', label: 'Business Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'family', label: 'Family/Friend' },
  { value: 'other', label: 'Other' }
];

const PAYMENT_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time' }
];

export default function Loans() {
  const { 
    loans, 
    payments, 
    loading, 
    addLoan, 
    updateLoan, 
    deleteLoan,
    addPayment,
    deletePayment,
    getUpcomingPayments,
    getLoanStats
  } = useLoans();

  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'loan' | 'payment'; id: string } | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [createTransaction, setCreateTransaction] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  // Form states
  const [loanForm, setLoanForm] = useState<Partial<LoanFormData>>({
    loan_type: 'personal',
    payment_frequency: 'monthly',
    reminder_days: 3,
    interest_rate: 0
  });
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentFormData>>({});

  const stats = getLoanStats();
  const upcomingPayments = getUpcomingPayments();

  const filteredLoans = useMemo(() => {
    if (activeTab === 'active') {
      return loans.filter(l => l.status === 'active');
    } else if (activeTab === 'paid_off') {
      return loans.filter(l => l.status === 'paid_off');
    }
    return loans;
  }, [loans, activeTab]);

  const handleOpenLoanDialog = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
      setLoanForm({
        lender_name: loan.lender_name,
        loan_type: loan.loan_type,
        principal_amount: loan.principal_amount,
        interest_rate: loan.interest_rate,
        total_amount: loan.total_amount,
        start_date: loan.start_date,
        end_date: loan.end_date || undefined,
        payment_frequency: loan.payment_frequency,
        monthly_payment: loan.monthly_payment || undefined,
        next_payment_date: loan.next_payment_date || undefined,
        reminder_days: loan.reminder_days,
        notes: loan.notes || undefined
      });
    } else {
      setEditingLoan(null);
      setLoanForm({
        loan_type: 'personal',
        payment_frequency: 'monthly',
        reminder_days: 3,
        interest_rate: 0,
        start_date: format(new Date(), 'yyyy-MM-dd')
      });
    }
    setIsLoanDialogOpen(true);
  };

  const handleSaveLoan = async () => {
    if (!loanForm.lender_name || !loanForm.principal_amount || !loanForm.start_date) {
      return;
    }

    const data: LoanFormData = {
      lender_name: loanForm.lender_name,
      loan_type: loanForm.loan_type || 'personal',
      principal_amount: Number(loanForm.principal_amount),
      interest_rate: Number(loanForm.interest_rate) || 0,
      total_amount: Number(loanForm.total_amount) || Number(loanForm.principal_amount),
      start_date: loanForm.start_date,
      end_date: loanForm.end_date,
      payment_frequency: loanForm.payment_frequency || 'monthly',
      monthly_payment: loanForm.monthly_payment ? Number(loanForm.monthly_payment) : undefined,
      next_payment_date: loanForm.next_payment_date,
      reminder_days: Number(loanForm.reminder_days) || 3,
      notes: loanForm.notes
    };

    if (editingLoan) {
      await updateLoan(editingLoan.id, data);
    } else {
      await addLoan(data);
    }

    setIsLoanDialogOpen(false);
    setLoanForm({});
  };

  const handleOpenPaymentDialog = (loan: Loan) => {
    setSelectedLoanForPayment(loan);
    setPaymentForm({
      loan_id: loan.id,
      amount: loan.monthly_payment || undefined,
      payment_date: format(new Date(), 'yyyy-MM-dd')
    });
    setIsPaymentDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.loan_id || !paymentForm.amount || !paymentForm.payment_date) {
      return;
    }

    await addPayment({
      loan_id: paymentForm.loan_id,
      amount: Number(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes
    }, createTransaction);

    setIsPaymentDialogOpen(false);
    setPaymentForm({});
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'loan') {
      await deleteLoan(deleteConfirm.id);
    } else {
      await deletePayment(deleteConfirm.id);
    }

    setDeleteConfirm(null);
  };

  const getLoanPayments = (loanId: string) => {
    return payments.filter(p => p.loan_id === loanId);
  };

  const getPaymentProgress = (loan: Loan) => {
    const paid = Number(loan.total_amount) - Number(loan.remaining_amount);
    return (paid / Number(loan.total_amount)) * 100;
  };

  const getStatusBadge = (loan: Loan) => {
    if (loan.status === 'paid_off') {
      return <Badge className="bg-green-500/20 text-green-400">Paid Off</Badge>;
    }
    
    if (loan.next_payment_date) {
      const daysUntil = differenceInDays(new Date(loan.next_payment_date), new Date());
      if (daysUntil < 0) {
        return <Badge variant="destructive">Overdue</Badge>;
      } else if (daysUntil <= loan.reminder_days) {
        return <Badge className="bg-yellow-500/20 text-yellow-400">Due Soon</Badge>;
      }
    }
    
    return <Badge variant="secondary">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loans</h1>
          <p className="text-sm text-muted-foreground">Track and manage your loans & payments</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportActions
            variant="compact"
            headers={['Lender', 'Type', 'Principal', 'Total', 'Remaining', 'Monthly', 'Start Date', 'Status']}
            rows={loans.map(l => [l.lender_name, l.loan_type, String(l.principal_amount), String(l.total_amount), String(l.remaining_amount), String(l.monthly_payment || ''), l.start_date, l.status])}
            filename={`lifeos-loans-${new Date().toISOString().split('T')[0]}`}
            title="Loans Report"
            summaryCards={[
              { label: 'Total Debt', value: `৳${stats.totalDebt.toLocaleString()}` },
              { label: 'Remaining', value: `৳${(stats.totalDebt - stats.totalPaid).toLocaleString()}` },
              { label: 'Active Loans', value: stats.activeLoans },
            ]}
          />
          <Button onClick={() => handleOpenLoanDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Loan
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Debt</p>
                  <p className="text-lg font-bold text-foreground">৳{stats.totalDebt.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-foreground">৳{stats.totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Payment</p>
                  <p className="text-lg font-bold text-foreground">৳{stats.monthlyPayments.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Loans</p>
                  <p className="text-lg font-bold text-foreground">{stats.activeLoans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Payments Alert */}
      {upcomingPayments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-500">Upcoming Payments</p>
                  <div className="mt-2 space-y-2">
                    {upcomingPayments.slice(0, 3).map(({ loan, daysUntil }) => (
                      <div key={loan.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{loan.lender_name}</span>
                        <span className="text-muted-foreground">
                          {daysUntil === 0 ? 'Due today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''} left`}
                          {loan.monthly_payment && ` • ৳${Number(loan.monthly_payment).toLocaleString()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loans List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active ({loans.filter(l => l.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="paid_off">Paid Off ({loans.filter(l => l.status === 'paid_off').length})</TabsTrigger>
          <TabsTrigger value="all">All ({loans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredLoans.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No loans found</p>
                  <Button onClick={() => handleOpenLoanDialog()} className="mt-4">
                    Add Your First Loan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredLoans.map((loan, index) => (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card border-border overflow-hidden">
                    <CardContent className="p-0">
                      {/* Main Loan Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground truncate">{loan.lender_name}</h3>
                              {getStatusBadge(loan)}
                              <Badge variant="outline" className="text-xs">
                                {LOAN_TYPES.find(t => t.value === loan.loan_type)?.label || loan.loan_type}
                              </Badge>
                            </div>
                            
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Remaining</span>
                                <span className="font-medium text-foreground">
                                  ৳{Number(loan.remaining_amount).toLocaleString()} / ৳{Number(loan.total_amount).toLocaleString()}
                                </span>
                              </div>
                              <Progress value={getPaymentProgress(loan)} className="h-2" />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                              {loan.monthly_payment && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ৳{Number(loan.monthly_payment).toLocaleString()}/month
                                </span>
                              )}
                              {loan.next_payment_date && loan.status === 'active' && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Next: {format(new Date(loan.next_payment_date), 'MMM d, yyyy')}
                                </span>
                              )}
                              {loan.interest_rate > 0 && (
                                <span>{loan.interest_rate}% interest</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {loan.status === 'active' && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPaymentDialog(loan)}
                                className="gap-1"
                              >
                                <Receipt className="h-4 w-4" />
                                Pay
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenLoanDialog(loan)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm({ type: 'loan', id: loan.id })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
                            >
                              {expandedLoan === loan.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Payment History */}
                      <AnimatePresence>
                        {expandedLoan === loan.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border bg-muted/30"
                          >
                            <div className="p-4">
                              <h4 className="text-sm font-medium mb-3">Payment History</h4>
                              {getLoanPayments(loan.id).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No payments recorded yet</p>
                              ) : (
                                <div className="space-y-2">
                                  {getLoanPayments(loan.id).map(payment => (
                                    <div
                                      key={payment.id}
                                      className="flex items-center justify-between p-2 rounded-lg bg-background"
                                    >
                                      <div>
                                        <p className="text-sm font-medium">৳{Number(payment.amount).toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setDeleteConfirm({ type: 'payment', id: payment.id })}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {loan.notes && (
                                <div className="mt-4 pt-4 border-t border-border">
                                  <p className="text-xs text-muted-foreground">Notes</p>
                                  <p className="text-sm mt-1">{loan.notes}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Loan Dialog */}
      <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLoan ? 'Edit Loan' : 'Add New Loan'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Lender Name *</Label>
                <Input
                  value={loanForm.lender_name || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, lender_name: e.target.value }))}
                  placeholder="Bank, Person, or Institution"
                />
              </div>

              <div>
                <Label>Loan Type</Label>
                <Select
                  value={loanForm.loan_type}
                  onValueChange={value => setLoanForm(prev => ({ ...prev, loan_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Frequency</Label>
                <Select
                  value={loanForm.payment_frequency}
                  onValueChange={value => setLoanForm(prev => ({ ...prev, payment_frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Principal Amount *</Label>
                <Input
                  type="number"
                  value={loanForm.principal_amount || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, principal_amount: Number(e.target.value) }))}
                  placeholder="Original loan amount"
                />
              </div>

              <div>
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={loanForm.interest_rate || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, interest_rate: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  value={loanForm.total_amount || loanForm.principal_amount || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                  placeholder="Total with interest"
                />
              </div>

              <div>
                <Label>Monthly Payment</Label>
                <Input
                  type="number"
                  value={loanForm.monthly_payment || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, monthly_payment: Number(e.target.value) }))}
                  placeholder="EMI amount"
                />
              </div>

              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={loanForm.start_date || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={loanForm.end_date || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Next Payment Date</Label>
                <Input
                  type="date"
                  value={loanForm.next_payment_date || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, next_payment_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Reminder Days Before</Label>
                <Input
                  type="number"
                  value={loanForm.reminder_days || 3}
                  onChange={e => setLoanForm(prev => ({ ...prev, reminder_days: Number(e.target.value) }))}
                  min={0}
                  max={30}
                />
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={loanForm.notes || ''}
                  onChange={e => setLoanForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLoan}>
              {editingLoan ? 'Update' : 'Add'} Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {selectedLoanForPayment && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{selectedLoanForPayment.lender_name}</p>
                <p className="text-sm text-muted-foreground">
                  Remaining: ৳{Number(selectedLoanForPayment.remaining_amount).toLocaleString()}
                </p>
              </div>

              <div>
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount || ''}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date || ''}
                  onChange={e => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  value={paymentForm.notes || ''}
                  onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium">Add to Budget Expenses</p>
                  <p className="text-xs text-muted-foreground">Create a transaction for this payment</p>
                </div>
                <Switch
                  checked={createTransaction}
                  onCheckedChange={setCreateTransaction}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'loan'
                ? 'This will permanently delete this loan and all its payment records.'
                : 'This will delete this payment record and update the loan balance.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
