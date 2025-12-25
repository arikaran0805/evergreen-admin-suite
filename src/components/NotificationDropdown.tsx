import { useState, useEffect, useCallback } from "react";
import { Bell, Flag, BookOpen, GraduationCap, Tags, MessageSquare, User, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  type: "report" | "post" | "course" | "tag" | "comment" | "user";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link: string;
}

interface NotificationDropdownProps {
  isAdmin: boolean;
  isModerator: boolean;
  userId: string | null;
}

const NotificationDropdown = ({ isAdmin, isModerator, userId }: NotificationDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch read notification IDs
  const fetchReadNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", userId);

      if (data) {
        setReadNotificationIds(new Set(data.map(r => r.notification_id)));
      }
    } catch (error) {
      console.error("Error fetching read notifications:", error);
    }
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin && !isModerator) {
      setIsLoading(false);
      return;
    }

    try {
      const notificationsList: Notification[] = [];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 7); // Last 7 days

      if (isAdmin) {
        // Fetch all data in parallel
        const [reportsRes, postsRes, coursesRes, tagsRes, commentsRes, usersRes] = await Promise.all([
          supabase
            .from("content_reports")
            .select("id, report_type, description, created_at")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("posts")
            .select("id, title, created_at")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("courses")
            .select("id, name, created_at")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("tags")
            .select("id, name, created_at")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("comments")
            .select("id, content, created_at")
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("profiles")
            .select("id, full_name, email, created_at")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(5)
        ]);

        reportsRes.data?.forEach((report) => {
          notificationsList.push({
            id: `report-${report.id}`,
            type: "report",
            title: `New ${report.report_type}`,
            description: report.description?.substring(0, 50) + "..." || "No description",
            timestamp: report.created_at,
            read: false,
            link: "/admin/reports",
          });
        });

        postsRes.data?.forEach((post) => {
          notificationsList.push({
            id: `post-${post.id}`,
            type: "post",
            title: "Pending Post",
            description: post.title,
            timestamp: post.created_at,
            read: false,
            link: "/admin/approvals",
          });
        });

        coursesRes.data?.forEach((course) => {
          notificationsList.push({
            id: `course-${course.id}`,
            type: "course",
            title: "Pending Course",
            description: course.name,
            timestamp: course.created_at,
            read: false,
            link: "/admin/approvals",
          });
        });

        tagsRes.data?.forEach((tag) => {
          notificationsList.push({
            id: `tag-${tag.id}`,
            type: "tag",
            title: "Pending Tag",
            description: tag.name,
            timestamp: tag.created_at,
            read: false,
            link: "/admin/approvals",
          });
        });

        commentsRes.data?.forEach((comment) => {
          notificationsList.push({
            id: `comment-${comment.id}`,
            type: "comment",
            title: "New Comment",
            description: comment.content?.substring(0, 50) + "..." || "No content",
            timestamp: comment.created_at,
            read: false,
            link: "/admin/comments",
          });
        });

        usersRes.data?.forEach((user) => {
          notificationsList.push({
            id: `user-${user.id}`,
            type: "user",
            title: "New User",
            description: user.full_name || user.email,
            timestamp: user.created_at,
            read: false,
            link: "/admin/users",
          });
        });
      } else if (isModerator && userId) {
        // For moderators, show approval feedback on their content
        const { data: approvals } = await supabase
          .from("approval_history")
          .select("id, content_type, action, feedback, created_at")
          .gte("created_at", yesterday.toISOString())
          .order("created_at", { ascending: false })
          .limit(10);

        approvals?.forEach((approval) => {
          notificationsList.push({
            id: `approval-${approval.id}`,
            type: approval.content_type === "post" ? "post" : approval.content_type === "course" ? "course" : "tag",
            title: `${approval.content_type} ${approval.action}`,
            description: approval.feedback || `Your ${approval.content_type} was ${approval.action}`,
            timestamp: approval.created_at,
            read: false,
            link: "/admin/activity",
          });
        });
      }

      // Sort by timestamp
      notificationsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(notificationsList.slice(0, 15));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isModerator, userId]);

  useEffect(() => {
    fetchNotifications();
    fetchReadNotifications();

    // Set up realtime subscriptions
    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'content_reports' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => fetchNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => fetchNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads' }, () => fetchReadNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, isModerator, userId, fetchNotifications, fetchReadNotifications]);

  // Mark a single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!userId || readNotificationIds.has(notificationId)) return;

    try {
      const notificationType = notificationId.split('-')[0];
      
      await supabase.from("notification_reads").insert({
        user_id: userId,
        notification_type: notificationType,
        notification_id: notificationId,
      });

      setReadNotificationIds(prev => new Set([...prev, notificationId]));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const unreadNotifications = notifications.filter(n => !readNotificationIds.has(n.id));
      
      if (unreadNotifications.length === 0) return;

      const inserts = unreadNotifications.map(n => ({
        user_id: userId,
        notification_type: n.id.split('-')[0],
        notification_id: n.id,
      }));

      await supabase.from("notification_reads").insert(inserts);

      setReadNotificationIds(prev => {
        const newSet = new Set(prev);
        unreadNotifications.forEach(n => newSet.add(n.id));
        return newSet;
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "report":
        return <Flag className="h-4 w-4 text-destructive" />;
      case "post":
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case "course":
        return <GraduationCap className="h-4 w-4 text-purple-500" />;
      case "tag":
        return <Tags className="h-4 w-4 text-amber-500" />;
      case "comment":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "user":
        return <User className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Calculate unread using the read IDs set
  const unreadCount = notifications.filter(n => !readNotificationIds.has(n.id)).length;

  if (!isAdmin && !isModerator) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-muted transition-all duration-200"
        >
          <Bell className="h-[18px] w-[18px] text-foreground/80" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-bold"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover border border-border shadow-xl z-50">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const isRead = readNotificationIds.has(notification.id);
                return (
                  <DropdownMenuItem key={notification.id} asChild className="p-0">
                    <Link
                      to={notification.link}
                      onClick={() => markAsRead(notification.id)}
                      className={`flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        isRead ? "opacity-60" : ""
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-foreground truncate ${isRead ? "font-normal" : ""}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      {!isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button asChild variant="outline" size="sm" className="w-full text-xs">
            <Link to="/admin">View All in Dashboard</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
