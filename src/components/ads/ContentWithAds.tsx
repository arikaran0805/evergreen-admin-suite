import { useMemo } from "react";
import ChatConversationView from "@/components/chat-editor/ChatConversationView";
import { isChatTranscript, normalizeChatInput } from "@/lib/chatContent";

interface ContentWithAdsProps {
  htmlContent: string;
  googleAdSlot?: string;
  googleAdClient?: string;
  insertAfterParagraph?: number;
  courseType?: string;
}

const ContentWithAds = ({ 
  htmlContent, 
  courseType = "python"
}: ContentWithAdsProps) => {
  const isChat = useMemo(() => isChatTranscript(htmlContent), [htmlContent]);

  // Render chat conversation view for chat-style content
  if (isChat) {
    const plainText = normalizeChatInput(htmlContent);
    return (
      <div className="my-6">
        <ChatConversationView content={plainText} courseType={courseType} />
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

export default ContentWithAds;
