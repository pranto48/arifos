import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Wallet,
  DollarSign,
  TrendingUp,
  Target,
  Lightbulb,
  Repeat,
  Users,
  HeadsetIcon,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  HardDrive,
  Landmark,
  Ticket,
  Briefcase,
  Home,
  BarChart3,
  Timer,
  Workflow,
  Brain,
  PhoneCall,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardMode } from "@/contexts/DashboardModeContext";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { usePortalBranding } from "@/hooks/usePortalBranding";
import { cn } from "@/lib/utils";
import { avatarBadgeClass, iconBadgeClass, sidebarNavItemActiveClass, sidebarNavItemCollapsedClass, sidebarNavItemExpandedClass, sidebarNavItemInactiveClass, sidebarPanelClass } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TranslationKey } from "@/translations";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AiStatusWidget } from "./AiStatusWidget";

interface NavItem {
  titleKey: TranslationKey;
  url: string;
  icon: any;
  personalOnly?: boolean;
  officeOnly?: boolean;
  moduleName?: string;
}

interface NavGroup {
  key: string;
  labelEn: string;
  labelBn: string;
  icon: any;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    key: "main",
    labelEn: "Main",
    labelBn: "প্রধান",
    icon: LayoutDashboard,
    items: [
      { titleKey: "nav.dashboard", url: "/", icon: LayoutDashboard },
      {
        titleKey: "nav.calendar",
        url: "/calendar",
        icon: Calendar,
        moduleName: "calendar",
      },
    ],
  },
  {
    key: "productivity",
    labelEn: "Productivity",
    labelBn: "উৎপাদনশীলতা",
    icon: CheckSquare,
    items: [
      {
        titleKey: "nav.tasks",
        url: "/tasks",
        icon: CheckSquare,
        moduleName: "tasks",
      },
      {
        titleKey: "nav.notes",
        url: "/notes",
        icon: FileText,
        moduleName: "notes",
      },
      {
        titleKey: "nav.projects",
        url: "/projects",
        icon: Lightbulb,
        moduleName: "projects",
      },
      {
        titleKey: "nav.goals",
        url: "/goals",
        icon: Target,
        moduleName: "goals",
      },
      {
        titleKey: "nav.timeTracking",
        url: "/time-tracking",
        icon: Timer,
        moduleName: "time_tracking",
      },
      {
        titleKey: "nav.workflow",
        url: "/workflow",
        icon: Workflow,
        moduleName: "workflow",
      },
      {
        titleKey: "nav.aiHub",
        url: "/ai-hub",
        icon: Brain,
        moduleName: "ai_hub",
      },
      {
        titleKey: "nav.analytics",
        url: "/analytics",
        icon: BarChart3,
        moduleName: "analytics",
      },
    ],
  },
  {
    key: "office",
    labelEn: "Office",
    labelBn: "অফিস",
    icon: Briefcase,
    items: [
      {
        titleKey: "nav.supportUsers",
        url: "/support-users",
        icon: HeadsetIcon,
        officeOnly: true,
        moduleName: "support_users",
      },
      {
        titleKey: "nav.deviceInventory",
        url: "/device-inventory",
        icon: HardDrive,
        officeOnly: true,
        moduleName: "device_inventory",
      },
      {
        titleKey: "nav.ipbxInventory",
        url: "/ipbx-inventory",
        icon: PhoneCall,
        officeOnly: true,
        moduleName: "ipbx_inventory",
      },
      {
        titleKey: "nav.supportTickets",
        url: "/support-tickets",
        icon: Ticket,
        officeOnly: true,
        moduleName: "support_tickets",
      },
    ],
  },
  {
    key: "personal",
    labelEn: "Personal",
    labelBn: "ব্যক্তিগত",
    icon: Home,
    items: [
      {
        titleKey: "nav.habits",
        url: "/habits",
        icon: Repeat,
        personalOnly: true,
        moduleName: "habits",
      },
      {
        titleKey: "nav.family",
        url: "/family",
        icon: Users,
        personalOnly: true,
        moduleName: "family",
      },
    ],
  },
  {
    key: "finance",
    labelEn: "Finance",
    labelBn: "আর্থিক",
    icon: BarChart3,
    items: [
      {
        titleKey: "nav.budget",
        url: "/budget",
        icon: Wallet,
        personalOnly: true,
        moduleName: "budget",
      },
      {
        titleKey: "nav.salary",
        url: "/salary",
        icon: DollarSign,
        personalOnly: true,
        moduleName: "salary",
      },
      {
        titleKey: "nav.investments",
        url: "/investments",
        icon: TrendingUp,
        personalOnly: true,
        moduleName: "investments",
      },
      {
        titleKey: "nav.loans",
        url: "/loans",
        icon: Landmark,
        personalOnly: true,
        moduleName: "loans",
      },
    ],
  },
];

const bottomNavItems: { titleKey: TranslationKey; url: string; icon: any }[] = [
  { titleKey: "nav.settings", url: "/settings", icon: Settings },
];

const STORAGE_KEY = "sidebar-groups-state";


export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { t, language } = useLanguage();
  const { mode } = useDashboardMode();
  const { isModuleEnabled } = useModuleConfig();
  const { portalName, portalLogoUrl } = usePortalBranding();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Load open groups from localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      main: true,
      productivity: true,
      office: true,
      personal: true,
      finance: true,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter items based on mode and module config
  const getFilteredItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (mode === "office" && item.personalOnly) return false;
      if (mode === "personal" && item.officeOnly) return false;
      if (item.moduleName && !isModuleEnabled(item.moduleName)) return false;
      return true;
    });
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn("fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border md:flex", sidebarPanelClass)}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className={iconBadgeClass}>
                {portalLogoUrl ? (
                  <img
                    src={portalLogoUrl}
                    alt={`${portalName} logo`}
                    className="h-5 w-5 rounded object-contain"
                  />
                ) : (
                  <span className="text-primary font-bold text-sm">
                    {portalName.charAt(0).toUpperCase() || "L"}
                  </span>
                )}
              </div>
              <span className="font-semibold text-sidebar-foreground">
                {portalName}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto scrollbar-hide">
        {navGroups.map((group) => {
          const filteredItems = getFilteredItems(group.items);
          if (filteredItems.length === 0) return null;

          // In collapsed mode, show flat icons without groups
          if (collapsed) {
            return (
              <div key={group.key} className="space-y-0.5 mb-2">
                {filteredItems.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className={cn(
                      sidebarNavItemCollapsedClass,
                      isActive(item.url)
                        ? sidebarNavItemActiveClass
                        : sidebarNavItemInactiveClass,
                    )}
                    title={t(item.titleKey)}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive(item.url) && "text-sidebar-primary",
                      )}
                    />
                    {isActive(item.url) && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                      />
                    )}
                  </NavLink>
                ))}
              </div>
            );
          }

          // Expanded mode with collapsible groups
          return (
            <Collapsible
              key={group.key}
              open={openGroups[group.key] !== false}
              onOpenChange={() => toggleGroup(group.key)}
              className="mb-1"
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-sidebar-foreground transition-colors rounded-md">
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    openGroups[group.key] === false && "-rotate-90",
                  )}
                />
                <span>{language === "bn" ? group.labelBn : group.labelEn}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {filteredItems.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className={cn(
                      sidebarNavItemExpandedClass,
                      isActive(item.url)
                        ? sidebarNavItemActiveClass
                        : sidebarNavItemInactiveClass,
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 flex-shrink-0",
                        isActive(item.url) && "text-sidebar-primary",
                      )}
                    />
                    <span className="whitespace-nowrap overflow-hidden">
                      {t(item.titleKey)}
                    </span>
                    {isActive(item.url) && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                      />
                    )}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        <div className={collapsed ? "flex justify-center px-0" : "mt-2 px-1"}>
          <AiStatusWidget collapsed={collapsed} />
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="py-3 px-2 space-y-0.5 border-t border-sidebar-border">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive(item.url)
                ? sidebarNavItemActiveClass
                : sidebarNavItemInactiveClass,
              collapsed && "justify-center",
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <span className="whitespace-nowrap">{t(item.titleKey)}</span>
            )}
          </NavLink>
        ))}

        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <span className="whitespace-nowrap">{t("settings.logout")}</span>
          )}
        </button>
      </div>

      {/* User Info */}
      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-3 px-2 py-2",
            collapsed && "justify-center",
          )}
        >
          <div className={avatarBadgeClass}>
            <span className="text-primary text-xs font-semibold">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
