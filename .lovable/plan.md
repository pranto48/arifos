

# Plan: In-App Notifications, Custom Form Fields, and Admin Field Controls

This is a large, multi-system feature request. Here is the implementation plan broken into three pillars.

---

## Feature 1: Pop-Up Notification System (5-second toasts)

**Goal**: Real-time in-app notifications when key events happen (task follow-up due, new device added, new user added, IP change, new ticket created).

### Database Changes
- Create `app_notifications` table:
  - `id`, `user_id` (target), `type` (text: follow_up_due, new_device, new_user, ip_change, new_ticket, etc.), `title`, `message`, `entity_id` (uuid nullable), `is_read` (boolean default false), `created_at`
  - RLS: users can read/update own notifications; admins can insert for any user
- Enable realtime on `app_notifications` via `ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications`
- Create database trigger functions to auto-insert notifications:
  - `AFTER INSERT ON device_inventory` → notify admins/inventory_managers
  - `AFTER INSERT ON support_users` → notify admins/support_managers
  - `AFTER INSERT ON support_tickets` → notify admins/support_managers
  - `AFTER UPDATE ON support_users` (ip_address changed) → notify admins
  - A scheduled/polling check for tasks with `needs_follow_up = true` and `follow_up_date <= today`

### Frontend Changes
- Create `src/hooks/useAppNotifications.ts` — subscribes to realtime `app_notifications` channel, shows `sonner` toast (5-second auto-dismiss) for new inserts, exposes `notifications` list and `markAsRead`
- Create `src/components/notifications/NotificationBell.tsx` — bell icon in header with unread count badge, dropdown showing recent notifications
- Integrate `useAppNotifications` hook in `AppLayout.tsx` so toasts fire globally
- For Docker mode: use polling (every 30s) instead of realtime subscriptions since Supabase realtime is unavailable

---

## Feature 2: Admin Custom Form Fields (for all modules)

**Goal**: Admin can define custom fields for Tasks, Notes, Expenses, Goals, Devices, Projects, etc. These fields appear in forms and power search/filter.

### Database Changes
- Create `custom_form_fields` table (generalizing the existing `ticket_form_fields` pattern):
  - `id`, `user_id` (creator/admin), `entity_type` (text: task, note, transaction, goal, device_inventory, project, support_user), `field_name`, `field_label`, `field_type` (text, textarea, select, checkbox, date, number), `field_options` (jsonb — for dropdowns), `is_required` (boolean), `is_active` (boolean default true), `placeholder`, `default_value`, `sort_order` (int), `created_at`, `updated_at`
  - RLS: all authenticated can SELECT active fields; admin can INSERT/UPDATE/DELETE
- Each entity table already has or will use a `custom_fields` JSONB column to store values. Tables needing a new `custom_fields` column:
  - `tasks` (add `custom_fields jsonb`)
  - `notes` (add `custom_fields jsonb`)
  - `transactions` (add `custom_fields jsonb`)
  - `goals` (add `custom_fields jsonb`)
  - `device_inventory` — already has `custom_specs jsonb`, reuse this
  - `projects` (add `custom_fields jsonb`)
  - `support_users` (add `custom_fields jsonb`)

### Frontend Changes
- Create `src/hooks/useCustomFormFields.ts` — fetches `custom_form_fields` for a given `entity_type`, caches them
- Create `src/components/shared/CustomFieldsRenderer.tsx` — renders dynamic form fields based on field definitions, returns values as JSONB object
- Create `src/components/shared/CustomFieldsDisplay.tsx` — read-only display of custom field values
- Create `src/components/shared/CustomFieldsFilter.tsx` — filter/search UI that reads custom field definitions and filters data by custom_fields JSONB values
- Integrate into each module's add/edit dialog:
  - Tasks, Notes, Budget (transactions), Goals, Device Inventory, Projects, Support Users
  - Add custom fields section below existing form fields
  - Store values in `custom_fields` JSONB column on save
- Integrate custom fields into search/filter logic in each page (search across `custom_fields` values)

---

## Feature 3: Admin Field Visibility Controls

**Goal**: Admin can disable/enable any standard form field or custom field from the admin panel.

### Database Changes
- Create `form_field_config` table:
  - `id`, `entity_type` (text), `field_name` (text — maps to standard column name or custom field name), `is_enabled` (boolean default true), `is_custom` (boolean default false), `updated_by` (uuid), `updated_at`
  - RLS: all authenticated can SELECT; admin can INSERT/UPDATE/DELETE
  - Unique constraint on `(entity_type, field_name)`

### Frontend Changes
- Create `src/hooks/useFormFieldConfig.ts` — fetches enabled/disabled state for all fields of an entity_type
- Create `src/components/settings/FormFieldSettings.tsx` — admin panel tab/card where admin sees all modules, each module lists standard fields + custom fields with toggle switches
- Integrate into `AdminSettings.tsx` as a new tab ("Form Fields")
- Update each module's form to check field visibility before rendering:
  - Wrap each form field in a conditional `if (fieldConfig.isEnabled('field_name'))`
  - Hide disabled fields from forms, filters, and exports

---

## Implementation Order

1. **Database migration** — Create all 3 tables (`app_notifications`, `custom_form_fields`, `form_field_config`), add `custom_fields` JSONB columns to entity tables, create notification triggers, enable realtime
2. **Notification system** — Hook, bell component, realtime/polling integration, toast display
3. **Custom form fields** — Hook, renderer, admin manager UI (reuse TicketFormFieldManager pattern), integrate into all module forms
4. **Field visibility controls** — Hook, admin settings panel, conditional rendering in forms
5. **Search/filter integration** — Custom fields filter component, integrate into each module's filter bar

### Technical Notes
- The existing `ticket_form_fields` / `TicketFormFieldManager` pattern will be the template for the generalized custom fields system
- Docker compatibility: notification polling fallback, all data stored in standard Postgres tables
- Custom fields JSONB is searchable via `custom_fields->>'field_name' ILIKE '%query%'` in Supabase queries
- For Docker mode, the PostgREST proxy already handles JSONB operations

