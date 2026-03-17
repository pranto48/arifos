import { useState, useEffect, useRef } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Upload,
  Loader2,
  Calendar,
  Clock,
  Database,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { isSelfHosted, selfHostedApi } from "@/lib/selfHostedConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { format, addDays, addWeeks, addMonths, startOfDay } from "date-fns";
import { RestoreComparisonDialog } from "./RestoreComparisonDialog";
import {
  BackupRestoreProgress,
  type BackupRestoreProgressState,
  type TableProgress,
} from "./BackupRestoreProgress";

interface BackupSchedule {
  id: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  last_backup_at: string | null;
  next_backup_at: string;
  is_active: boolean;
}

// ===== Universal Backup v3.0 Configuration =====

// All tables in the system, grouped by scope
const USER_SCOPED_TABLES = [
  "profiles",
  "tasks",
  "notes",
  "goals",
  "projects",
  "transactions",
  "habits",
  "investments",
  "salary_entries",
  "family_members",
  "family_events",
  "budgets",
  "budget_categories",
  "task_categories",
  "habit_completions",
  "goal_milestones",
  "project_milestones",
  "loans",
  "loan_payments",
  "task_checklists",
  "task_follow_up_notes",
  "app_notifications",
  "ai_usage_log",
  "family_member_connections",
  "family_documents",
];

// Tables where user_id = "created by" (shared/office data)
const SHARED_TABLES = [
  "support_units",
  "support_departments",
  "support_users",
  "device_categories",
  "device_suppliers",
  "device_inventory",
  "device_service_history",
  "device_disposals",
  "support_user_devices",
  "custom_form_fields",
];

// Tables without user_id
const GLOBAL_TABLES = [
  "support_tickets",
  "ticket_activity_log",
  "ticket_requesters",
  "ticket_categories",
  "device_transfer_history",
  "form_field_config",
  "module_config",
];

const ALL_BACKUP_TABLES = [
  ...USER_SCOPED_TABLES,
  ...SHARED_TABLES,
  ...GLOBAL_TABLES,
];

// Fields to strip from backup rows before restoring
const STRIP_FIELDS = ["search_vector", "created_at", "updated_at"];

// Legacy v2 camelCase → table name mapping
const LEGACY_KEY_MAP: Record<string, string> = {
  tasks: "tasks",
  notes: "notes",
  goals: "goals",
  projects: "projects",
  transactions: "transactions",
  habits: "habits",
  investments: "investments",
  salaries: "salary_entries",
  family: "family_members",
  familyEvents: "family_events",
  budgets: "budgets",
  budgetCategories: "budget_categories",
  taskCategories: "task_categories",
  habitCompletions: "habit_completions",
  goalMilestones: "goal_milestones",
  projectMilestones: "project_milestones",
  aiUsageLog: "ai_usage_log",
};

// Delete order: children before parents
const DELETE_ORDER = [
  "ticket_activity_log",
  "device_service_history",
  "device_transfer_history",
  "device_disposals",
  "support_user_devices",
  "loan_payments",
  "task_checklists",
  "task_follow_up_notes",
  "task_assignments",
  "habit_completions",
  "goal_milestones",
  "project_milestones",
  "family_member_connections",
  "family_documents",
  "family_events",
  "app_notifications",
  "ai_usage_log",
  "budgets",
  "transactions",
  "tasks",
  "notes",
  "goals",
  "projects",
  "habits",
  "investments",
  "salary_entries",
  "loans",
  "support_tickets",
  "ticket_requesters",
  "ticket_categories",
  "support_users",
  "device_inventory",
  "support_departments",
  "device_categories",
  "device_suppliers",
  "support_units",
  "budget_categories",
  "task_categories",
  "family_members",
  "custom_form_fields",
  "form_field_config",
  "module_config",
  "profiles",
];

// Restore order: parents before children (reverse of delete)
const RESTORE_ORDER = [...DELETE_ORDER].reverse();

// Tables that have user_id column for scoping
const TABLES_WITH_USER_ID = new Set([...USER_SCOPED_TABLES, ...SHARED_TABLES]);

// Notes select to exclude search_vector
const NOTES_SELECT =
  "id, title, content, tags, is_pinned, is_favorite, is_vault, note_type, project_id, custom_fields, encrypted_content, user_id";

export function DataExport() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [frequency, setFrequency] = useState<string>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{
    current: number;
    total: number;
    currentTable: string;
  } | null>(null);
  const [backupProgressState, setBackupProgressState] =
    useState<BackupRestoreProgressState | null>(null);
  const [restoreProgressState, setRestoreProgressState] =
    useState<BackupRestoreProgressState | null>(null);
  const { hasRole: isAdmin } = useIsAdmin();

  useEffect(() => {
    loadBackupSchedule();
  }, [user]);

  const loadBackupSchedule = async () => {
    if (!user) return;
    setLoadingSchedule(true);
    try {
      let scheduleData: any = null;
      if (isSelfHosted()) {
        const rows = await selfHostedApi.selectAll("backup_schedules");
        scheduleData = rows.length > 0 ? rows[0] : null;
      } else {
        const { data } = await supabase
          .from("backup_schedules")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        scheduleData = data;
      }
      if (scheduleData) {
        setSchedule(scheduleData);
        setFrequency(scheduleData.frequency);
        setDayOfWeek(scheduleData.day_of_week ?? 0);
        setDayOfMonth(scheduleData.day_of_month ?? 1);
        setIsActive(scheduleData.is_active);
      }
    } catch (error) {
      console.error("Failed to load backup schedule:", error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const calculateNextBackup = (
    freq: string,
    dow: number,
    dom: number,
  ): Date => {
    const now = new Date();
    const today = startOfDay(now);
    if (freq === "daily") return addDays(today, 1);
    if (freq === "weekly") {
      const currentDay = today.getDay();
      const daysUntil =
        dow >= currentDay ? dow - currentDay : 7 - (currentDay - dow);
      return addDays(today, daysUntil === 0 ? 7 : daysUntil);
    }
    if (freq === "monthly") {
      const nextMonth = addMonths(today, today.getDate() >= dom ? 1 : 0);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), dom);
    }
    return addWeeks(today, 1);
  };

  const saveBackupSchedule = async () => {
    if (!user) return;
    setSavingSchedule(true);
    try {
      const nextBackup = calculateNextBackup(frequency, dayOfWeek, dayOfMonth);
      const scheduleData = {
        user_id: user.id,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        day_of_month: frequency === "monthly" ? dayOfMonth : null,
        next_backup_at: nextBackup.toISOString(),
        is_active: isActive,
      };

      if (isSelfHosted()) {
        if (schedule?.id) {
          await selfHostedApi.upsertBatch("backup_schedules", [
            { ...scheduleData, id: schedule.id },
          ]);
        } else {
          await selfHostedApi.insertBatch("backup_schedules", [scheduleData]);
        }
      } else {
        if (schedule?.id) {
          const { error } = await supabase
            .from("backup_schedules")
            .update(scheduleData)
            .eq("id", schedule.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("backup_schedules")
            .insert(scheduleData);
          if (error) throw error;
        }
      }

      await loadBackupSchedule();
      toast({
        title: language === "bn" ? "সেটিংস সেভ হয়েছে" : "Settings Saved",
        description:
          language === "bn"
            ? "ব্যাকআপ শিডিউল আপডেট হয়েছে।"
            : "Backup schedule has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // ===== Universal v3.0 Fetch =====
  const fetchAllData = async (
    onTableProgress?: (
      table: string,
      status: "fetching" | "done" | "error",
      itemCount?: number,
      error?: string,
    ) => void,
  ) => {
    const selfHosted = isSelfHosted();
    const tables: Record<string, any[]> = {};

    // Fetch in parallel chunks of 6 to avoid overwhelming the connection
    const CHUNK_SIZE = 6;
    const allTables = [...ALL_BACKUP_TABLES];

    for (let i = 0; i < allTables.length; i += CHUNK_SIZE) {
      const chunk = allTables.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (table) => {
          onTableProgress?.(table, "fetching");
          try {
            if (selfHosted) {
              const data = await selfHostedApi.selectAll(table);
              onTableProgress?.(table, "done", data.length);
              return { table, data };
            } else {
              const hasUserId = TABLES_WITH_USER_ID.has(table);
              let query;
              if (table === "notes") {
                query = supabase.from("notes").select(NOTES_SELECT);
              } else {
                query = supabase.from(table as any).select("*");
              }
              if (hasUserId && user?.id) {
                query = query.eq("user_id", user.id);
              }
              const { data, error } = await query;
              if (error) {
                console.warn(`Failed to fetch ${table}:`, error.message);
                onTableProgress?.(table, "error", 0, error.message);
                return { table, data: [] };
              }
              onTableProgress?.(table, "done", (data || []).length);
              return { table, data: data || [] };
            }
          } catch (err: any) {
            console.warn(`Failed to fetch ${table}:`, err);
            onTableProgress?.(table, "error", 0, err.message);
            return { table, data: [] };
          }
        }),
      );
      for (const r of results) {
        // Mask vault note content
        if (r.table === "notes") {
          r.data = r.data.map((n: any) => ({
            ...n,
            content: n.is_vault ? "[ENCRYPTED]" : n.content,
          }));
        }
        tables[r.table] = r.data;
      }
    }

    return {
      format: "lifeos-universal",
      version: "3.0",
      source: selfHosted ? "docker" : "cloud",
      exportedAt: new Date().toISOString(),
      userId: user?.id,
      tables,
      // Legacy compatibility: also include camelCase keys for old restore flows
      tasks: tables.tasks || [],
      notes: tables.notes || [],
      transactions: tables.transactions || [],
      goals: tables.goals || [],
      investments: tables.investments || [],
      projects: tables.projects || [],
      salaries: tables.salary_entries || [],
      habits: tables.habits || [],
      family: tables.family_members || [],
      familyEvents: tables.family_events || [],
      budgets: tables.budgets || [],
      budgetCategories: tables.budget_categories || [],
      taskCategories: tables.task_categories || [],
      habitCompletions: tables.habit_completions || [],
      goalMilestones: tables.goal_milestones || [],
      projectMilestones: tables.project_milestones || [],
      aiUsageLog: tables.ai_usage_log || [],
    };
  };

  // ===== Normalize backup data to v3 table format =====
  const normalizeBackupData = (data: any): Record<string, any[]> => {
    // v3 format: has `tables` key
    if (data.version === "3.0" && data.tables) {
      return data.tables;
    }

    // v2 / legacy format: camelCase keys at top level
    const tables: Record<string, any[]> = {};
    for (const [legacyKey, tableName] of Object.entries(LEGACY_KEY_MAP)) {
      if (data[legacyKey]?.length) {
        tables[tableName] = data[legacyKey];
      }
    }
    return tables;
  };

  const createBackupProgressTracker = () => {
    const tableStates: TableProgress[] = ALL_BACKUP_TABLES.map((t) => ({
      table: t,
      status: "pending" as const,
    }));
    let processedCount = 0;
    let totalItems = 0;

    const progressState: BackupRestoreProgressState = {
      mode: "backup",
      phase: "preparing",
      tables: tableStates,
      currentTable: "",
      processedTables: 0,
      totalTables: ALL_BACKUP_TABLES.length,
      processedItems: 0,
      totalItems: 0,
      startTime: Date.now(),
      errors: [],
    };

    setBackupProgressState({ ...progressState });

    return (
      table: string,
      status: "fetching" | "done" | "error",
      itemCount?: number,
      error?: string,
    ) => {
      const entry = tableStates.find((t) => t.table === table);
      if (entry) {
        entry.status = status;
        entry.itemCount = itemCount;
        entry.errorMessage = error;
      }
      if (status === "done" || status === "error") {
        processedCount++;
        totalItems += itemCount || 0;
      }
      if (status === "error" && error) {
        progressState.errors.push(`${table}: ${error}`);
      }
      setBackupProgressState({
        ...progressState,
        phase: "processing",
        tables: [...tableStates],
        currentTable:
          status === "fetching" ? table : progressState.currentTable,
        processedTables: processedCount,
        processedItems: totalItems,
        totalItems: totalItems,
        errors: [...progressState.errors],
      });
    };
  };

  const runManualBackup = async () => {
    setExporting("manual");
    const onProgress = createBackupProgressTracker();
    try {
      const data = await fetchAllData(onProgress);

      setBackupProgressState((prev) =>
        prev ? { ...prev, phase: "finalizing" } : null,
      );

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeos-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      if (schedule?.id) {
        const nextBackup = calculateNextBackup(
          frequency,
          dayOfWeek,
          dayOfMonth,
        );
        if (isSelfHosted()) {
          await selfHostedApi.upsertBatch("backup_schedules", [
            {
              id: schedule.id,
              user_id: user?.id,
              last_backup_at: new Date().toISOString(),
              next_backup_at: nextBackup.toISOString(),
            },
          ]);
        } else {
          await supabase
            .from("backup_schedules")
            .update({
              last_backup_at: new Date().toISOString(),
              next_backup_at: nextBackup.toISOString(),
            })
            .eq("id", schedule.id);
        }
        await loadBackupSchedule();
      }

      setBackupProgressState((prev) =>
        prev ? { ...prev, phase: "complete" } : null,
      );

      toast({
        title: language === "bn" ? "ব্যাকআপ সম্পন্ন" : "Backup Complete",
        description:
          language === "bn"
            ? "ডাটাবেস ব্যাকআপ ডাউনলোড হয়েছে।"
            : "Database backup has been downloaded.",
      });

      // Auto-dismiss progress after 5s
      setTimeout(() => setBackupProgressState(null), 5000);
    } catch (error: any) {
      setBackupProgressState((prev) =>
        prev
          ? { ...prev, phase: "error", errors: [...prev.errors, error.message] }
          : null,
      );
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setTimeout(() => setBackupProgressState(null), 8000);
    } finally {
      setExporting(null);
    }
  };

  const exportJSON = async () => {
    setExporting("json");
    try {
      const data = await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeos-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title:
          language === "bn" ? "JSON এক্সপোর্ট সম্পন্ন" : "JSON Export Complete",
        description:
          language === "bn"
            ? "আপনার ডেটা ডাউনলোড হয়েছে।"
            : "Your data has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const exportCSV = async () => {
    setExporting("csv");
    try {
      const data = await fetchAllData();
      const tbl = data.tables || {};

      const arrayToCSV = (arr: any[], name: string) => {
        if (!arr.length) return "";
        const headers = Object.keys(arr[0]);
        const rows = arr.map((obj) =>
          headers
            .map((h) => {
              const val = obj[h];
              if (val === null || val === undefined) return "";
              if (typeof val === "object")
                return JSON.stringify(val).replace(/"/g, '""');
              return String(val).replace(/"/g, '""');
            })
            .map((v) => `"${v}"`)
            .join(","),
        );
        return `--- ${name} ---\n${headers.join(",")}\n${rows.join("\n")}\n\n`;
      };

      let csvContent = "";
      for (const [tableName, rows] of Object.entries(tbl)) {
        if (Array.isArray(rows) && rows.length > 0) {
          csvContent += arrayToCSV(rows, tableName);
        }
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeos-backup-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title:
          language === "bn" ? "CSV এক্সপোর্ট সম্পন্ন" : "CSV Export Complete",
        description:
          language === "bn"
            ? "আপনার ডেটা ডাউনলোড হয়েছে।"
            : "Your data has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExporting("pdf");
    try {
      const data = await fetchAllData();
      const tbl = data.tables || {};

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>LifeOS Export - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
            h2 { color: #4f46e5; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f3f4f6; }
            .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .summary-item { display: inline-block; margin-right: 30px; }
            .count { font-size: 24px; font-weight: bold; color: #7c3aed; }
          </style>
        </head>
        <body>
          <h1>LifeOS Data Export</h1>
          <p>Exported on: ${new Date().toLocaleString()}</p>
          <p>Format: Universal v3.0 | Source: ${data.source || "unknown"}</p>

          <div class="summary">
            <div class="summary-item"><span class="count">${(tbl.tasks || []).length}</span> Tasks</div>
            <div class="summary-item"><span class="count">${(tbl.notes || []).length}</span> Notes</div>
            <div class="summary-item"><span class="count">${(tbl.goals || []).length}</span> Goals</div>
            <div class="summary-item"><span class="count">${(tbl.transactions || []).length}</span> Transactions</div>
            <div class="summary-item"><span class="count">${(tbl.habits || []).length}</span> Habits</div>
            <div class="summary-item"><span class="count">${(tbl.support_users || []).length}</span> Users</div>
            <div class="summary-item"><span class="count">${(tbl.device_inventory || []).length}</span> Devices</div>
          </div>

          <h2>Tasks (${(tbl.tasks || []).length})</h2>
          <table>
            <tr><th>Title</th><th>Status</th><th>Priority</th><th>Due Date</th></tr>
            ${(tbl.tasks || []).map((t: any) => `<tr><td>${t.title}</td><td>${t.status || "-"}</td><td>${t.priority || "-"}</td><td>${t.due_date || "-"}</td></tr>`).join("")}
          </table>

          <h2>Goals (${(tbl.goals || []).length})</h2>
          <table>
            <tr><th>Title</th><th>Status</th><th>Target Date</th></tr>
            ${(tbl.goals || []).map((g: any) => `<tr><td>${g.title}</td><td>${g.status || "-"}</td><td>${g.target_date || "-"}</td></tr>`).join("")}
          </table>

          <h2>Notes (${(tbl.notes || []).length})</h2>
          <table>
            <tr><th>Title</th><th>Type</th></tr>
            ${(tbl.notes || []).map((n: any) => `<tr><td>${n.title}</td><td>${n.note_type || "-"}</td></tr>`).join("")}
          </table>
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }

      toast({
        title: language === "bn" ? "PDF রেডি" : "PDF Ready",
        description:
          language === "bn"
            ? "প্রিন্ট ডায়ালগ থেকে PDF সেভ করুন।"
            : "Save as PDF from the print dialog.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object")
        throw new Error("Invalid backup file format");
      if (
        !data.exportedAt &&
        !data.version &&
        !data.tasks &&
        !data.notes &&
        !data.goals &&
        !data.aiUsageLog &&
        !data.tables
      ) {
        throw new Error(
          "Invalid backup file format - no recognizable data found",
        );
      }

      const tables = normalizeBackupData(data);
      const tableNames = Object.keys(tables).filter(
        (k) => tables[k]?.length > 0,
      );
      const totalItems = tableNames.reduce((s, k) => s + tables[k].length, 0);

      const confirmed = window.confirm(
        language === "bn"
          ? `এই ব্যাকআপ ইমপোর্ট করতে চান?\n\n${tableNames.length} ধরনের ডেটা, মোট ${totalItems} আইটেম\n\nবিদ্যমান ডেটা প্রতিস্থাপিত হবে না।`
          : `Import this backup?\n\n${tableNames.length} data types, ${totalItems} total items\n\nExisting data will not be replaced.`,
      );

      if (!confirmed) {
        setImporting(false);
        return;
      }

      let imported = 0;
      const selfHosted = isSelfHosted();

      for (const tableName of RESTORE_ORDER) {
        const rows = tables[tableName];
        if (!rows?.length) continue;

        const isUserScoped =
          TABLES_WITH_USER_ID.has(tableName) ||
          rows.some(
            (item: any) =>
              item && typeof item === "object" && "user_id" in item,
          );
        const isGlobal = !isUserScoped;

        const cleaned = rows.map((item: any) => {
          const row = { ...item };
          // Only override user_id for user-scoped tables; shared/global tables
          // (device_inventory, device_categories, device_suppliers, support_users, etc.)
          // keep their original user_id from the backup so FK references stay intact.
          if (isUserScoped) {
            row.user_id = user?.id;
          }
          // Preserve the original id so FK relationships remain valid.
          // Only drop id for truly global tables that have no user_id and
          // where duplicates are unlikely (e.g. ticket_categories, form configs).
          if (isGlobal) {
            delete row.id;
          }
          for (const f of STRIP_FIELDS) delete row[f];
          if (tableName === "support_tickets") delete row.ticket_number;
          return row;
        });

        try {
          if (selfHosted) {
            imported += await selfHostedApi.insertBatch(tableName, cleaned);
          } else {
            const { error } = await supabase
              .from(tableName as any)
              .insert(cleaned as any);
            if (!error) imported += cleaned.length;
            else console.warn(`Import ${tableName} error:`, error.message);
          }
        } catch (err) {
          console.warn(`Failed to import ${tableName}:`, err);
        }
      }

      toast({
        title: language === "bn" ? "ইমপোর্ট সম্পন্ন" : "Import Complete",
        description:
          language === "bn"
            ? `${imported} আইটেম ইমপোর্ট হয়েছে।`
            : `${imported} items imported.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleRestoreFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object")
        throw new Error("Invalid backup file format");
      if (
        !data.exportedAt &&
        !data.version &&
        !data.tasks &&
        !data.notes &&
        !data.goals &&
        !data.aiUsageLog &&
        !data.tables
      ) {
        throw new Error(
          "Invalid backup file format - no recognizable data found",
        );
      }

      setPendingRestoreData(data);
      setRestoreDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to read backup file",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  // ===== Universal Selective Restore =====
  const executeSelectiveRestore = async (selectedTypes: string[]) => {
    if (!pendingRestoreData || !user || selectedTypes.length === 0) return;

    setRestoring(true);
    setRestoreProgress(null);

    // Initialize restore progress state
    const tablesToProcess = RESTORE_ORDER.filter((t) =>
      selectedTypes.includes(t),
    );
    const tableStates: TableProgress[] = tablesToProcess.map((t) => ({
      table: t,
      status: "pending" as const,
    }));
    const errors: string[] = [];
    const startTime = Date.now();

    const updateRestoreProgress = (
      updates: Partial<BackupRestoreProgressState>,
    ) => {
      setRestoreProgressState((prev) =>
        prev
          ? {
              ...prev,
              ...updates,
              tables: [...tableStates],
              errors: [...errors],
            }
          : null,
      );
    };

    setRestoreProgressState({
      mode: "restore",
      phase: "preparing",
      tables: [...tableStates],
      currentTable: "",
      processedTables: 0,
      totalTables: tablesToProcess.length,
      processedItems: 0,
      totalItems: 0,
      startTime,
      errors: [],
    });

    try {
      const tables = normalizeBackupData(pendingRestoreData);
      let restored = 0;
      const selfHosted = isSelfHosted();

      const deleteFromTable = async (table: string) => {
        if (selfHosted) {
          await selfHostedApi.deleteAll(table);
        } else {
          if (TABLES_WITH_USER_ID.has(table)) {
            await supabase
              .from(table as any)
              .delete()
              .eq("user_id", user.id);
          } else {
            await supabase
              .from(table as any)
              .delete()
              .neq("id", "00000000-0000-0000-0000-000000000000");
          }
        }
      };

      const updateTable = async (
        table: string,
        updates: Record<string, any>,
        filterNotNull?: string,
      ) => {
        if (selfHosted) {
          await selfHostedApi.updateWhere(
            table,
            updates,
            filterNotNull ? { [filterNotNull]: null } : undefined,
          );
        } else {
          let q = supabase
            .from(table as any)
            .update(updates)
            .eq("user_id", user.id);
          if (filterNotNull) q = q.not(filterNotNull, "is", null);
          await q;
        }
      };

      updateRestoreProgress({ phase: "processing" });

      // Pre-cleanup: handle dependent data before deleting parents
      if (selectedTypes.includes("tasks")) {
        try {
          await deleteFromTable("task_checklists");
        } catch {}
        try {
          await deleteFromTable("task_follow_up_notes");
        } catch {}
        if (!selfHosted) {
          const { data: userTasks } = await supabase
            .from("tasks")
            .select("id")
            .eq("user_id", user.id);
          if (userTasks?.length) {
            await supabase
              .from("task_assignments")
              .delete()
              .in(
                "task_id",
                userTasks.map((t) => t.id),
              );
          }
        }
      }
      if (
        selectedTypes.includes("habits") &&
        !selectedTypes.includes("habit_completions")
      ) {
        try {
          await deleteFromTable("habit_completions");
        } catch {}
      }
      if (
        selectedTypes.includes("goals") &&
        !selectedTypes.includes("goal_milestones")
      ) {
        try {
          await deleteFromTable("goal_milestones");
        } catch {}
      }
      if (
        selectedTypes.includes("projects") &&
        !selectedTypes.includes("project_milestones")
      ) {
        try {
          await deleteFromTable("project_milestones");
        } catch {}
      }
      if (selectedTypes.includes("family_members")) {
        try {
          await deleteFromTable("family_member_connections");
        } catch {}
        try {
          await deleteFromTable("family_documents");
        } catch {}
        if (!selectedTypes.includes("family_events")) {
          try {
            await deleteFromTable("family_events");
          } catch {}
        }
        try {
          await updateTable(
            "transactions",
            { family_member_id: null },
            "family_member_id",
          );
        } catch {}
      }
      if (selectedTypes.includes("transactions")) {
        try {
          await updateTable(
            "loan_payments",
            { transaction_id: null },
            "transaction_id",
          );
        } catch {}
      }
      if (selectedTypes.includes("tasks")) {
        try {
          await updateTable(
            "device_service_history",
            { task_id: null },
            "task_id",
          );
        } catch {}
      }
      if (selectedTypes.includes("budget_categories")) {
        if (!selectedTypes.includes("transactions")) {
          try {
            await deleteFromTable("transactions");
          } catch {}
        }
        if (!selectedTypes.includes("budgets")) {
          try {
            await deleteFromTable("budgets");
          } catch {}
        }
      }
      if (selectedTypes.includes("device_inventory")) {
        if (!selectedTypes.includes("device_service_history")) {
          try {
            await deleteFromTable("device_service_history");
          } catch {}
        }
        if (!selectedTypes.includes("device_transfer_history")) {
          try {
            await deleteFromTable("device_transfer_history");
          } catch {}
        }
        if (!selectedTypes.includes("device_disposals")) {
          try {
            await deleteFromTable("device_disposals");
          } catch {}
        }
      }
      if (selectedTypes.includes("support_users")) {
        if (!selectedTypes.includes("support_user_devices")) {
          try {
            await deleteFromTable("support_user_devices");
          } catch {}
        }
      }
      if (selectedTypes.includes("support_departments")) {
        if (!selectedTypes.includes("support_users")) {
          try {
            await deleteFromTable("support_users");
          } catch {}
        }
      }
      if (selectedTypes.includes("support_units")) {
        if (!selectedTypes.includes("support_departments")) {
          try {
            await deleteFromTable("support_departments");
          } catch {}
        }
      }
      if (selectedTypes.includes("loans")) {
        if (!selectedTypes.includes("loan_payments")) {
          try {
            await deleteFromTable("loan_payments");
          } catch {}
        }
      }

      // Delete selected types in dependency order
      for (const table of DELETE_ORDER) {
        if (selectedTypes.includes(table)) {
          try {
            await deleteFromTable(table);
          } catch (err) {
            console.error(`Failed to delete ${table}:`, err);
          }
        }
      }

      // Count total items to restore for progress
      const restorableTables = RESTORE_ORDER.filter(
        (t) => selectedTypes.includes(t) && tables[t]?.length,
      );
      const totalItems = restorableTables.reduce(
        (sum, t) => sum + (tables[t]?.length || 0),
        0,
      );
      let processedItems = 0;
      let processedTableCount = 0;

      updateRestoreProgress({ totalItems });

      // Restore in dependency order (parents first)
      for (const table of RESTORE_ORDER) {
        if (!selectedTypes.includes(table) || !tables[table]?.length) continue;

        const entry = tableStates.find((t) => t.table === table);
        if (entry) entry.status = "fetching";

        setRestoreProgress({
          current: processedItems,
          total: totalItems,
          currentTable: table,
        });
        updateRestoreProgress({
          currentTable: table,
          processedTables: processedTableCount,
          processedItems,
        });

        const items = tables[table].map((item: any) => {
          const cleaned = { ...item };
          if (
            TABLES_WITH_USER_ID.has(table) ||
            (item && typeof item === "object" && "user_id" in item)
          ) {
            cleaned.user_id = user.id;
          }
          for (const field of STRIP_FIELDS) delete cleaned[field];
          if (table === "support_tickets") delete cleaned.ticket_number;
          if (table === "notes" && item.is_vault) cleaned.content = null;
          return cleaned;
        });

        try {
          if (selfHosted) {
            restored += await selfHostedApi.upsertBatch(table, items);
          } else {
            const { error } = await supabase
              .from(table as any)
              .upsert(items as any, { onConflict: "id" });
            if (error) {
              console.error(`Failed to restore ${table}:`, error);
              if (entry) {
                entry.status = "error";
                entry.errorMessage = error.message;
              }
              errors.push(`${table}: ${error.message}`);
            } else {
              restored += items.length;
              if (entry) {
                entry.status = "done";
                entry.itemCount = items.length;
              }
            }
          }
        } catch (err: any) {
          console.error(`Failed to restore ${table}:`, err);
          if (entry) {
            entry.status = "error";
            entry.errorMessage = err.message;
          }
          errors.push(`${table}: ${err.message}`);
        }
        processedItems += items.length;
        processedTableCount++;
        updateRestoreProgress({
          processedTables: processedTableCount,
          processedItems,
        });
      }

      setRestoreProgress(null);
      setRestoreDialogOpen(false);
      setPendingRestoreData(null);

      setRestoreProgressState((prev) =>
        prev
          ? {
              ...prev,
              phase: "complete",
              processedTables: processedTableCount,
              processedItems,
              tables: [...tableStates],
              errors: [...errors],
            }
          : null,
      );

      toast({
        title: language === "bn" ? "পুনরুদ্ধার সম্পন্ন" : "Restore Complete",
        description:
          language === "bn"
            ? `${restored} আইটেম পুনরুদ্ধার হয়েছে। পেজ রিলোড হচ্ছে...`
            : `${restored} items restored successfully. Reloading page...`,
      });

      setTimeout(() => window.location.reload(), 3000);
    } catch (error: any) {
      console.error("Restore failed:", error);
      setRestoreProgressState((prev) =>
        prev
          ? { ...prev, phase: "error", errors: [...prev.errors, error.message] }
          : null,
      );
      toast({
        title: "Error",
        description: error.message || "Failed to restore data",
        variant: "destructive",
      });
      setTimeout(() => setRestoreProgressState(null), 8000);
    } finally {
      setRestoring(false);
      setRestoreProgress(null);
    }
  };

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayNamesBn = [
    "রবিবার",
    "সোমবার",
    "মঙ্গলবার",
    "বুধবার",
    "বৃহস্পতিবার",
    "শুক্রবার",
    "শনিবার",
  ];

  return (
    <div className="space-y-6">
      {/* Database Backup Section - Admin Only */}
      {isAdmin && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Database className="h-5 w-5" />
              {language === "bn" ? "ডাটাবেস ব্যাকআপ" : "Database Backup"}
              <Badge variant="secondary" className="ml-2 text-xs">
                v3.0 Universal
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Backup */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium text-foreground">
                  {language === "bn"
                    ? "সম্পূর্ণ ব্যাকআপ নিন"
                    : "Create Full Backup"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {language === "bn"
                    ? "সমস্ত ডেটা সহ একটি সম্পূর্ণ ব্যাকআপ ফাইল ডাউনলোড করুন। Docker ও Cloud উভয়ে পুনরুদ্ধারযোগ্য।"
                    : "Download a complete backup file with all your data. Restorable on both Docker & Cloud."}
                </p>
              </div>
              <Button
                onClick={runManualBackup}
                disabled={exporting === "manual"}
                className="flex items-center gap-2"
              >
                {exporting === "manual" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {language === "bn" ? "ব্যাকআপ নিন" : "Backup Now"}
              </Button>
            </div>

            {/* Backup Status */}
            {schedule && (
              <div className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {language === "bn" ? "ব্যাকআপ স্ট্যাটাস" : "Backup Status"}
                  </h4>
                  <Badge variant={schedule.is_active ? "default" : "secondary"}>
                    {schedule.is_active
                      ? language === "bn"
                        ? "সক্রিয়"
                        : "Active"
                      : language === "bn"
                        ? "বন্ধ"
                        : "Inactive"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {language === "bn" ? "শেষ ব্যাকআপ:" : "Last Backup:"}
                    </span>
                    <p className="font-medium">
                      {schedule.last_backup_at
                        ? format(new Date(schedule.last_backup_at), "PPp")
                        : language === "bn"
                          ? "এখনো হয়নি"
                          : "Never"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {language === "bn" ? "পরবর্তী ব্যাকআপ:" : "Next Backup:"}
                    </span>
                    <p className="font-medium">
                      {format(new Date(schedule.next_backup_at), "PPp")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {language === "bn"
                    ? "স্বয়ংক্রিয় ব্যাকআপ শিডিউল"
                    : "Automatic Backup Schedule"}
                </h4>
                <div className="flex items-center gap-2">
                  <Label htmlFor="backup-active" className="text-sm">
                    {language === "bn" ? "সক্রিয়" : "Enabled"}
                  </Label>
                  <Switch
                    id="backup-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {language === "bn" ? "ফ্রিকোয়েন্সি" : "Frequency"}
                  </Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">
                        {language === "bn" ? "প্রতিদিন" : "Daily"}
                      </SelectItem>
                      <SelectItem value="weekly">
                        {language === "bn" ? "সাপ্তাহিক" : "Weekly"}
                      </SelectItem>
                      <SelectItem value="monthly">
                        {language === "bn" ? "মাসিক" : "Monthly"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {frequency === "weekly" && (
                  <div className="space-y-2">
                    <Label>{language === "bn" ? "দিন" : "Day"}</Label>
                    <Select
                      value={String(dayOfWeek)}
                      onValueChange={(v) => setDayOfWeek(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((day, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {language === "bn" ? dayNamesBn[i] : day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {frequency === "monthly" && (
                  <div className="space-y-2">
                    <Label>
                      {language === "bn" ? "তারিখ" : "Day of Month"}
                    </Label>
                    <Select
                      value={String(dayOfMonth)}
                      onValueChange={(v) => setDayOfMonth(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(
                          (day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button
                onClick={saveBackupSchedule}
                disabled={savingSchedule || loadingSchedule}
                className="w-full sm:w-auto"
              >
                {savingSchedule ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {language === "bn" ? "শিডিউল সেভ করুন" : "Save Schedule"}
              </Button>

              <p className="text-xs text-muted-foreground">
                {language === "bn"
                  ? "দ্রষ্টব্য: স্বয়ংক্রিয় ব্যাকআপ শুধুমাত্র অ্যাপ খোলা থাকলে কাজ করবে। নির্ধারিত সময়ে ব্যাকআপ রিমাইন্ডার পাবেন।"
                  : "Note: Automatic backups will remind you when the app is open at the scheduled time."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Progress */}
      {backupProgressState && (
        <BackupRestoreProgress state={backupProgressState} />
      )}

      {/* Restore Progress */}
      {restoreProgressState && (
        <BackupRestoreProgress state={restoreProgressState} />
      )}

      {/* Export & Import Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5" />
            {language === "bn"
              ? "ডেটা এক্সপোর্ট ও ইমপোর্ট"
              : "Data Export & Import"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {language === "bn"
              ? "আপনার সমস্ত ডেটা বিভিন্ন ফরম্যাটে এক্সপোর্ট করুন বা পূর্বের ব্যাকআপ থেকে ইমপোর্ট করুন। Docker ও Cloud এর মধ্যে ডেটা স্থানান্তর করা যায়।"
              : "Export all your data in various formats or import from a previous backup. Data can be transferred between Docker and Cloud."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={exportJSON}
              disabled={exporting !== null}
              className="flex items-center gap-2"
            >
              {exporting === "json" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              JSON
            </Button>
            <Button
              variant="outline"
              onClick={exportCSV}
              disabled={exporting !== null}
              className="flex items-center gap-2"
            >
              {exporting === "csv" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={exportPDF}
              disabled={exporting !== null}
              className="flex items-center gap-2"
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </Button>
          </div>

          {isAdmin && (
            <div className="pt-4 border-t border-border space-y-4">
              {/* Additive Import */}
              <div>
                <Label
                  htmlFor="import-file"
                  className="text-sm font-medium flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {language === "bn"
                    ? "JSON ব্যাকআপ ইমপোর্ট করুন (যোগ করুন)"
                    : "Import JSON Backup (Add)"}
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={importJSON}
                    disabled={importing || restoring}
                    className="flex-1"
                  />
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === "bn"
                    ? "ইমপোর্ট করা ডেটা বিদ্যমান ডেটার সাথে যুক্ত হবে। Docker ও Cloud ব্যাকআপ উভয়ই সমর্থিত।"
                    : "Imported data will be added to existing data. Both Docker and Cloud backups are supported."}
                </p>
              </div>

              {/* Full Restore */}
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <Label
                  htmlFor="restore-file"
                  className="text-sm font-medium flex items-center gap-2 text-destructive"
                >
                  <RotateCcw className="h-4 w-4" />
                  {language === "bn"
                    ? "সম্পূর্ণ পুনরুদ্ধার (সবকিছু প্রতিস্থাপন করুন)"
                    : "Full Restore (Replace All Data)"}
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="restore-file"
                    ref={restoreInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFileSelect}
                    disabled={importing || restoring}
                    className="flex-1"
                  />
                  {restoring && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {restoreProgress && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {language === "bn"
                          ? `পুনরুদ্ধার হচ্ছে: ${restoreProgress.currentTable}`
                          : `Restoring: ${restoreProgress.currentTable}`}
                      </span>
                      <span>
                        {Math.round(
                          (restoreProgress.current / restoreProgress.total) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        (restoreProgress.current / restoreProgress.total) * 100
                      }
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {restoreProgress.current} / {restoreProgress.total}{" "}
                      {language === "bn" ? "আইটেম" : "items"}
                    </p>
                  </div>
                )}
                <p className="text-xs text-destructive/80 mt-1 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {language === "bn"
                    ? "সতর্কতা: এটি আপনার সমস্ত বিদ্যমান ডেটা মুছে ফেলবে এবং ব্যাকআপ থেকে প্রতিস্থাপন করবে! Docker ↔ Cloud ক্রস-প্ল্যাটফর্ম সমর্থিত।"
                    : "Warning: This will DELETE all existing data and replace from backup! Cross-platform Docker ↔ Cloud supported."}
                </p>
              </div>
            </div>
          )}

          {!isAdmin && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {language === "bn"
                  ? "শুধুমাত্র অ্যাডমিনরা ডেটা ইমপোর্ট ও রিস্টোর করতে পারেন।"
                  : "Only admins can import and restore data."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Comparison Dialog */}
      <RestoreComparisonDialog
        open={restoreDialogOpen}
        onOpenChange={(open) => {
          setRestoreDialogOpen(open);
          if (!open) setPendingRestoreData(null);
        }}
        backupData={pendingRestoreData}
        onRestore={executeSelectiveRestore}
        restoring={restoring}
        restoreProgress={restoreProgress}
      />
    </div>
  );
}
