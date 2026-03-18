import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Container,
  DatabaseBackup,
  LayoutGrid,
  Lock,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const featureBlocks = [
  {
    title: 'Tasks',
    description:
      'Capture work, home, and follow-ups in one command center with categories, assignments, and progress views.',
    icon: CheckCircle2,
    bullets: ['Kanban + list workflows', 'Quick capture and recurring actions', 'Shared accountability across teams and family'],
  },
  {
    title: 'AI Planner',
    description:
      'Turn busy days into focused action plans with AI-assisted prioritization, suggestions, and daily guidance.',
    icon: BrainCircuit,
    bullets: ['Natural-language planning', 'Smart breakdowns for large tasks', 'Actionable recommendations from your activity'],
  },
  {
    title: 'Notes',
    description:
      'Keep markdown notes, ideas, and references connected to the work you are already doing in LifeOS.',
    icon: NotebookPen,
    bullets: ['Structured writing with markdown', 'Fast search across context', 'Personal and operational knowledge in one place'],
  },
  {
    title: 'Docker self-hosted',
    description:
      'Deploy LifeOS in your own environment with a guided setup flow for privacy-conscious teams and operators.',
    icon: Container,
    bullets: ['Self-host with Docker Compose', 'Run on your own infrastructure', 'Built for cloud or private deployments'],
  },
];

const trustItems = [
  {
    title: 'Privacy-first architecture',
    description: 'Keep sensitive planning, notes, and operational data in a workspace designed around control and visibility.',
    icon: Lock,
  },
  {
    title: 'Self-hosting when you need it',
    description: 'Choose managed cloud for speed or Docker deployment when compliance, ownership, or locality matters most.',
    icon: ShieldCheck,
  },
  {
    title: 'Backups and continuity',
    description: 'Support resilient operations with export, restore, and setup workflows that make recovery part of the system.',
    icon: DatabaseBackup,
  },
];

const screenshotCards = [
  {
    eyebrow: 'Overview',
    title: 'Dashboard snapshot',
    accent: 'from-primary/25 via-primary/10 to-transparent',
    stats: ['12 tasks due', '3 AI nudges', '99.9% synced'],
  },
  {
    eyebrow: 'Execution',
    title: 'Task workflow board',
    accent: 'from-accent/25 via-accent/10 to-transparent',
    stats: ['Backlog', 'In progress', 'Done'],
  },
  {
    eyebrow: 'Thinking',
    title: 'AI planning session',
    accent: 'from-primary/20 via-accent/15 to-transparent',
    stats: ['Priority order', 'Task breakdown', 'Daily plan'],
  },
  {
    eyebrow: 'Knowledge',
    title: 'Notes and docs',
    accent: 'from-secondary via-muted to-transparent',
    stats: ['Markdown', 'Linked context', 'Fast lookup'],
  },
];

export default function Marketing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-24 mx-auto h-72 max-w-5xl rounded-full bg-primary/10 blur-3xl" />

        <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-8">
          <header className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card/50 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[var(--shadow-glow)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">LifeOS</p>
                <p className="text-sm text-muted-foreground">Your command center for work, planning, and self-hosted control.</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <a className="transition-colors hover:text-foreground" href="#features">Features</a>
              <a className="transition-colors hover:text-foreground" href="#trust">Trust</a>
              <a className="transition-colors hover:text-foreground" href="#screens">Screens</a>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            </nav>
          </header>

          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
                <Bot className="h-4 w-4" />
                Plan faster, stay organized, and deploy your way.
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Run your day from one intelligent workspace.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  LifeOS brings tasks, AI planning, notes, and self-hosted deployment together so individuals and teams can move from capture to execution without context switching.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="shadow-[var(--shadow-glow)]">
                  <Link to="/auth">
                    Start in the cloud
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/setup">
                    Set up with Docker
                    <Container className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {['Unified planning', 'AI-assisted prioritization', 'Cloud or self-hosted'].map((item) => (
                  <div key={item} className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground backdrop-blur">
                    <span className="font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card/70 shadow-2xl backdrop-blur">
              <CardContent className="p-0">
                <div className="border-b border-border/60 bg-gradient-to-br from-primary/20 via-background to-background p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-primary">Command center</p>
                      <h2 className="mt-2 text-2xl font-semibold">See the day, then act on it.</h2>
                    </div>
                    <LayoutGrid className="h-8 w-8 text-primary" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm font-medium">Priority queue</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">AI ranked</span>
                      </div>
                      <div className="space-y-3">
                        {[84, 68, 52].map((width, index) => (
                          <div key={width} className="rounded-xl border border-border/50 bg-card p-3">
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span>Task batch {index + 1}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="h-2 rounded-full bg-muted">
                              <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                      <p className="text-sm font-medium">Daily plan</p>
                      <div className="mt-4 space-y-3">
                        {['Review urgent tasks', 'Generate AI work plan', 'Document outcomes in notes'].map((line) => (
                          <div key={line} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-3">
                  {[
                    { label: 'Tasks tracked', value: '18k+' },
                    { label: 'Deploy modes', value: 'Cloud + Docker' },
                    { label: 'Workspace feeling', value: 'Fast, focused' },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-xl font-semibold">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Features</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything needed to move from planning to done.</h2>
          <p className="text-base leading-7 text-muted-foreground">
            Designed with the same dark-first tokens, surfaces, and accent system used throughout the app for a seamless brand experience.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {featureBlocks.map(({ title, description, icon: Icon, bullets }) => (
            <Card key={title} className="h-full rounded-3xl border-border/70 bg-card/70 transition-transform duration-200 hover:-translate-y-1 hover:border-primary/40">
              <CardContent className="flex h-full flex-col gap-6 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold">{title}</h3>
                  <p className="leading-7 text-muted-foreground">{description}</p>
                </div>
                <ul className="mt-auto space-y-3 text-sm text-muted-foreground">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="screens" className="border-y border-border/60 bg-card/30 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Screenshots</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A responsive marketing layout with a built-in screenshot grid.</h2>
              <p className="leading-7 text-muted-foreground">
                The grid collapses cleanly on mobile and expands into a richer overview on desktop to support launch pages, pricing links, and product storytelling.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm text-muted-foreground">
              <TerminalSquare className="h-4 w-4 text-primary" />
              Optimized for mobile and desktop breakpoints
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {screenshotCards.map((card) => (
              <Card key={card.title} className="overflow-hidden rounded-3xl border-border/70 bg-background/80">
                <CardContent className="p-0">
                  <div className={`h-40 bg-gradient-to-br ${card.accent} p-5`}>
                    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-lg backdrop-blur">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-primary">{card.eyebrow}</p>
                          <p className="mt-1 text-sm font-medium">{card.title}</p>
                        </div>
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        {[72, 58, 83].map((width, index) => (
                          <div key={width} className="h-2 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary/80" style={{ width: `${width - index * 8}%` }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-5">
                    {card.stats.map((stat) => (
                      <div key={stat} className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                        {stat}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Trust</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for teams that care about privacy, control, and recovery.</h2>
            <p className="leading-7 text-muted-foreground">
              Whether you choose the hosted experience or deploy with Docker, the product story stays consistent: clear ownership, safer operations, and fewer trade-offs.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {trustItems.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="rounded-3xl border-border/70 bg-card/70">
                <CardContent className="space-y-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <Card className="overflow-hidden rounded-[2rem] border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 shadow-2xl">
          <CardContent className="flex flex-col gap-8 p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Get started</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Choose the rollout path that matches your team.</h2>
              <p className="leading-7 text-muted-foreground">
                Launch quickly in the cloud, or keep everything on infrastructure you control with the Docker setup flow.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-[var(--shadow-glow)]">
                <Link to="/auth">
                  Open cloud workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/setup">
                  Open Docker setup
                  <Container className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
