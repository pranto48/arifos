import { useState } from 'react'
import { CalendarCheck2, Loader2, RefreshCw, Clock, Star, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAiAssist } from '@/hooks/useAiAssist'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/integrations/supabase/client'
import { AiIndicator } from '@/components/shared/AiIndicator'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface ScheduleBlock {
  title: string
  time: string
  reason?: string
}

interface DailyPlan {
  summary: string
  focus?: string
  top_priorities: string[]
  quick_wins?: string[]
  schedule_blocks: ScheduleBlock[]
  risks?: string[]
}

export function AiDailyPlanner() {
  const { user } = useAuth()
  const { callAi, loading, config, isAvailable } = useAiAssist()
  const { language } = useLanguage()
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [generated, setGenerated] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const generatePlan = async () => {
    if (!user) return

    const [tasksRes, habitsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('title,status,priority,due_date,task_type')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .limit(20),
      (async () => {
        try {
          const { data } = await supabase
            .from('habits')
            .select('name,frequency')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(10)
          return data || []
        } catch {
          return []
        }
      })(),
    ])

    const tasks = tasksRes.data || []
    const habits = habitsRes

    const context = {
      tasks,
      habits,
      today: new Date().toISOString().split('T')[0],
      day_of_week: format(new Date(), 'EEEE'),
    }

    const result = await callAi('daily_planner', context)
    if (result?.content) {
      try {
        const raw = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
        const cleaned = raw
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim()
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        const jsonStr = start !== -1 && end !== -1 ? cleaned.substring(start, end + 1) : cleaned
        const parsed = JSON.parse(jsonStr)

        if ('subtasks' in parsed) {
          toast.error(language === 'bn' ? 'AI ভুল ফরম্যাটে ডেটা পাঠিয়েছে' : 'AI returned an unexpected schema')
          return
        }

        setPlan(parsed as DailyPlan)
      } catch {
        toast.error(language === 'bn' ? 'পরিকল্পনা পার্স করতে ব্যর্থ' : 'Failed to parse daily plan')
      }
    }
    setGenerated(true)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4 text-primary" />
            {language === 'bn' ? 'AI দৈনিক পরিকল্পনা' : 'AI Daily Planner'}
          </CardTitle>
          <div className="flex items-center gap-1">
            <AiIndicator variant="dot" loading={loading} provider={config?.provider} unavailable={!isAvailable} />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpanded(prev => !prev)}
              title={expanded ? (language === 'bn' ? 'সংকুচিত করুন' : 'Collapse') : (language === 'bn' ? 'প্রসারিত করুন' : 'Expand')}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            {generated && isAvailable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={generatePlan}
                disabled={loading}
                title={language === 'bn' ? 'পুনরায় তৈরি করুন' : 'Regenerate'}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          {!isAvailable ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <AiIndicator variant="inline" unavailable />
              <p className="text-xs text-muted-foreground text-center">
                {language === 'bn'
                  ? 'AI ফিচার সেলফ-হোস্টেড মোডে পাওয়া যায় না'
                  : 'AI features are not available in self-hosted mode'}
              </p>
            </div>
          ) : !generated && !loading ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <p className="text-sm text-muted-foreground text-center">
                {language === 'bn'
                  ? 'আজকের কাজ ও অভ্যাসের উপর ভিত্তি করে একটি পরিকল্পনা তৈরি করুন'
                  : 'Generate a smart plan based on your tasks and habits for today'}
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={generatePlan}>
                <CalendarCheck2 className="h-3.5 w-3.5 mr-1.5" />
                {language === 'bn' ? 'আজকের পরিকল্পনা তৈরি করুন' : "Generate Today's Plan"}
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : plan ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-sm text-foreground leading-relaxed">{plan.summary}</p>
              </div>

              {/* Focus of the day */}
              {plan.focus && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">
                    {language === 'bn' ? 'ফোকাস:' : 'Focus:'}
                  </span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {plan.focus}
                  </Badge>
                </div>
              )}

              {/* Schedule blocks */}
              {plan.schedule_blocks?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <Clock className="h-3.5 w-3.5" />
                    {language === 'bn' ? 'সময়সূচি' : 'Schedule'}
                  </p>
                  <ScrollArea className="max-h-[240px]">
                    <div className="space-y-0.5">
                      {plan.schedule_blocks.map((block, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 px-2 py-2 rounded-md ${i % 2 === 0 ? 'bg-muted/20' : ''}`}
                        >
                          <span className="font-mono text-xs text-muted-foreground min-w-[70px] pt-0.5 shrink-0">
                            {block.time}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground leading-snug">{block.title}</p>
                            {block.reason && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{block.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Top priorities */}
              {plan.top_priorities?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <Star className="h-3.5 w-3.5" />
                    {language === 'bn' ? 'অগ্রাধিকার' : 'Priorities'}
                  </p>
                  <ul className="space-y-1">
                    {plan.top_priorities.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary mt-1 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick wins */}
              {plan.quick_wins && plan.quick_wins.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <Zap className="h-3.5 w-3.5" />
                    {language === 'bn' ? 'দ্রুত সম্পাদনযোগ্য' : 'Quick Wins'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.quick_wins.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs font-normal border-primary/30 text-foreground">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks */}
              {plan.risks && plan.risks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    {language === 'bn' ? 'সতর্কতা' : 'Risks'}
                  </p>
                  <ul className="space-y-1">
                    {plan.risks.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-snug">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  )
}
