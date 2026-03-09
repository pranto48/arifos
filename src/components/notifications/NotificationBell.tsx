import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Sparkles } from 'lucide-react';
import { AiNotificationDigest } from './AiNotificationDigest';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppNotifications, type AppNotification } from '@/hooks/useAppNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TYPE_COLORS: Record<string, string> = {
  new_device: 'bg-blue-500/20 text-blue-600',
  new_user: 'bg-green-500/20 text-green-600',
  ip_change: 'bg-orange-500/20 text-orange-600',
  new_ticket: 'bg-purple-500/20 text-purple-600',
  follow_up_due: 'bg-red-500/20 text-red-600',
};

const TYPE_ICONS: Record<string, string> = {
  new_device: '💻',
  new_user: '👤',
  ip_change: '🌐',
  new_ticket: '🎫',
  follow_up_due: '📋',
};

const ENTITY_ROUTES: Record<string, string> = {
  device_inventory: '/device-inventory',
  support_user: '/support-users',
  support_ticket: '/support-tickets',
  task: '/tasks',
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useAppNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.entity_type && ENTITY_ROUTES[notif.entity_type]) {
      navigate(ENTITY_ROUTES[notif.entity_type]);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3 mr-1" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* AI Digest */}
        {notifications.length > 2 && (
          <div className="px-3 py-2 border-b border-border">
            <AiNotificationDigest />
          </div>
        )}

        {/* Notifications list */}
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notif => (
                <button
                  key={notif.id}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 ${
                    !notif.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <span className={`text-lg flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${TYPE_COLORS[notif.type] || 'bg-muted'}`}>
                    {TYPE_ICONS[notif.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!notif.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {notif.entity_type && ENTITY_ROUTES[notif.entity_type] && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
