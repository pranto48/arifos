

## LifeOS Codebase Analysis -- Gaps and Improvements

After a thorough review of the entire codebase, database schema (50+ tables), all pages, hooks, components, and edge functions, here is what I found.

---

### What Already Exists (Fully Built)
- **Core Modules**: Dashboard, Tasks, Notes, Calendar, Projects, Goals, Habits, Family
- **Finance**: Budget/Transactions, Salary, Investments, Loans
- **IT/Office**: Support Users, Device Inventory, Support Tickets
- **Productivity**: Time Tracking + Pomodoro, Workflow Automation, AI Hub (OCR, NLP, Categorization, Predictions)
- **Analytics**: Cross-module analytics with trend charts
- **Mobile/PWA**: Offline sync, voice input, location reminders, service worker
- **Security**: MFA (TOTP + Email OTP), biometric auth, trusted devices, session management, audit logs
- **Infrastructure**: Self-hosted Docker support, i18n (English/Bengali), role-based access, custom form fields, data export/import, push notifications

---

### Gaps and Improvements Identified

#### 1. Activity Feed / Dashboard Timeline (Missing)
No real-time activity feed showing recent actions across modules. The dashboard shows stats but lacks a chronological "what happened today" view.

**Plan**: Create an `ActivityFeed` component that queries recent entries from `tasks`, `notes`, `transactions`, `time_entries`, `habit_completions` sorted by timestamp, displayed as a unified timeline card on the dashboard.

#### 2. Kanban Board View for Tasks/Projects (Missing)
Tasks page is list-only. No board/column view for visual project management.

**Plan**: Add a Kanban board component using `@dnd-kit` (already installed) with columns for `todo`, `in_progress`, `completed`. Toggle between list and board views on the Tasks page.

#### 3. Notes Rich Text / Markdown Editor (Missing)
Notes currently use plain `<Textarea>`. No formatting, no markdown preview.

**Plan**: Add `react-markdown` (already installed) for rendering note content. Add a split-pane editor with markdown preview using the existing `react-resizable-panels` package.

#### 4. Dashboard Widget for Recent Time Entries (Missing)
Time tracking exists but has no dashboard widget. Users must navigate to `/time-tracking` to see activity.

**Plan**: Create a `RecentTimeEntries` dashboard widget showing today's tracked time and active timer status. Register it in `DashboardCustomizer`.

#### 5. File/Document Attachments Viewer (Incomplete)
`attachments` table exists in the database, but there is no general-purpose attachment upload/view UI on tasks, notes, or projects.

**Plan**: Build a reusable `AttachmentManager` component that handles upload to storage bucket, displays attached files, and can be embedded in Task/Note/Project detail dialogs.

#### 6. Recurring Transaction Auto-Generation (Missing Logic)
Transactions have `is_recurring` and `recurring_pattern` fields but no backend logic to auto-generate them on schedule.

**Plan**: Create a `generate-recurring-transactions` edge function triggered on a schedule (or called from workflow engine) that scans recurring transactions and inserts new ones when due.

#### 7. Goal-to-Task Linking (Missing)
Goals and tasks exist independently. No way to link tasks to a goal to auto-track progress.

**Plan**: Add a `goal_id` column to `tasks` table. Update task creation UI to optionally link a goal. Update goal progress calculation to factor in linked task completion.

#### 8. Data Backup Scheduler Execution (Incomplete)
`backup_schedules` table exists but there is no edge function that actually runs scheduled backups.

**Plan**: Create a `run-scheduled-backup` edge function that exports user data per the schedule config and stores it in a storage bucket.

#### 9. Error Tracking Integration (TODO in code)
`ErrorBoundary.tsx` has a `TODO: Send to error tracking service` comment at line 34.

**Plan**: Implement error logging to the `audit_logs` table for authenticated users, providing a self-hosted error tracking solution.

---

### Recommended Priority Order

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| 1 | Kanban Board for Tasks | High -- visual productivity | Medium |
| 2 | Activity Feed on Dashboard | High -- engagement | Low |
| 3 | Notes Markdown Editor | Medium -- content quality | Low |
| 4 | Attachments Manager | Medium -- missing core feature | Medium |
| 5 | Goal-to-Task Linking | Medium -- cross-module value | Low |
| 6 | Dashboard Time Widget | Low -- convenience | Low |
| 7 | Recurring Transactions | Medium -- automation | Medium |
| 8 | Backup Scheduler Execution | Low -- data safety | Medium |
| 9 | Error Tracking | Low -- developer tool | Low |

---

### Technical Notes
- `@dnd-kit` is already installed and used in Tasks for reordering -- Kanban can reuse the same setup
- `react-markdown` is already a dependency -- just needs integration into Notes
- `react-resizable-panels` is installed -- perfect for split-pane markdown editor
- All new features follow existing patterns: Supabase queries via `useAuth` + RLS, bilingual translations, dashboard mode (personal/office) filtering

