import { useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);

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

  return (
    <div className="rich-text-editor">
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
      <style>{`
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
      `}</style>
    </div>
  );
};

export default RichTextEditor;
