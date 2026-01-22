/**
 * TakeawayBlock - Display component for key takeaway messages
 * 
 * Uses TakeawayEditor (TipTap-based) for editing mode to maintain
 * consistency with the unified editor architecture.
 */

import { motion } from "framer-motion";
import { ChatMessage } from "./types";
import { cn } from "@/lib/utils";
import { Pencil, Lightbulb, Sparkles, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import TakeawayEditor from "./TakeawayEditor";

interface TakeawayBlockProps {
  message: ChatMessage;
  isEditing: boolean;
  onEdit: (id: string, content: string, title?: string, icon?: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  index?: number;
  annotationMode?: boolean;
  codeTheme?: string;
}

const TakeawayBlock = ({
  message,
  isEditing,
  onEdit,
  onStartEdit,
  onEndEdit,
  index = 0,
  annotationMode,
  codeTheme,
}: TakeawayBlockProps) => {
  const handleSave = (content: string, title: string, icon: string) => {
    onEdit(message.id, content, title, icon);
    onEndEdit();
  };

  const handleCancel = () => {
    onEndEdit();
  };

  // Editing mode - use TipTap-based TakeawayEditor
  if (isEditing) {
    return (
      <TakeawayEditor
        content={message.content}
        title={message.takeawayTitle || "One-Line Takeaway for Learners"}
        icon={message.takeawayIcon || "🧠"}
        onSave={handleSave}
        onCancel={handleCancel}
        codeTheme={codeTheme}
      />
    );
  }

  // Display mode
  const icon = message.takeawayIcon || "🧠";
  const title = message.takeawayTitle || "One-Line Takeaway for Learners";
  const staggerDelay = index * 0.15;

  return (
    <motion.div 
      className="my-8 mx-2"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.1 + staggerDelay,
      }}
    >
      <motion.div
        initial={{ boxShadow: "0 4px 16px -4px rgba(251,191,36,0.15)" }}
        animate={{ boxShadow: "0 8px 32px -8px rgba(251,191,36,0.3)" }}
        transition={{ duration: 0.8, delay: 0.4 + staggerDelay }}
        className={cn(
          "group relative rounded-3xl overflow-hidden",
          "bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-orange-50/50",
          "dark:from-amber-950/50 dark:via-yellow-950/40 dark:to-orange-950/30",
          "border-2 border-amber-300/60 dark:border-amber-600/40",
          "shadow-[0_8px_32px_-8px_rgba(251,191,36,0.3)] dark:shadow-[0_8px_32px_-8px_rgba(251,191,36,0.15)]",
          "hover:shadow-[0_12px_40px_-8px_rgba(251,191,36,0.4)] dark:hover:shadow-[0_12px_40px_-8px_rgba(251,191,36,0.25)]",
          "transition-all duration-500 ease-out",
          "backdrop-blur-sm"
        )}
      >
        {/* Animated gradient border overlay */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-[-2px] rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 opacity-20 blur-sm" />
        </div>

        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 3px 3px, currentColor 1.5px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Glowing accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 shadow-[0_2px_12px_rgba(251,191,36,0.5)]" />

        {/* Main content wrapper */}
        <div className="relative p-6">
          {/* Header row */}
          <div className="flex items-start gap-4 mb-4">
            {/* Icon container with glow effect */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 shadow-lg ring-2 ring-white/30 dark:ring-black/20">
                <span className="text-2xl filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300">{icon}</span>
              </div>
            </div>

            {/* Title section */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 dark:bg-amber-500/20 backdrop-blur-sm">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Key Takeaway
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-amber-400/60 dark:text-amber-500/50 animate-pulse" />
              </div>
              <h4 className="font-bold text-foreground text-lg leading-snug tracking-tight">{title}</h4>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-amber-200/50 dark:hover:bg-amber-800/40 hover:scale-105 transition-all duration-200"
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                  toast({
                    title: "Copied!",
                    description: "Takeaway copied to clipboard",
                  });
                }}
              >
                <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-amber-200/50 dark:hover:bg-amber-800/40 hover:scale-105 transition-all duration-200"
                onClick={() => onStartEdit(message.id)}
              >
                <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </Button>
            </div>
          </div>

          {/* Content section */}
          <div className="relative">
            {/* Vertical accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-amber-400 via-yellow-400 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
            
            {/* Content text */}
            <div className="pl-5">
              <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium tracking-wide">
                {message.content}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decorative gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-amber-100/30 to-transparent dark:from-amber-900/20 pointer-events-none" />

        {/* Corner decorations */}
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-300/40 dark:border-amber-600/30 rounded-tr-xl opacity-60" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-300/40 dark:border-amber-600/30 rounded-bl-xl opacity-60" />
      </motion.div>
    </motion.div>
  );
};

export default TakeawayBlock;
