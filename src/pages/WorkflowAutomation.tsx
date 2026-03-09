import { useWorkflowAutomation } from '@/hooks/useWorkflowAutomation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskTemplateManager } from '@/components/workflow/TaskTemplateManager';
import { WorkflowRuleManager } from '@/components/workflow/WorkflowRuleManager';
import { WebhookManager } from '@/components/workflow/WebhookManager';
import { WorkflowLogViewer } from '@/components/workflow/WorkflowLogViewer';
import { FileText, GitBranch, Webhook, History } from 'lucide-react';

export default function WorkflowAutomation() {
  const { language } = useLanguage();
  const {
    templates, rules, webhooks, logs, loading,
    createTemplate, updateTemplate, deleteTemplate, generateTaskFromTemplate,
    createRule, deleteRule, toggleRule,
    createWebhook, deleteWebhook, toggleWebhook,
  } = useWorkflowAutomation();

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {language === 'bn' ? 'ওয়ার্কফ্লো অটোমেশন' : 'Workflow Automation'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {language === 'bn'
            ? 'টেমপ্লেট, ট্রিগার, এবং ওয়েবহুক দিয়ে কাজ স্বয়ংক্রিয় করুন।'
            : 'Automate tasks with templates, triggers, and webhooks.'}
        </p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'টেমপ্লেট' : 'Templates'}</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'রুলস' : 'Rules'}</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ওয়েবহুক' : 'Webhooks'}</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'লগ' : 'Logs'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <TaskTemplateManager
            templates={templates}
            onCreate={createTemplate}
            onDelete={deleteTemplate}
            onGenerate={generateTaskFromTemplate}
            onUpdate={updateTemplate}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <WorkflowRuleManager
            rules={rules}
            onCreate={createRule}
            onDelete={deleteRule}
            onToggle={toggleRule}
          />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <WebhookManager
            webhooks={webhooks}
            onCreate={createWebhook}
            onDelete={deleteWebhook}
            onToggle={toggleWebhook}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <WorkflowLogViewer logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
