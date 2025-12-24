import { useMemo, useState } from "react";
import ChatConversationView from "@/components/chat-editor/ChatConversationView";
import CodeBlock from "@/components/chat-editor/CodeBlock";
import { isChatTranscript, normalizeChatInput } from "@/lib/chatContent";

interface ContentRendererProps {
  htmlContent: string;
  courseType?: string;
  codeTheme?: string;
}

// Helper to extract code blocks from HTML and replace with placeholders
const extractCodeBlocks = (html: string): { processedHtml: string; codeBlocks: { code: string; language: string }[] } => {
  const codeBlocks: { code: string; language: string }[] = [];
  
  // Match <pre class="ql-syntax"...>...</pre> from Quill editor
  const preRegex = /<pre[^>]*class="[^"]*ql-syntax[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi;
  
  let processedHtml = html.replace(preRegex, (match, content) => {
    // Decode HTML entities
    const decodedContent = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
      .trim();
    
    // Try to detect language from code content
    let language = 'python'; // Default
    if (decodedContent.match(/^(function|const|let|var|import|export)\s/m)) {
      language = 'javascript';
    } else if (decodedContent.match(/^(def|class|import|from|print)\s/m)) {
      language = 'python';
    } else if (decodedContent.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/im)) {
      language = 'sql';
    }
    
    codeBlocks.push({ code: decodedContent, language });
    return `<!--CODE_BLOCK_${codeBlocks.length - 1}-->`;
  });
  
  return { processedHtml, codeBlocks };
};

const ContentRenderer = ({ 
  htmlContent, 
  courseType = "python",
  codeTheme,
}: ContentRendererProps) => {
  const isChat = useMemo(() => isChatTranscript(htmlContent), [htmlContent]);
  const [editedCodes, setEditedCodes] = useState<Record<number, string>>({});

  // Extract code blocks and get processed HTML
  const { processedHtml, codeBlocks } = useMemo(() => 
    extractCodeBlocks(htmlContent), [htmlContent]
  );

  const handleCodeEdit = (index: number, newCode: string) => {
    setEditedCodes(prev => ({ ...prev, [index]: newCode }));
  };

  // Render chat conversation view for chat-style content
  if (isChat) {
    const plainText = normalizeChatInput(htmlContent);
    return (
      <div className="my-6">
        <ChatConversationView content={plainText} courseType={courseType} codeTheme={codeTheme} />
      </div>
    );
  }

  // If no code blocks, render normally
  if (codeBlocks.length === 0) {
    return (
      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  // Split HTML by code block placeholders and render with CodeBlock components
  const parts = processedHtml.split(/<!--CODE_BLOCK_(\d+)-->/);
  
  return (
    <div className="prose prose-lg max-w-none">
      {parts.map((part, idx) => {
        // Even indices are HTML content, odd indices are code block indices
        if (idx % 2 === 0) {
          return part ? (
            <div 
              key={idx}
              dangerouslySetInnerHTML={{ __html: part }}
            />
          ) : null;
        } else {
          const codeBlockIndex = parseInt(part, 10);
          const block = codeBlocks[codeBlockIndex];
          if (!block) return null;
          
          return (
            <div key={idx} className="my-4 not-prose">
              <CodeBlock
                code={editedCodes[codeBlockIndex] ?? block.code}
                language={block.language}
                editable={true}
                overrideTheme={codeTheme}
                onEdit={(newCode) => handleCodeEdit(codeBlockIndex, newCode)}
              />
            </div>
          );
        }
      })}
    </div>
  );
};

export default ContentRenderer;
