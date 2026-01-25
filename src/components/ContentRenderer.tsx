import { useMemo, useState } from "react";
import ChatConversationView from "@/components/chat-editor/ChatConversationView";
import CodeBlock from "@/components/chat-editor/CodeBlock";
import { isChatTranscript, normalizeChatInput } from "@/lib/chatContent";
import { isTipTapJSON } from "@/lib/tiptapMigration";
import { sanitizeHtml } from "@/lib/sanitize";
import { RichTextRenderer } from "@/components/tiptap/RichTextRenderer";
import { CanvasRenderer, isCanvasContent } from "@/components/canvas-editor";

interface ContentRendererProps {
  htmlContent: string;
  courseType?: string;
  codeTheme?: string;
}

// Helper to extract code blocks from HTML and replace with placeholders
const extractCodeBlocks = (html: string): { processedHtml: string; codeBlocks: { code: string; language: string }[] } => {
  const codeBlocks: { code: string; language: string }[] = [];
  
  // Match <pre class="ql-syntax"...>...</pre> from Quill editor (legacy)
  // and <pre><code>...</code></pre> from TipTap
  const preRegex = /<pre[^>]*(?:class="[^"]*(?:ql-syntax|code-block)[^"]*")?[^>]*>(?:<code[^>]*>)?([\s\S]*?)(?:<\/code>)?<\/pre>/gi;
  
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

/**
 * ContentRenderer
 * 
 * Renders content from both legacy HTML (react-quill) and new TipTap JSON format.
 * Automatically detects content type and renders appropriately.
 * 
 * For TipTap JSON: Uses RichTextRenderer with full schema support
 * For legacy HTML: Uses sanitized HTML with code block extraction
 */
const ContentRenderer = ({ 
  htmlContent, 
  courseType = "python",
  codeTheme,
}: ContentRendererProps) => {
  const isCanvas = useMemo(() => isCanvasContent(htmlContent), [htmlContent]);
  const isChat = useMemo(() => !isCanvas && isChatTranscript(htmlContent), [htmlContent, isCanvas]);
  const isTipTap = useMemo(() => !isCanvas && isTipTapJSON(htmlContent), [htmlContent, isCanvas]);
  const [editedCodes, setEditedCodes] = useState<Record<number, string>>({});

  // Extract code blocks and get processed HTML (only for legacy HTML content)
  const { processedHtml, codeBlocks } = useMemo(() => {
    if (isTipTap || isChat) {
      return { processedHtml: '', codeBlocks: [] };
    }
    return extractCodeBlocks(htmlContent);
  }, [htmlContent, isTipTap, isChat]);

  const handleCodeEdit = (index: number, newCode: string) => {
    setEditedCodes(prev => ({ ...prev, [index]: newCode }));
  };

  // Render Canvas content - blocks in reading order
  if (isCanvas) {
    return (
      <div className="prose prose-lg max-w-none">
        <CanvasRenderer content={htmlContent} codeTheme={codeTheme} />
      </div>
    );
  }

  // Render chat conversation view for chat-style content
  if (isChat) {
    const plainText = normalizeChatInput(htmlContent);
    return (
      <div className="my-6 min-w-0">
        <ChatConversationView content={plainText} courseType={courseType} codeTheme={codeTheme} />
      </div>
    );
  }

  // ✅ TipTap JSON: Use RichTextRenderer with full schema (ExecutableCodeBlock, AnnotationMark)
  if (isTipTap) {
    return (
      <div className="prose prose-lg max-w-none">
        <RichTextRenderer 
          content={htmlContent} 
          emptyPlaceholder="No content available"
        />
      </div>
    );
  }

  // Legacy HTML: If no code blocks, render normally with sanitization
  if (codeBlocks.length === 0) {
    return (
      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
      />
    );
  }

  // Legacy HTML: Split by code block placeholders and render with CodeBlock components
  const parts = processedHtml.split(/<!--CODE_BLOCK_(\d+)-->/);
  
  return (
    <div className="prose prose-lg max-w-none">
      {parts.map((part, idx) => {
        // Even indices are HTML content, odd indices are code block indices
        if (idx % 2 === 0) {
          return part ? (
            <div 
              key={idx}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(part) }}
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
                overrideTheme={codeTheme || "clean"}
                onEdit={(newCode) => handleCodeEdit(codeBlockIndex, newCode)}
                showToolbarAlways
              />
            </div>
          );
        }
      })}
    </div>
  );
};

export default ContentRenderer;
