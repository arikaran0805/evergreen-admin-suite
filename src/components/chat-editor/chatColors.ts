// Shared color configuration for chat bubbles
// These colors are used in both ChatBubble (editor) and ChatConversationView (reader)

export const CHAT_COLORS = {
  mentor: {
    // Bubble background
    bubble: "bg-[#d4f5e6] dark:bg-emerald-900/40",
    // Bubble text
    text: "text-emerald-900 dark:text-emerald-100",
    // Avatar gradient
    avatar: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    // Speaker name text
    speaker: "text-emerald-700 dark:text-emerald-300",
    // Inline code
    inlineCode: "bg-emerald-500/30 text-emerald-900 dark:text-emerald-100",
    // Blockquote border
    blockquoteBorder: "border-emerald-300",
    // Button active state
    buttonActive: "bg-emerald-200/50 dark:bg-emerald-800/50",
    // Button hover
    buttonHover: "hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50",
  },
  course: {
    // Bubble background
    bubble: "bg-slate-100 dark:bg-slate-800",
    // Bubble text
    text: "text-slate-900 dark:text-slate-100",
    // Avatar gradient
    avatar: "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700",
    // Speaker name text
    speaker: "text-slate-600 dark:text-slate-400",
    // Inline code
    inlineCode: "bg-muted-foreground/20 text-foreground",
    // Blockquote border
    blockquoteBorder: "border-muted-foreground/50",
    // Button active state
    buttonActive: "bg-slate-200/50 dark:bg-slate-700/50",
    // Button hover
    buttonHover: "hover:bg-slate-200/50 dark:hover:bg-slate-700/50",
  },
} as const;

// Helper to get colors based on whether it's a mentor bubble
export const getChatColors = (isMentor: boolean) => 
  isMentor ? CHAT_COLORS.mentor : CHAT_COLORS.course;
