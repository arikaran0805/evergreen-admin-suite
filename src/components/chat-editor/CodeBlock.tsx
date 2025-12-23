import { useEffect, useRef } from "react";
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
  
  const normalizedLang = LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase() || "plaintext";

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, normalizedLang]);

  return (
    <pre
      className={cn(
        "mt-3 p-4 rounded-xl text-xs font-mono overflow-x-auto",
        "border shadow-inner",
        isMentorBubble
          ? "bg-blue-600/20 border-blue-400/30"
          : "bg-[#1d1f21] border-border/50"
      )}
    >
      {language && (
        <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2 text-muted-foreground">
          {language}
        </div>
      )}
      <code
        ref={codeRef}
        className={`language-${normalizedLang} leading-relaxed`}
      >
        {code}
      </code>
    </pre>
  );
};

export default CodeBlock;
