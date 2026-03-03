import { useState, useEffect } from 'react';
import { Lightbulb, Plus, MoreVertical, Pencil, Trash2, Calendar, Target, CheckCircle2, Circle, ChevronDown, ChevronUp, Check, X, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
import { ReportActions } from '@/components/shared/ReportActions';

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  target_date: string | null;
  tags: string[] | null;
  created_at: string;
  project_type: string;
}

interface MilestoneItemProps {
  milestone: Milestone;
  onToggle: (milestone: Milestone) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}

function MilestoneItem({ milestone, onToggle, onDelete, onUpdate }: MilestoneItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    const { error } = await supabase
      .from('project_milestones')
      .update({ title: editTitle.trim() })
      .eq('id', milestone.id);

    if (!error) {
      setIsEditing(false);
      onUpdate();
    } else {
      toast.error('Failed to update milestone');
    }
  };

  const handleCancel = () => {
    setEditTitle(milestone.title);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2 group/milestone">
      <button
        onClick={() => onToggle(milestone)}
        className="flex-shrink-0"
      >
        {milestone.is_completed ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
        )}
      </button>
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-6 text-sm py-0"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleSave}
          >
            <Check className="h-3 w-3 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCancel}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className={`text-sm flex-1 ${milestone.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {milestone.title}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover/milestone:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onDelete(milestone.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const statusColors: Record<string, string> = { 
  idea: 'bg-blue-500/20 text-blue-400', 
  researching: 'bg-yellow-500/20 text-yellow-400', 
  building: 'bg-green-500/20 text-green-400', 
  paused: 'bg-orange-500/20 text-orange-400', 
  done: 'bg-primary/20 text-primary', 
  archived: 'bg-muted text-muted-foreground' 
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

export default function Projects() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mode } = useDashboardMode();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [newMilestone, setNewMilestone] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'idea',
    priority: 'medium',
    target_date: '',
    tags: '',
  });

  useEffect(() => {
    if (user) loadProjects();
  }, [user, mode]);

  const loadProjects = async () => {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user?.id)
      .eq('project_type', mode)
      .order('created_at', { ascending: false });
    setProjects(projectsData || []);

    // Load all milestones for filtered projects
    const projectIds = (projectsData || []).map(p => p.id);
    if (projectIds.length > 0) {
      const { data: milestonesData } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('user_id', user?.id)
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true });
      
      const grouped: Record<string, Milestone[]> = {};
      (milestonesData || []).forEach((m: Milestone) => {
        if (!grouped[m.project_id]) grouped[m.project_id] = [];
        grouped[m.project_id].push(m);
      });
      setMilestones(grouped);
    } else {
      setMilestones({});
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'idea',
      priority: 'medium',
      target_date: '',
      tags: '',
    });
    setEditingProject(null);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      target_date: project.target_date || '',
      tags: project.tags?.join(', ') || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    try {
      const payload = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        target_date: formData.target_date || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        project_type: mode,
      };

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);
        if (error) throw error;
        toast.success(t('projects.projectUpdated'));
      } else {
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw error;
        toast.success(t('projects.projectAdded'));
      }

      setDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleMove = async (project: Project) => {
    const newType = project.project_type === 'office' ? 'personal' : 'office';
    const { error } = await supabase
      .from('projects')
      .update({ project_type: newType })
      .eq('id', project.id);

    if (error) {
      toast.error('Failed to move project');
    } else {
      toast.success(`Moved to ${newType}`);
      setProjects(prev => prev.filter(p => p.id !== project.id));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('projects.deleteConfirm'))) return;

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(t('projects.projectDeleted'));
      loadProjects();
    }
  };

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleAddMilestone = async (projectId: string) => {
    const title = newMilestone[projectId]?.trim();
    if (!title || !user) return;

    const currentMilestones = milestones[projectId] || [];
    const { error } = await supabase.from('project_milestones').insert({
      project_id: projectId,
      user_id: user.id,
      title,
      sort_order: currentMilestones.length,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('projects.milestoneAdded'));
      setNewMilestone(prev => ({ ...prev, [projectId]: '' }));
      loadProjects();
    }
  };

  const toggleMilestone = async (milestone: Milestone) => {
    const { error } = await supabase
      .from('project_milestones')
      .update({
        is_completed: !milestone.is_completed,
        completed_at: !milestone.is_completed ? new Date().toISOString() : null,
      })
      .eq('id', milestone.id);

    if (!error) loadProjects();
  };

  const deleteMilestone = async (id: string) => {
    const { error } = await supabase.from('project_milestones').delete().eq('id', id);
    if (!error) {
      toast.success(t('projects.milestoneDeleted'));
      loadProjects();
    }
  };

  const getProgress = (projectId: string) => {
    const projectMilestones = milestones[projectId] || [];
    if (projectMilestones.length === 0) return 0;
    const completed = projectMilestones.filter(m => m.is_completed).length;
    return Math.round((completed / projectMilestones.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('projects.projectIdeas')}</h1>
        <div className="flex items-center gap-2">
        <ReportActions
          variant="compact"
          headers={['Title', 'Status', 'Priority', 'Target Date', 'Tags']}
          rows={projects.map(p => [p.title, p.status, p.priority, p.target_date || '', (p.tags || []).join(', ')])}
          filename={`lifeos-projects-${new Date().toISOString().split('T')[0]}`}
          title="Projects Report"
          summaryCards={[
            { label: 'Total', value: projects.length },
            { label: 'Building', value: projects.filter(p => p.status === 'building').length },
            { label: 'Done', value: projects.filter(p => p.status === 'done').length },
          ]}
        />
        <DataExportImportButton preset="projects" />
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('projects.addProject')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProject ? t('projects.editProject') : t('projects.addProject')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('projects.projectTitle')}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('projects.projectTitle')}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('projects.description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('projects.description')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('projects.status')}</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">{t('projects.idea')}</SelectItem>
                      <SelectItem value="researching">{t('projects.researching')}</SelectItem>
                      <SelectItem value="building">{t('projects.building')}</SelectItem>
                      <SelectItem value="paused">{t('projects.paused')}</SelectItem>
                      <SelectItem value="done">{t('projects.done')}</SelectItem>
                      <SelectItem value="archived">{t('projects.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('projects.priority')}</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t('projects.high')}</SelectItem>
                      <SelectItem value="medium">{t('projects.medium')}</SelectItem>
                      <SelectItem value="low">{t('projects.low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('projects.targetDate')}</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData(f => ({ ...f, target_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('projects.tags')}</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
                  placeholder="React, AI, SaaS..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {editingProject ? t('common.save') : t('common.add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('projects.noProjectsYet')}</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('projects.addProject')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          projects.map(project => {
            const projectMilestones = milestones[project.id] || [];
            const progress = getProgress(project.id);
            const isExpanded = expandedProjects.has(project.id);

            return (
              <Card key={project.id} className="bg-card border-border hover:bg-muted/30 transition-colors group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-foreground">{project.title}</h3>
                    <div className="flex items-center gap-1">
                      <Badge className={statusColors[project.status]}>{t(`projects.${project.status}` as any)}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(project)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMove(project)}>
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Move to {project.project_type === 'office' ? 'Personal' : 'Office'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  )}

                  {/* Progress bar */}
                  {projectMilestones.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t('projects.progress')}</span>
                        <span className="font-mono text-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={priorityColors[project.priority]} variant="outline">
                      <Target className="h-3 w-3 mr-1" />
                      {t(`projects.${project.priority}` as any)}
                    </Badge>
                    {project.target_date && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(project.target_date), 'MMM d, yyyy')}
                      </Badge>
                    )}
                  </div>
                  
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {project.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Milestones section */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(project.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground p-0 h-8">
                        <span className="text-xs">{t('projects.milestones')} ({projectMilestones.filter(m => m.is_completed).length}/{projectMilestones.length})</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      {projectMilestones.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('projects.noMilestones')}</p>
                      ) : (
                        <div className="space-y-1">
                          {projectMilestones.map(milestone => (
                            <MilestoneItem
                              key={milestone.id}
                              milestone={milestone}
                              onToggle={toggleMilestone}
                              onDelete={deleteMilestone}
                              onUpdate={loadProjects}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          value={newMilestone[project.id] || ''}
                          onChange={(e) => setNewMilestone(prev => ({ ...prev, [project.id]: e.target.value }))}
                          placeholder={t('projects.milestonePlaceholder')}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMilestone(project.id);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => handleAddMilestone(project.id)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}