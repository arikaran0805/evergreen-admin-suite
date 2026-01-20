import { useEffect, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHtml } from "@/lib/sanitize";

interface ContentWithCodeCopyProps {
  content: string;
  className?: string;
}

const ContentWithCodeCopy = ({ content, className }: ContentWithCodeCopyProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Sanitize content to prevent XSS attacks
  const sanitizedContent = useMemo(() => sanitizeHtml(content), [content]);

  useEffect(() => {
    if (!contentRef.current) return;

    // Find all code blocks (pre tags)
    const codeBlocks = contentRef.current.querySelectorAll("pre");

    codeBlocks.forEach((pre, index) => {
      // Skip if elements already added
      if (pre.querySelector(".copy-code-button")) return;

      // Create wrapper div for positioning
      const wrapper = document.createElement("div");
      wrapper.className = "relative group";
      
      // Wrap the pre element
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      // Create header container for copy button
      const headerContainer = document.createElement("div");
      headerContainer.className = "absolute top-0 right-0 px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity";

      // Create copy button
      const copyButton = document.createElement("button");
      copyButton.className = "copy-code-button flex items-center gap-1 px-2 py-1 text-xs bg-background hover:bg-muted border border-border rounded text-foreground transition-colors";

      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
        <span>Copy</span>
      `;

      copyButton.onclick = async () => {
        const code = pre.querySelector("code")?.textContent || pre.textContent || "";
        
        try {
          await navigator.clipboard.writeText(code);
          
          // Update button to show success
          copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Copied!</span>
          `;
          copyButton.classList.add("text-green-600");

          toast({
            description: "Code copied to clipboard",
          });

          // Reset button after 2 seconds
          setTimeout(() => {
            copyButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <span>Copy</span>
            `;
            copyButton.classList.remove("text-green-600");
          }, 2000);
        } catch (err) {
          toast({
            description: "Failed to copy code",
            variant: "destructive",
          });
        }
      };

      headerContainer.appendChild(copyButton);
      wrapper.appendChild(headerContainer);
    });
  }, [sanitizedContent, toast]);

  return (
    <div
      ref={contentRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

export default ContentWithCodeCopy;
