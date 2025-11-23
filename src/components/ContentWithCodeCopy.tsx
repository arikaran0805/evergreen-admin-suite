import { useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ContentWithCodeCopyProps {
  content: string;
  className?: string;
}

const ContentWithCodeCopy = ({ content, className }: ContentWithCodeCopyProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // Find all code blocks (pre tags)
    const codeBlocks = contentRef.current.querySelectorAll("pre");

    codeBlocks.forEach((pre, index) => {
      // Skip if button already added
      if (pre.querySelector(".copy-code-button")) return;

      // Detect language from code element classes
      const codeElement = pre.querySelector("code");
      let language = "Code";
      
      if (codeElement) {
        const classes = codeElement.className.split(" ");
        const langClass = classes.find(cls => 
          cls.startsWith("language-") || cls.startsWith("lang-") || cls === "ql-syntax"
        );
        
        if (langClass) {
          if (langClass === "ql-syntax") {
            language = "Code";
          } else {
            language = langClass.replace(/^(language-|lang-)/, "").toUpperCase();
          }
        }
      }

      // Add padding to the pre element to make room for header
      pre.style.paddingTop = "3rem";

      // Create wrapper div for positioning
      const wrapper = document.createElement("div");
      wrapper.className = "relative group";
      
      // Wrap the pre element
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      // Create header container for language badge and copy button
      const headerContainer = document.createElement("div");
      headerContainer.className = "absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm rounded-t-lg";

      // Create language badge
      const languageBadge = document.createElement("div");
      languageBadge.className = "text-xs font-mono font-semibold text-muted-foreground";
      languageBadge.textContent = language;

      // Create copy button container
      const buttonContainer = document.createElement("div");
      buttonContainer.className = "opacity-0 group-hover:opacity-100 transition-opacity";
      buttonContainer.id = `copy-btn-${index}`;

      // Create copy button
      const button = document.createElement("button");
      button.className = "copy-code-button flex items-center gap-1 px-2 py-1 text-xs bg-background hover:bg-muted border border-border rounded text-foreground transition-colors";
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
        <span>Copy</span>
      `;

      button.onclick = async () => {
        const code = pre.querySelector("code")?.textContent || pre.textContent || "";
        
        try {
          await navigator.clipboard.writeText(code);
          
          // Update button to show success
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Copied!</span>
          `;
          button.classList.add("text-green-600");

          toast({
            description: "Code copied to clipboard",
          });

          // Reset button after 2 seconds
          setTimeout(() => {
            button.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <span>Copy</span>
            `;
            button.classList.remove("text-green-600");
          }, 2000);
        } catch (err) {
          toast({
            description: "Failed to copy code",
            variant: "destructive",
          });
        }
      };

      buttonContainer.appendChild(button);
      headerContainer.appendChild(languageBadge);
      headerContainer.appendChild(buttonContainer);
      wrapper.appendChild(headerContainer);
    });
  }, [content, toast]);

  return (
    <div
      ref={contentRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default ContentWithCodeCopy;
