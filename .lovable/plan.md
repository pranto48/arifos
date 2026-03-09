

## Analysis: Missing AI Feature Components

The `ai-assist` edge function supports 4 AI types, but only 2 have frontend components:

| AI Type | Edge Function | Frontend Component |
|---|---|---|
| `report_summary` | Implemented | `AiReportSummary` -- done |
| `notification_digest` | Implemented | `AiNotificationDigest` -- done |
| `smart_suggestions` | Implemented | **Missing** |
| `anomaly_detection` | Implemented | **Missing** |

Additionally, the `ai-assist` function is not registered in `edgeFunctionHelper.ts`'s `LOCAL_MODE_FUNCTIONS` set, so it won't gracefully fallback in Docker mode (though a Docker backend stub was added separately).

---

## Plan

### 1. Create `AiSmartSuggestions` component
A Dashboard widget that gathers user activity stats (task counts, budget totals, goal progress) and calls `callAi('smart_suggestions', ...)` to suggest reports to generate or actions to take. Shows suggestions as actionable cards with links to relevant pages.

**Location**: `src/components/dashboard/AiSmartSuggestions.tsx`

### 2. Create `AiAnomalyAlerts` component
A Dashboard widget that sends recent financial/task data to `callAi('anomaly_detection', ...)` and displays returned anomalies as color-coded alert cards (low/medium/high severity).

**Location**: `src/components/dashboard/AiAnomalyAlerts.tsx`

### 3. Integrate both into Dashboard
Add both components as lazy-loaded widgets in `Dashboard.tsx`, gated behind the existing `useDashboardLayout` widget system so users can toggle them on/off.

### 4. Add `ai-assist` to Docker fallback list
Add `'ai-assist'` to the `LOCAL_MODE_FUNCTIONS` set in `src/lib/edgeFunctionHelper.ts` and update `useAiAssist.ts` to use `invokeEdgeFunction` instead of direct `supabase.functions.invoke`, so Docker mode gets a graceful "AI unavailable" message instead of a network error.

### 5. Add self-hosted guard to AI Settings
Add `isSelfHosted()` check in `AiSettings.tsx` to show an info banner when running in Docker mode, similar to other settings panels.

