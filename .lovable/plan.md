

## Analysis

After reviewing all AI components, I found several issues preventing proper AI indication in both Docker and web app modes:

### Bugs Found

1. **Edge function prompt data mismatch**: The `smart_suggestions` handler reads `context.activity` (undefined) but the frontend sends individual fields like `total_tasks`, `completed_tasks`, etc. Same issue with `anomaly_detection` reading `context.data` instead of the actual fields sent. This means AI gets empty prompts.

2. **No self-hosted visual state**: AI widgets (Smart Suggestions, Anomaly Alerts, Report Summary, Notification Digest) don't show any visual "unavailable" state in Docker mode -- they render normally but silently fail on click.

3. **AiIndicator has no "unavailable" variant**: It only shows Free/Pro/Llama states but has no Docker/offline/unavailable state.

---

## Plan

### 1. Fix edge function prompt construction
Update `supabase/functions/ai-assist/index.ts` to serialize the full context object into the user prompt instead of reading non-existent sub-keys:
- `smart_suggestions`: `JSON.stringify(context)` instead of `context.activity`
- `anomaly_detection`: `JSON.stringify(context)` instead of `context.data`

### 2. Add "unavailable" state to AiIndicator
Add a new `unavailable` prop to `AiIndicator` that shows a grayed-out "AI Offline" badge for Docker mode.

### 3. Add self-hosted guards to all AI widgets
In each AI widget (`AiSmartSuggestions`, `AiAnomalyAlerts`, `AiReportSummary`, `AiNotificationDigest`), import `isSelfHosted()` and:
- Show an "AI unavailable in self-hosted mode" message instead of the generate button
- Pass `unavailable` prop to `AiIndicator` when in Docker mode

### 4. Update useAiAssist to expose self-hosted state
Add an `isAvailable` boolean to the hook return so widgets can check availability without importing `isSelfHosted` directly.

### Files to modify:
- `supabase/functions/ai-assist/index.ts` -- fix prompt data
- `src/components/shared/AiIndicator.tsx` -- add unavailable variant
- `src/hooks/useAiAssist.ts` -- add `isAvailable` flag
- `src/components/dashboard/AiSmartSuggestions.tsx` -- self-hosted guard
- `src/components/dashboard/AiAnomalyAlerts.tsx` -- self-hosted guard
- `src/components/shared/AiReportSummary.tsx` -- self-hosted guard
- `src/components/notifications/AiNotificationDigest.tsx` -- self-hosted guard

