import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Settings, Maximize2, AlignLeft } from "lucide-react";
import { ProblemDetail } from "./problemDetailData";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface CodeEditorProps {
  problem: ProblemDetail;
  supportedLanguages?: string[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
  readOnly?: boolean;
  errorLine?: number;
  onCodeChange?: (code: string, language: string) => void;
}

export interface CodeEditorRef {
  getCode: () => string;
  getLanguage: () => string;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  getLineCount: () => number;
  highlightErrorLine: (line: number) => void;
  clearErrorHighlight: () => void;
}

const languageLabels: Record<string, string> = {
  python: "Python 3",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
  sql: "SQL",
  mysql: "MySQL",
};

// Map our language names to Monaco language identifiers
const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
  sql: "sql",
  mysql: "sql",
};

// Editor settings interface
interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
};

// Load settings from localStorage
const loadSettings = (): EditorSettings => {
  try {
    const saved = localStorage.getItem('code-editor-settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load editor settings:', e);
  }
  return DEFAULT_SETTINGS;
};

// Save settings to localStorage
const saveSettings = (settings: EditorSettings) => {
  try {
    localStorage.setItem('code-editor-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save editor settings:', e);
  }
};

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(function CodeEditor(
  { problem, supportedLanguages, onRun, onSubmit, readOnly = false, errorLine, onCodeChange },
  ref
) {
  const { theme } = useTheme();
  const availableLanguages = supportedLanguages && supportedLanguages.length > 0 
    ? supportedLanguages 
    : Object.keys(problem.starterCode);
  const [language, setLanguage] = useState(availableLanguages[0] || "python");
  const [code, setCode] = useState(problem.starterCode[availableLanguages[0]] || "");
  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Use refs for callbacks to avoid stale closures
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const onRunRef = useRef(onRun);
  
  // Keep refs in sync
  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCode: () => code,
    getLanguage: () => language,
    setCode: (newCode: string) => setCode(newCode),
    setLanguage: (newLang: string) => {
      setLanguage(newLang);
      setCode(problem.starterCode[newLang] || '');
    },
    getLineCount: () => code.split('\n').length,
    highlightErrorLine: (line: number) => {
      if (editorRef.current && monacoRef.current) {
        const monaco = monacoRef.current;
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          [
            {
              range: new monaco.Range(line, 1, line, 1),
              options: {
                isWholeLine: true,
                className: 'error-line-highlight',
                glyphMarginClassName: 'error-line-glyph',
                linesDecorationsClassName: 'error-line-decoration',
              },
            },
          ]
        );
        editorRef.current.revealLineInCenter(line);
      }
    },
    clearErrorHighlight: () => {
      if (editorRef.current) {
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          []
        );
      }
    },
  }), [code, language, problem.starterCode]);

  // Handle external error line changes
  useEffect(() => {
    if (errorLine && editorRef.current && monacoRef.current) {
      const monaco = monacoRef.current;
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [
          {
            range: new monaco.Range(errorLine, 1, errorLine, 1),
            options: {
              isWholeLine: true,
              className: 'error-line-highlight',
              glyphMarginClassName: 'error-line-glyph',
              linesDecorationsClassName: 'error-line-decoration',
            },
          },
        ]
      );
      editorRef.current.revealLineInCenter(errorLine);
    } else if (!errorLine && editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }
  }, [errorLine]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const newCode = problem.starterCode[newLang] || '';
    setCode(newCode);
    onCodeChange?.(newCode, newLang);
  };

  const handleReset = () => {
    const resetCode = problem.starterCode[language] || '';
    setCode(resetCode);
    onCodeChange?.(resetCode, language);
  };

  const handleFormatCode = useCallback(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      // Trigger format action
      const action = editor.getAction('editor.action.formatDocument');
      if (action) {
        action.run();
      } else {
        // Fallback: manually trigger formatting via command
        editor.trigger('keyboard', 'editor.action.formatDocument', null);
      }
    }
  }, []);

  const handleSettingChange = <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
    
    // Apply settings immediately to the editor if it exists
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.updateOptions({
        fontSize: key === 'fontSize' ? value as number : settings.fontSize,
        tabSize: key === 'tabSize' ? value as number : settings.tabSize,
        wordWrap: key === 'wordWrap' ? (value ? 'on' : 'off') : (settings.wordWrap ? 'on' : 'off'),
        lineNumbers: key === 'lineNumbers' ? (value ? 'on' : 'off') : (settings.lineNumbers ? 'on' : 'off'),
        minimap: { enabled: key === 'minimap' ? value as boolean : settings.minimap },
      });
    }
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange?.(newCode, language);
  }, [language, onCodeChange]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add Ctrl+Enter keybinding to run code - uses refs to avoid stale closures
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current(codeRef.current, languageRef.current);
    });

    // Add Shift+Alt+F keybinding for format
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.trigger('keyboard', 'editor.action.formatDocument', null);
    });
  }, []);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const monacoLanguage = monacoLanguageMap[language] || 'plaintext';

  return (
    <div className="h-full flex flex-col bg-card border-l border-border/50">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {languageLabels[lang] || lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleFormatCode}
            title="Format Code (Shift+Alt+F)"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset Code">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Editor Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Editor Settings</h4>
                
                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Font Size</Label>
                    <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
                  </div>
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={([value]) => handleSettingChange('fontSize', value)}
                    min={10}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Tab Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Tab Size</Label>
                    <span className="text-xs text-muted-foreground">{settings.tabSize} spaces</span>
                  </div>
                  <Slider
                    value={[settings.tabSize]}
                    onValueChange={([value]) => handleSettingChange('tabSize', value)}
                    min={2}
                    max={8}
                    step={2}
                    className="w-full"
                  />
                </div>

                {/* Word Wrap */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Word Wrap</Label>
                  <Switch
                    checked={settings.wordWrap}
                    onCheckedChange={(checked) => handleSettingChange('wordWrap', checked)}
                  />
                </div>

                {/* Line Numbers */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Line Numbers</Label>
                  <Switch
                    checked={settings.lineNumbers}
                    onCheckedChange={(checked) => handleSettingChange('lineNumbers', checked)}
                  />
                </div>

                {/* Minimap */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Minimap</Label>
                  <Switch
                    checked={settings.minimap}
                    onCheckedChange={(checked) => handleSettingChange('minimap', checked)}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Maximize">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Code Area - Monaco Editor */}
      <div className="flex-1 overflow-hidden bg-background">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          theme={monacoTheme}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            fontSize: settings.fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: settings.lineNumbers ? "on" : "off",
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 16,
            glyphMargin: true,
            folding: false,
            minimap: { enabled: settings.minimap },
            wordWrap: settings.wordWrap ? "on" : "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: settings.tabSize,
            insertSpaces: true,
            renderIndentGuides: true,
            padding: { top: 16, bottom: 16 },
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            contextmenu: true,
            bracketPairColorization: { enabled: true },
            guides: {
              indentation: true,
              bracketPairs: true,
            },
          }}
        />
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
        <div className="text-xs text-muted-foreground">
          Press Ctrl+Enter to run
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRun(code, language)}
          >
            Run
          </Button>
          <Button 
            size="sm" 
            onClick={() => onSubmit(code, language)}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
});