import { useEffect, useRef, useState } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
// Import common languages
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-r";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language?: string;
  isMentorBubble?: boolean;
}

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  html: "markup",
  xml: "markup",
  shell: "bash",
  sh: "bash",
  cs: "csharp",
};

const CodeBlock = ({ code, language = "", isMentorBubble = false }: CodeBlockProps) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  
  const normalizedLang = LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase() || "plaintext";

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, normalizedLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="relative group mt-3">
      <pre
        className={cn(
          "p-4 rounded-xl text-xs font-mono overflow-x-auto",
          "border shadow-inner",
          isMentorBubble
            ? "bg-blue-600/20 border-blue-400/30"
            : "bg-[#1d1f21] border-border/50"
        )}
      >
        {/* Header with language and copy button */}
        <div className="flex items-center justify-between mb-2">
          {language && (
            <span className="text-[10px] uppercase tracking-wider opacity-50 text-muted-foreground">
              {language}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className={cn(
              "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
              isMentorBubble 
                ? "text-blue-100 hover:text-white hover:bg-blue-500/30" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <code
          ref={codeRef}
          className={`language-${normalizedLang} leading-relaxed`}
        >
          {code}
        </code>
      </pre>
      
      {/* Copied tooltip */}
      {copied && (
        <div className="absolute top-2 right-10 px-2 py-1 text-xs bg-green-500 text-white rounded shadow-lg animate-in fade-in-0 zoom-in-95">
          Copied!
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
