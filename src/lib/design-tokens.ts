import { cn } from "@/lib/utils";

export const surfaceCardClass = "border border-border/80 bg-card text-card-foreground shadow-sm";
export const elevatedSurfaceClass = "border border-border/70 bg-card/80 text-card-foreground shadow-md backdrop-blur-xl";
export const subtleSurfaceClass = "border border-border/60 bg-muted/30 text-foreground";
export const pageShellClass = "space-y-6";
export const pageHeaderClass = "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
export const pageTitleClass = "text-2xl font-semibold tracking-tight text-foreground md:text-3xl";
export const pageDescriptionClass = "text-sm text-muted-foreground md:text-base";
export const iconBadgeClass = "flex h-8 w-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary shadow-xs";
export const avatarBadgeClass = "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary shadow-xs";
export const sidebarPanelClass = "bg-sidebar/96 text-sidebar-foreground backdrop-blur-xl";
export const sidebarNavItemBaseClass = "relative rounded-lg text-sm font-medium transition-all duration-200";
export const sidebarNavItemExpandedClass = cn(sidebarNavItemBaseClass, "flex items-center gap-3 px-3 py-2.5");
export const sidebarNavItemCollapsedClass = cn(sidebarNavItemBaseClass, "flex items-center justify-center p-2.5");
export const sidebarNavItemActiveClass = "bg-sidebar-accent text-sidebar-primary shadow-xs";
export const sidebarNavItemInactiveClass = "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground";
export const floatingHeaderClass = "sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-xl";
export const sectionHeaderClass = "flex items-center gap-2 text-sm font-medium text-muted-foreground";
