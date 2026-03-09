import { useMemo } from 'react';
import { Clock, TrendingUp, Calendar, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimeEntry, formatDuration } from '@/hooks/useTimeTracking';

interface TimeAnalyticsProps {
  entries: TimeEntry[];
  todayTotal: number;
  weekTotal: number;
  tasks: { id: string; title: string }[];
  projects: { id: string; title: string }[];
}

const COLORS = ['hsl(var(--primary))', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#06b6d4'];

export function TimeAnalytics({ entries, todayTotal, weekTotal, tasks, projects }: TimeAnalyticsProps) {
  const { language } = useLanguage();

  // Last 7 days chart data
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayEntries = entries.filter(e => {
        const entryDate = new Date(e.start_time);
        return entryDate >= dayStart && entryDate <= dayEnd;
      });

      const totalHours = dayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0) / 3600;
      days.push({
        day: format(date, 'EEE'),
        hours: Math.round(totalHours * 100) / 100,
        date: format(date, 'MMM d'),
      });
    }
    return days;
  }, [entries]);

  // Task distribution
  const taskDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => {
      const key = e.task_id || 'untracked';
      map[key] = (map[key] || 0) + (e.duration_seconds || 0);
    });

    return Object.entries(map)
      .map(([id, seconds]) => ({
        name: id === 'untracked'
          ? (language === 'bn' ? 'আনট্র্যাকড' : 'Untracked')
          : tasks.find(t => t.id === id)?.title || 'Unknown',
        value: Math.round(seconds / 60),
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 8);
  }, [entries, tasks, language]);

  // Project distribution
  const projectDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => {
      const key = e.project_id || 'none';
      map[key] = (map[key] || 0) + (e.duration_seconds || 0);
    });

    return Object.entries(map)
      .filter(([id]) => id !== 'none')
      .map(([id, seconds]) => ({
        name: projects.find(p => p.id === id)?.title || 'Unknown',
        value: Math.round(seconds / 60),
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 6);
  }, [entries, projects]);

  // Average daily hours
  const avgDaily = useMemo(() => {
    const withData = dailyData.filter(d => d.hours > 0);
    if (withData.length === 0) return 0;
    return withData.reduce((s, d) => s + d.hours, 0) / withData.length;
  }, [dailyData]);

  const stats = [
    { label: language === 'bn' ? 'আজ' : 'Today', value: formatDuration(todayTotal), icon: Clock, color: 'text-primary' },
    { label: language === 'bn' ? 'এই সপ্তাহ' : 'This Week', value: formatDuration(weekTotal), icon: Calendar, color: 'text-green-500' },
    { label: language === 'bn' ? 'গড়/দিন' : 'Avg/Day', value: `${avgDaily.toFixed(1)}h`, icon: TrendingUp, color: 'text-yellow-500' },
    { label: language === 'bn' ? 'মোট এন্ট্রি' : 'Total Entries', value: entries.length.toString(), icon: Target, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="font-mono text-lg font-bold text-foreground">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {language === 'bn' ? 'গত ৭ দিনের কাজ' : 'Last 7 Days'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={30}
                  tickFormatter={v => `${v}h`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value}h`, 'Hours']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Task & Project Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {taskDistribution.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'bn' ? 'কাজ অনুযায়ী সময়' : 'Time by Task'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={35} outerRadius={70} paddingAngle={2}>
                      {taskDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`${value}m`, 'Minutes']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-2">
                {taskDistribution.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-foreground truncate max-w-32">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground font-mono">{formatDuration(item.seconds)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {projectDistribution.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'bn' ? 'প্রকল্প অনুযায়ী সময়' : 'Time by Project'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={35} outerRadius={70} paddingAngle={2}>
                      {projectDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`${value}m`, 'Minutes']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-2">
                {projectDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                      <span className="text-foreground truncate max-w-32">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground font-mono">{formatDuration(item.seconds)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
