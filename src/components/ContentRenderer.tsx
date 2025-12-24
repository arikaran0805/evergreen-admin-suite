import { useMemo } from "react";
import ChatConversationView from "@/components/chat-editor/ChatConversationView";
import { isChatTranscript, normalizeChatInput } from "@/lib/chatContent";

interface ContentRendererProps {
  htmlContent: string;
  courseType?: string;
  codeTheme?: string;
}

const ContentRenderer = ({ 
  htmlContent, 
  courseType = "python",
  codeTheme,
}: ContentRendererProps) => {
  const isChat = useMemo(() => isChatTranscript(htmlContent), [htmlContent]);

  // Render chat conversation view for chat-style content
  if (isChat) {
    const plainText = normalizeChatInput(htmlContent);
    return (
      <div className="my-6">
        <ChatConversationView content={plainText} courseType={courseType} codeTheme={codeTheme} />
      </div>
    );
  }

  return (
    <div 
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default ContentRenderer;