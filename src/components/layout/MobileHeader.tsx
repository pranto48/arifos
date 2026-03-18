import { useEffect, useMemo, useState } from "react";
import { LogOut, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { DashboardModeSwitcher } from "./DashboardModeSwitcher";
import { QuickAddButton } from "@/components/quick-add/QuickAddButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AiStatusWidget } from "./AiStatusWidget";
import { AiQuickActionBar } from '@/components/ai/AiQuickActionBar';
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { avatarBadgeClass, floatingHeaderClass, iconBadgeClass, sidebarPanelClass } from "@/lib/design-tokens";

const mobileHeaderClass = `${floatingHeaderClass} safe-area-pt md:hidden z-40`;

export function MobileHeader() {
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const [topQuickActionIds, setTopQuickActionIds] = useState<string[]>([]);
  const { actionById } = useQuickActions();

  useEffect(() => {
    setTopQuickActionIds(getFrequentQuickActionIds(3));
  }, []);

  const topQuickActions = useMemo(
    () =>
      topQuickActionIds
        .map((id) => actionById[id])
        .filter((action): action is NonNullable<typeof action> => Boolean(action)),
    [actionById, topQuickActionIds],
  );

  const handleTopQuickAction = async (actionId: string) => {
    const action = actionById[actionId];
    if (!action) return;

    await action.run();
    recordQuickActionUsage(actionId);
    setTopQuickActionIds(getFrequentQuickActionIds(3));
  };

  return (
    <header className={mobileHeaderClass}>
      <div className="flex items-center justify-between gap-3 min-h-[4rem] px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className={iconBadgeClass}>
            <span className="text-primary font-bold text-sm">L</span>
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">LifeOS</span>
            <span className="block text-[11px] text-muted-foreground">Mobile workspace</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex min-w-0 items-center gap-3">
          <AiStatusWidget collapsed />
          <AiQuickActionBar compact />
          <DashboardModeSwitcher />
          <NotificationBell />
          <QuickAddButton />

          {/* User Profile Sheet */}
          <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`group ${utilityButtonClass} rounded-full`}
              >
                <div className={avatarBadgeClass}>
                  <span className="text-primary text-xs font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className={cn("z-[60] w-[280px] border-sidebar-border", sidebarPanelClass)}
            >
              <SheetHeader>
                <SheetTitle className="text-sidebar-foreground">
                  {t("settings.profile") || "Profile"}
                </SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sidebar-foreground truncate">
                      {user?.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setProfileOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("settings.logout") || "Sign Out"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search Bar */}
      <div className="space-y-3 px-4 pb-4">
        <GlobalSearch />
        {topQuickActions.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {topQuickActions.map((action) => (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => handleTopQuickAction(action.id)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
