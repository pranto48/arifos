import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, TrendingUp, Lightbulb, FileBarChart, AlertTriangle, CheckCircle, Info, ShieldOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAnalytics, CrossModuleInsight } from '@/hooks/useAnalytics';
import { useProductAnalytics } from '@/hooks/useProductAnalytics';
import { ReportActions } from '@/components/shared/ReportActions';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const chartConfig = {
  tasks: { label: 'Tasks Created', color: 'hsl(var(--primary))' },
  completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
  expenses: { label: 'Expenses', color: 'hsl(var(--destructive))' },
  income: { label: 'Income', color: 'hsl(var(--chart-2))' },
  timeHours: { label: 'Hours Tracked', color: 'hsl(var(--chart-3))' },
  goals: { label: 'Goals', color: 'hsl(var(--chart-4))' },
  quick_action_open: { label: 'Quick Action Opens', color: 'hsl(var(--primary))' },
  ai_action_run: { label: 'AI Actions Run', color: 'hsl(var(--chart-2))' },
  planner_refresh: { label: 'Planner Refreshes', color: 'hsl(var(--chart-3))' },
  note_to_task_conversion: { label: 'Note to Task', color: 'hsl(var(--chart-4))' },
  import_completed: { label: 'Imports Completed', color: 'hsl(var(--chart-5))' },
  import_failed: { label: 'Imports Failed', color: 'hsl(var(--destructive))' },
};

function InsightCard({ insight }: { insight: CrossModuleInsight }) {
  const Icon = insight.type === 'warning' ? AlertTriangle : insight.type === 'success' ? CheckCircle : Info;
  const colors = {
    warning: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
    success: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
    info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
  };
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`border-l-4 rounded-r-lg p-4 ${colors[insight.type]}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{insight.title}</span>
            <Badge variant="outline" className="text-[10px]">{insight.module}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Analytics() {
  const { loading, summary, monthlyTrends, insights, buildReport } = useAnalytics(6);
  const { loading: productLoading, enabled: internalAnalyticsEnabled, totals, series } = useProductAnalytics(14);
  const [selectedModules, setSelectedModules] = useState<string[]>(['tasks', 'goals', 'budget']);

  const toggleModule = (mod: string) => {
    setSelectedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const report = buildReport(selectedModules);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const statCards = [
    { label: 'Task Completion', value: `${summary.taskCompletionRate}%`, sub: `${summary.completedTasks}/${summary.totalTasks}` },
    { label: 'Active Goals', value: summary.activeGoals, sub: `${summary.totalGoals} total` },
    { label: 'Net Budget', value: `৳${(summary.totalBudgetIncome - summary.totalBudgetSpent).toLocaleString()}`, sub: `Income - Expenses` },
    { label: 'Hours Tracked', value: `${summary.totalTimeTracked}h`, sub: `${summary.activeProjects} active projects` },
  ];

  const internalStatCards = [
    { label: 'Quick Action Opens', value: totals.quick_action_open, sub: 'Command palette launches' },
    { label: 'AI Actions Run', value: totals.ai_action_run, sub: 'Successful AI assists' },
    { label: 'Planner Refreshes', value: totals.planner_refresh, sub: 'Manual planner refreshes' },
    { label: 'Imports', value: `${totals.import_completed}/${totals.import_failed}`, sub: 'Completed / failed imports' },
  ];

  const taskStatusData = [
    { name: 'Completed', value: summary.completedTasks },
    { name: 'Pending', value: summary.totalTasks - summary.completedTasks },
  ].filter(d => d.value > 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Analytics & Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-module insights and trend analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends"><TrendingUp className="h-4 w-4 mr-1.5" />Trends</TabsTrigger>
          <TabsTrigger value="insights"><Lightbulb className="h-4 w-4 mr-1.5" />Insights</TabsTrigger>
          <TabsTrigger value="breakdown"><BarChart3 className="h-4 w-4 mr-1.5" />Breakdown</TabsTrigger>
          <TabsTrigger value="internal"><Activity className="h-4 w-4 mr-1.5" />Internal</TabsTrigger>
          <TabsTrigger value="reports"><FileBarChart className="h-4 w-4 mr-1.5" />Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Task Activity</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="tasks" fill="var(--color-tasks)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Income vs Expenses</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="income" fill="var(--color-income)" fillOpacity={0.3} stroke="var(--color-income)" />
                    <Area type="monotone" dataKey="expenses" fill="var(--color-expenses)" fillOpacity={0.3} stroke="var(--color-expenses)" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Time Tracked (Hours)</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="timeHours" stroke="var(--color-timeHours)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Goals Created</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="goals" fill="var(--color-goals)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cross-Module Insights</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {insights.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Not enough data to generate insights yet.</p>
              ) : (
                insights.map((ins, i) => <InsightCard key={i} insight={ins} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Task Status Distribution</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                {taskStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {taskStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-8">No task data</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Productivity Score</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{ score: { label: 'Score', color: 'hsl(var(--primary))' } }} className="h-64">
                  <LineChart data={monthlyTrends.map(m => ({ month: m.month, score: m.tasks ? Math.round((m.completed / m.tasks) * 100) : 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="internal" className="space-y-4">
          {!internalAnalyticsEnabled ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <ShieldOff className="h-10 w-10 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium">Internal analytics disabled</p>
                  <p className="text-sm text-muted-foreground mt-1">Self-hosted admin settings have turned off product telemetry, so this panel stays empty.</p>
                </div>
              </CardContent>
            </Card>
          ) : productLoading ? (
            <Skeleton className="h-72" />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {internalStatCards.map((card) => (
                  <Card key={card.label}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Feature adoption over the last 14 days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-72">
                      <BarChart data={series}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis dataKey="label" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="quick_action_open" stackId="a" fill="var(--color-quick_action_open)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ai_action_run" stackId="a" fill="var(--color-ai_action_run)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="planner_refresh" stackId="a" fill="var(--color-planner_refresh)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="note_to_task_conversion" stackId="a" fill="var(--color-note_to_task_conversion)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="import_completed" stackId="a" fill="var(--color-import_completed)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="import_failed" stackId="a" fill="var(--color-import_failed)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">What this panel tracks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <p className="font-medium">Privacy first</p>
                      <p className="text-muted-foreground mt-1">Only per-user, per-day counters are stored—no note contents, prompts, imports, or command text.</p>
                    </div>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Quick action palette opens.</li>
                      <li>• Successful AI action runs.</li>
                      <li>• Manual planner refreshes.</li>
                      <li>• Note-to-task conversions.</li>
                      <li>• Import completions and failures.</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Report Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Select modules to include in your report:</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { id: 'tasks', label: 'Tasks' },
                  { id: 'goals', label: 'Goals' },
                  { id: 'budget', label: 'Budget' },
                  { id: 'projects', label: 'Projects' },
                  { id: 'time', label: 'Time Entries' },
                ].map(mod => (
                  <div key={mod.id} className="flex items-center gap-2">
                    <Checkbox id={`mod-${mod.id}`} checked={selectedModules.includes(mod.id)} onCheckedChange={() => toggleModule(mod.id)} />
                    <Label htmlFor={`mod-${mod.id}`} className="text-sm cursor-pointer">{mod.label}</Label>
                  </div>
                ))}
              </div>
              {report.rows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{report.rows.length} records selected</span>
                    <ReportActions
                      headers={report.headers}
                      rows={report.rows}
                      filename="lifeos-analytics-report"
                      title="LifeOS Analytics Report"
                      subtitle="Cross-module custom report"
                      summaryCards={statCards.map(c => ({ label: c.label, value: c.value }))}
                      variant="compact"
                      showAi={false}
                    />
                  </div>
                  <div className="border rounded-lg overflow-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>{report.headers.map(h => <th key={h} className="p-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {report.rows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-t hover:bg-muted/50">
                            {row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}
                          </tr>
                        ))}
                        {report.rows.length > 50 && (
                          <tr><td colSpan={report.headers.length} className="p-2 text-center text-muted-foreground">... and {report.rows.length - 50} more records (all included in export)</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {report.rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data for selected modules.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
