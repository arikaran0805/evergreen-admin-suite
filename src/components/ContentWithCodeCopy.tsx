import { useEffect, useRef, useState } from "react";
import { Copy, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ContentWithCodeCopyProps {
  content: string;
  className?: string;
}

type CodeTheme = 'github-light' | 'github-dark' | 'dracula' | 'nord';

const codeThemes = {
  'github-light': {
    bg: '#f6f8fa',
    border: '#d0d7de',
    text: '#24292f',
    headerBg: '#ffffff',
    headerBorder: '#d0d7de'
  },
  'github-dark': {
    bg: '#0d1117',
    border: '#30363d',
    text: '#c9d1d9',
    headerBg: '#161b22',
    headerBorder: '#30363d'
  },
  'dracula': {
    bg: '#282a36',
    border: '#44475a',
    text: '#f8f8f2',
    headerBg: '#21222c',
    headerBorder: '#44475a'
  },
  'nord': {
    bg: '#2e3440',
    border: '#3b4252',
    text: '#d8dee9',
    headerBg: '#242933',
    headerBorder: '#3b4252'
  }
};

const ContentWithCodeCopy = ({ content, className }: ContentWithCodeCopyProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [codeTheme, setCodeTheme] = useState<CodeTheme>(() => {
    const saved = localStorage.getItem('code-theme');
    return (saved as CodeTheme) || 'github-light';
  });

  useEffect(() => {
    localStorage.setItem('code-theme', codeTheme);
  }, [codeTheme]);

  useEffect(() => {
    if (!contentRef.current) return;

    // Find all code blocks (pre tags)
    const codeBlocks = contentRef.current.querySelectorAll("pre");

    codeBlocks.forEach((pre, index) => {
      // Skip if elements already added
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

      // Apply theme styles
      const theme = codeThemes[codeTheme];
      pre.style.backgroundColor = theme.bg;
      pre.style.borderColor = theme.border;
      pre.style.color = theme.text;

      if (codeElement) {
        codeElement.style.color = theme.text;
      }

      // Create wrapper div for positioning
      const wrapper = document.createElement("div");
      wrapper.className = "relative group";
      
      // Wrap the pre element
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      // Create header container for language badge, theme toggle, and copy button
      const headerContainer = document.createElement("div");
      headerContainer.className = "absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-b rounded-t-lg";
      headerContainer.style.backgroundColor = theme.headerBg;
      headerContainer.style.borderColor = theme.headerBorder;

      // Create language badge
      const languageBadge = document.createElement("div");
      languageBadge.className = "text-xs font-mono font-semibold";
      languageBadge.style.color = theme.text;
      languageBadge.style.opacity = "0.7";
      languageBadge.textContent = language;

      // Create right side buttons container
      const buttonsContainer = document.createElement("div");
      buttonsContainer.className = "flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity";

      // Create theme toggle button
      const themeButton = document.createElement("button");
      themeButton.className = "flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors";
      themeButton.style.backgroundColor = theme.bg;
      themeButton.style.borderColor = theme.border;
      themeButton.style.color = theme.text;
      themeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
        <span>Theme</span>
      `;
      
      themeButton.onclick = () => {
        const themes: CodeTheme[] = ['github-light', 'github-dark', 'dracula', 'nord'];
        const currentIndex = themes.indexOf(codeTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setCodeTheme(nextTheme);
        
        toast({
          description: `Code theme changed to ${nextTheme.replace('-', ' ')}`,
        });
      };

      // Create copy button
      const copyButton = document.createElement("button");
      copyButton.className = "copy-code-button flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors";
      copyButton.style.backgroundColor = theme.bg;
      copyButton.style.borderColor = theme.border;
      copyButton.style.color = theme.text;

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
          copyButton.style.color = "#22c55e";

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
            copyButton.style.color = theme.text;
          }, 2000);
        } catch (err) {
          toast({
            description: "Failed to copy code",
            variant: "destructive",
          });
        }
      };

      buttonsContainer.appendChild(themeButton);
      buttonsContainer.appendChild(copyButton);
      headerContainer.appendChild(languageBadge);
      headerContainer.appendChild(buttonsContainer);
      wrapper.appendChild(headerContainer);
    });
  }, [content, toast, codeTheme]);

  return (
    <div
      ref={contentRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default ContentWithCodeCopy;
