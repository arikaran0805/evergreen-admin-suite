import { useMemo } from "react";
import InContentAdMiddle from "./InContentAdMiddle";
import ChatConversationView from "@/components/chat-editor/ChatConversationView";
import { isChatTranscript, normalizeChatInput } from "@/lib/chatContent";

interface ContentWithAdsProps {
  htmlContent: string;
  googleAdSlot?: string;
  googleAdClient?: string;
  insertAfterParagraph?: number;
  courseType?: string;
}

// Check if content is in chat format (Speaker: message pattern)
const isChatContent = (content: string): boolean => {
  return isChatTranscript(content);
};

const ContentWithAds = ({ 
  htmlContent, 
  googleAdSlot,
  googleAdClient,
  insertAfterParagraph = 3,
  courseType = "python"
}: ContentWithAdsProps) => {
  const isChat = useMemo(() => isChatContent(htmlContent), [htmlContent]);
  
  const contentParts = useMemo(() => {
    // If chat content, don't split for ads
    if (isChat) {
      return { beforeAd: htmlContent, afterAd: "", shouldSplit: false };
    }
    
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    
    // Get all direct children
    const children = Array.from(tempDiv.children);
    
    // Find paragraph elements and count them
    let paragraphCount = 0;
    let splitIndex = -1;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === "P") {
        paragraphCount++;
        if (paragraphCount === insertAfterParagraph) {
          splitIndex = i + 1;
          break;
        }
      }
    }
    
    // If we found enough paragraphs, split the content
    if (splitIndex > 0 && splitIndex < children.length) {
      const beforeAd = children.slice(0, splitIndex).map(el => el.outerHTML).join("");
      const afterAd = children.slice(splitIndex).map(el => el.outerHTML).join("");
      return { beforeAd, afterAd, shouldSplit: true };
    }
    
    // If not enough paragraphs, don't split
    return { beforeAd: htmlContent, afterAd: "", shouldSplit: false };
  }, [htmlContent, insertAfterParagraph, isChat]);

  // Render chat conversation view for chat-style content
  if (isChat) {
    const plainText = normalizeChatInput(htmlContent);
    return (
      <div className="my-6">
        <ChatConversationView content={plainText} courseType={courseType} />
      </div>
    );
  }

  if (!contentParts.shouldSplit) {
    return (
      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      <div dangerouslySetInnerHTML={{ __html: contentParts.beforeAd }} />
      <InContentAdMiddle 
        googleAdSlot={googleAdSlot}
        googleAdClient={googleAdClient}
      />
      <div dangerouslySetInnerHTML={{ __html: contentParts.afterAd }} />
    </div>
  );
};

export default ContentWithAds;
