import { useEffect, useRef, useState, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import { Copy, Check, Play, Pencil, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface CodeBlockOverlay {
  element: HTMLPreElement;
  rect: DOMRect;
  code: string;
  language: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockOverlay[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [runningIndex, setRunningIndex] = useState<number | null>(null);
  const [outputs, setOutputs] = useState<Record<number, { text: string; error: boolean }>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedCode, setEditedCode] = useState("");

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ script: "sub" }, { script: "super" }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["blockquote", "code-block"],
      ["link", "image", "video"],
      ["clean"],
    ],
    clipboard: {
      matchVisual: false,
    },
  };

  const formats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "script",
    "list",
    "bullet",
    "indent",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
    "video",
  ];

  // Detect language from code content
  const detectLanguage = (code: string): string => {
    if (code.match(/^(function|const|let|var|import|export)\s/m)) {
      return 'javascript';
    } else if (code.match(/^(def|class|import|from|print)\s/m)) {
      return 'python';
    } else if (code.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/im)) {
      return 'sql';
    } else if (code.match(/^\s*{[\s\S]*}$/m) || code.match(/^\s*\[[\s\S]*]$/m)) {
      return 'json';
    } else if (code.match(/<[a-z][\s\S]*>/i)) {
      return 'markup';
    }
    return 'python'; // Default
  };

  // Find and track code blocks
  const updateCodeBlocks = useCallback(() => {
    if (!containerRef.current) return;
    
    const preElements = containerRef.current.querySelectorAll<HTMLPreElement>('.ql-editor pre.ql-syntax');
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const blocks: CodeBlockOverlay[] = [];
    preElements.forEach((pre) => {
      const rect = pre.getBoundingClientRect();
      const code = pre.textContent || "";
      const language = detectLanguage(code);
      
      blocks.push({
        element: pre,
        rect: new DOMRect(
          rect.left - containerRect.left,
          rect.top - containerRect.top,
          rect.width,
          rect.height
        ),
        code,
        language,
      });

      // Apply syntax highlighting
      const highlighted = Prism.highlight(code, Prism.languages[language] || Prism.languages.plaintext, language);
      pre.innerHTML = highlighted;
      pre.classList.add(`language-${language}`);
    });
    
    setCodeBlocks(blocks);
  }, []);

  // Update code blocks on content change
  useEffect(() => {
    const timeout = setTimeout(updateCodeBlocks, 100);
    return () => clearTimeout(timeout);
  }, [value, updateCodeBlocks]);

  // Update positions on scroll/resize
  useEffect(() => {
    const handleUpdate = () => updateCodeBlocks();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [updateCodeBlocks]);

  const handleCopy = async (index: number) => {
    const code = codeBlocks[index]?.code;
    if (!code) return;
    
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRun = async (index: number) => {
    const block = codeBlocks[index];
    if (!block?.code) return;
    
    setRunningIndex(index);
    setOutputs(prev => ({ ...prev, [index]: { text: "", error: false } }));
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code: block.code, language: block.language },
      });

      if (error) {
        setOutputs(prev => ({ ...prev, [index]: { text: error.message || 'Execution failed', error: true } }));
      } else if (data?.error) {
        setOutputs(prev => ({ ...prev, [index]: { text: data.error, error: true } }));
      } else {
        setOutputs(prev => ({ ...prev, [index]: { text: data?.output || 'No output', error: false } }));
      }
    } catch (err: any) {
      setOutputs(prev => ({ ...prev, [index]: { text: err.message || 'Failed to execute', error: true } }));
    } finally {
      setRunningIndex(null);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedCode(codeBlocks[index]?.code || "");
  };

  const handleSaveEdit = (index: number) => {
    const pre = codeBlocks[index]?.element;
    if (pre) {
      pre.textContent = editedCode;
      // Trigger Quill to pick up the change
      const quill = quillRef.current?.getEditor();
      if (quill) {
        quill.update();
      }
      // Force re-read of content
      setTimeout(() => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
          onChange(editor.root.innerHTML);
        }
      }, 50);
    }
    setEditingIndex(null);
    updateCodeBlocks();
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedCode("");
  };

  const closeOutput = (index: number) => {
    setOutputs(prev => {
      const newOutputs = { ...prev };
      delete newOutputs[index];
      return newOutputs;
    });
  };

  return (
    <div className="rich-text-editor" ref={containerRef}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "Write your content here..."}
        className="bg-background"
      />
      
      {/* Code block action buttons overlay */}
      {codeBlocks.map((block, index) => (
        <div
          key={index}
          className="absolute pointer-events-none"
          style={{
            left: block.rect.left,
            top: block.rect.top,
            width: block.rect.width,
            height: block.rect.height,
          }}
        >
          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-auto z-10">
            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editingIndex === index ? handleCancelEdit() : handleEdit(index)}
              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm"
            >
              {editingIndex === index ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
            </Button>
            
            {/* Run button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRun(index)}
              disabled={runningIndex === index}
              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-green-600 shadow-sm"
            >
              {runningIndex === index ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
            
            {/* Copy button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(index)}
              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm"
            >
              {copiedIndex === index ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          
          {/* Edit overlay */}
          {editingIndex === index && (
            <div className="absolute inset-0 pointer-events-auto bg-white border border-gray-200 rounded-lg overflow-hidden z-20">
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm resize-none outline-none bg-white text-gray-800"
                autoFocus
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(index)}
                  className="h-7 text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
          
          {/* Output display */}
          {outputs[index] && (
            <div 
              className={cn(
                "absolute left-0 right-0 pointer-events-auto border rounded-lg mt-1 overflow-hidden",
                outputs[index].error 
                  ? "bg-red-50 border-red-200" 
                  : "bg-gray-50 border-gray-200"
              )}
              style={{ top: block.rect.height }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                <span className={cn(
                  "text-xs font-medium",
                  outputs[index].error ? "text-red-600" : "text-gray-600"
                )}>
                  {outputs[index].error ? "Error" : "Output"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closeOutput(index)}
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <pre className={cn(
                "px-3 py-2 text-sm font-mono whitespace-pre-wrap",
                outputs[index].error ? "text-red-600" : "text-gray-800"
              )}>
                {outputs[index].text}
              </pre>
            </div>
          )}
        </div>
      ))}
      
      <style>{`
        .rich-text-editor {
          position: relative;
        }
        
        .rich-text-editor .ql-container {
          min-height: 300px;
          font-family: inherit;
          border-bottom-left-radius: var(--radius);
          border-bottom-right-radius: var(--radius);
        }
        
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: var(--radius);
          border-top-right-radius: var(--radius);
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }
        
        .rich-text-editor .ql-container {
          border-color: hsl(var(--border));
          background: hsl(var(--background));
        }
        
        .rich-text-editor .ql-editor {
          color: hsl(var(--foreground));
          font-size: 14px;
          line-height: 1.6;
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        
        .rich-text-editor .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        
        .rich-text-editor .ql-fill {
          fill: hsl(var(--foreground));
        }
        
        .rich-text-editor .ql-picker-label {
          color: hsl(var(--foreground));
        }
        
        .rich-text-editor .ql-picker-options {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
        }
        
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button:focus,
        .rich-text-editor .ql-toolbar button.ql-active,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active,
        .rich-text-editor .ql-toolbar .ql-picker-item:hover,
        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected {
          color: hsl(var(--primary));
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button:focus .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-item:hover .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected .ql-stroke {
          stroke: hsl(var(--primary));
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button:focus .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-item:hover .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected .ql-fill {
          fill: hsl(var(--primary));
        }
        
        /* Code block styling */
        .rich-text-editor .ql-editor pre.ql-syntax {
          background-color: hsl(143 20% 95%);
          color: hsl(143 30% 25%);
          border: 1px solid hsl(143 20% 88%);
          border-radius: 12px;
          padding: 1rem;
          padding-top: 2.5rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.5;
          position: relative;
        }
        
        /* Prism syntax highlighting colors for green theme */
        .rich-text-editor .ql-editor pre.ql-syntax .token.comment,
        .rich-text-editor .ql-editor pre.ql-syntax .token.prolog,
        .rich-text-editor .ql-editor pre.ql-syntax .token.doctype,
        .rich-text-editor .ql-editor pre.ql-syntax .token.cdata {
          color: hsl(143 15% 50%);
          font-style: italic;
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.punctuation {
          color: hsl(143 20% 40%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.property,
        .rich-text-editor .ql-editor pre.ql-syntax .token.tag,
        .rich-text-editor .ql-editor pre.ql-syntax .token.boolean,
        .rich-text-editor .ql-editor pre.ql-syntax .token.number,
        .rich-text-editor .ql-editor pre.ql-syntax .token.constant,
        .rich-text-editor .ql-editor pre.ql-syntax .token.symbol,
        .rich-text-editor .ql-editor pre.ql-syntax .token.deleted {
          color: hsl(340 70% 45%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.selector,
        .rich-text-editor .ql-editor pre.ql-syntax .token.attr-name,
        .rich-text-editor .ql-editor pre.ql-syntax .token.string,
        .rich-text-editor .ql-editor pre.ql-syntax .token.char,
        .rich-text-editor .ql-editor pre.ql-syntax .token.builtin,
        .rich-text-editor .ql-editor pre.ql-syntax .token.inserted {
          color: hsl(143 50% 35%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.operator,
        .rich-text-editor .ql-editor pre.ql-syntax .token.entity,
        .rich-text-editor .ql-editor pre.ql-syntax .token.url,
        .rich-text-editor .ql-editor pre.ql-syntax .token.variable {
          color: hsl(143 30% 30%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.atrule,
        .rich-text-editor .ql-editor pre.ql-syntax .token.attr-value,
        .rich-text-editor .ql-editor pre.ql-syntax .token.keyword {
          color: hsl(200 70% 40%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.function,
        .rich-text-editor .ql-editor pre.ql-syntax .token.class-name {
          color: hsl(280 60% 45%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.regex,
        .rich-text-editor .ql-editor pre.ql-syntax .token.important {
          color: hsl(30 80% 45%);
        }
        
        /* Inline code styling */
        .rich-text-editor .ql-editor code {
          background-color: hsl(var(--muted));
          color: hsl(var(--foreground));
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
