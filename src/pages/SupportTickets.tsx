import { useState, useEffect } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { ReportActions } from '@/components/shared/ReportActions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Ticket,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Send,
  MessageSquare,
  History,
  Settings,
  Plus,
  Trash2,
  Edit,
  ChevronRight,
} from 'lucide-react';
import { TicketCategoryManager } from '@/components/tickets/TicketCategoryManager';
import { TicketFormFieldManager } from '@/components/tickets/TicketFormFieldManager';
import type { SupportTicket, TicketComment, TicketActivityLog, TicketRequester } from '@/hooks/useTickets';

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-500', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-500', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-gray-500', icon: XCircle },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
  medium: { label: 'Medium', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
  high: { label: 'High', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: 'Critical', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
};

export default function SupportTickets() {
  const { tickets, categories, requesters, loading, isAdmin, updateTicket, addComment, getTicketComments, getTicketActivity, reload } = useTickets();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [activity, setActivity] = useState<TicketActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; email: string | null }>>({});

  // Load profiles for assigned users
  useEffect(() => {
    const loadProfiles = async () => {
      const assignedIds = [...new Set(tickets.filter(t => t.assigned_to).map(t => t.assigned_to!))];
      if (assignedIds.length === 0) return;

      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', assignedIds);

      if (data) {
        const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
        data.forEach(p => {
          profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
        });
        setProfiles(profileMap);
      }
    };
    loadProfiles();
  }, [tickets]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const openTicketDetails = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    const [commentsData, activityData] = await Promise.all([
      getTicketComments(ticket.id),
      getTicketActivity(ticket.id),
    ]);
    setComments(commentsData);
    setActivity(activityData);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const updates: Partial<SupportTicket> = { status: newStatus };
      if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
      if (newStatus === 'closed') updates.closed_at = new Date().toISOString();
      
      await updateTicket(ticketId, updates);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...updates } : null);
      }
      toast({ title: 'Status Updated', description: `Ticket status changed to ${newStatus}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const comment = await addComment(selectedTicket.id, newComment, isInternal);
      if (comment) {
        setComments(prev => [...prev, comment]);
        setNewComment('');
        toast({ title: 'Comment Added' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSendingComment(false);
    }
  };

  const getRequester = (requesterId: string | null): TicketRequester | undefined => {
    return requesters.find(r => r.id === requesterId);
  };

  const getCategory = (categoryId: string | null) => {
    return categories.find(c => c.id === categoryId);
  };

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
        <ReportActions
          variant="compact"
          headers={['Ticket #', 'Title', 'Status', 'Priority', 'Category', 'Created']}
          rows={filteredTickets.map(t => [t.ticket_number, t.title, t.status, t.priority, getCategory(t.category_id)?.name || '', t.created_at ? format(new Date(t.created_at), 'yyyy-MM-dd') : ''])}
          filename={`lifeos-tickets-${new Date().toISOString().split('T')[0]}`}
          title="Support Tickets Report"
          summaryCards={[
            { label: 'Total', value: ticketStats.total },
            { label: 'Open', value: ticketStats.open },
            { label: 'In Progress', value: ticketStats.inProgress },
            { label: 'Resolved', value: ticketStats.resolved },
          ]}
        />
      </div>
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Ticket className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ticketStats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ticketStats.open}</p>
                  <p className="text-sm text-muted-foreground">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ticketStats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ticketStats.resolved}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">
            <Ticket className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="categories">
                <Settings className="h-4 w-4 mr-2" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="form-fields">
                <Edit className="h-4 w-4 mr-2" />
                Form Fields
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tickets found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTickets.map((ticket, index) => {
                  const category = getCategory(ticket.category_id);
                  const requester = getRequester(ticket.requester_id);
                  const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open;
                  const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                  const StatusIcon = status.icon;

                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => openTicketDetails(ticket)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${status.color}/10`}>
                              <StatusIcon className={`h-5 w-5 ${status.color.replace('bg-', 'text-')}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                                <Badge variant="outline" className={priority.color}>
                                  {priority.label}
                                </Badge>
                                {category && (
                                  <Badge variant="secondary" style={{ borderColor: category.color }}>
                                    {category.name}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium truncate">{ticket.title}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {requester?.name || 'Unknown'}
                                </span>
                                <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="categories">
              <TicketCategoryManager />
            </TabsContent>
            <TabsContent value="form-fields">
              <TicketFormFieldManager />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground">{selectedTicket.ticket_number}</span>
                  <Badge variant="outline" className={priorityConfig[selectedTicket.priority as keyof typeof priorityConfig]?.color}>
                    {priorityConfig[selectedTicket.priority as keyof typeof priorityConfig]?.label}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedTicket.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Ticket Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Requester</Label>
                    <p>{getRequester(selectedTicket.requester_id)?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{getRequester(selectedTicket.requester_id)?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p>{getCategory(selectedTicket.category_id)?.name || 'Uncategorized'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    {isAdmin ? (
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(v) => handleStatusChange(selectedTicket.id, v)}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p>{statusConfig[selectedTicket.status as keyof typeof statusConfig]?.label}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p>{format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Custom Fields */}
                {selectedTicket.custom_fields && Object.keys(selectedTicket.custom_fields).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Additional Information</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.entries(selectedTicket.custom_fields as Record<string, unknown>).map(([key, value]) => (
                        <div key={key} className="bg-muted/50 rounded p-2">
                          <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                          <p className="text-sm">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4" />
                    <Label>Comments</Label>
                  </div>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                    ) : (
                      comments.map(comment => (
                        <div
                          key={comment.id}
                          className={`p-3 rounded-lg ${comment.is_internal ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {comment.author_type === 'staff' ? (profiles[comment.author_id!]?.full_name || 'Staff') : 'Requester'}
                            </span>
                            {comment.is_internal && <Badge variant="outline" className="text-xs">Internal</Badge>}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="mt-4 space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        Internal note (not visible to requester)
                      </label>
                      <Button onClick={handleAddComment} disabled={!newComment.trim() || sendingComment}>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Activity Log */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4" />
                    <Label>Activity Log</Label>
                  </div>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {activity.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
                    ) : (
                      activity.map(log => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                          </span>
                          <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                          {log.new_value && <span className="text-muted-foreground">→ {log.new_value}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
