/**
 * ExecutableCodeBlockView - TipTap NodeView wrapper
 * 
 * Thin wrapper that delegates ALL UI rendering to the shared CodeBlock component.
 * Handles only TipTap-specific responsibilities:
 * - NodeViewWrapper for ProseMirror integration
 * - Node attribute access and updates
 * - Code edit context reporting
 * - Execution state management
 * 
 * ROLES: All users can edit and execute code (editing code ≠ editing content)
 */

import { useState, useEffect, useCallback, useId } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import CodeBlock from '@/components/chat-editor/CodeBlock';
import { supabase } from '@/integrations/supabase/client';
import { useCodeEdit } from '@/contexts/CodeEditContext';

// Supported languages for execution
const EXECUTABLE_LANGUAGES = ['python', 'javascript', 'typescript'];

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  html: 'markup',
  xml: 'markup',
  shell: 'bash',
  sh: 'bash',
};

const ExecutableCodeBlockView = ({ 
  node, 
  updateAttributes, 
  editor,
  deleteNode,
}: NodeViewProps) => {
  const { language = 'python', code = '' } = node.attrs;
  
  // Generate stable ID for this code block instance
  const instanceId = useId();
  
  // Get code edit context (may be undefined if not wrapped in provider)
  let codeEditContext: ReturnType<typeof useCodeEdit> | null = null;
  try {
    codeEditContext = useCodeEdit();
  } catch {
    // Context not available - that's okay, we just won't track edits
  }
  
  // Store original code for comparison
  const [originalCode] = useState(code);
  const [currentCode, setCurrentCode] = useState(code);
  
  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  
  const normalizedLang = LANGUAGE_MAP[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  const isEditable = editor?.isEditable ?? true;

  // Sync code when node attrs change externally
  useEffect(() => {
    setCurrentCode(code);
  }, [code]);
  
  // Report code edits to context
  useEffect(() => {
    if (codeEditContext) {
      codeEditContext.reportCodeEdit(instanceId, currentCode, originalCode, language);
    }
  }, [currentCode, originalCode, language, instanceId, codeEditContext]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCurrentCode(newCode);
    updateAttributes({ code: newCode });
  }, [updateAttributes]);

  const handleLanguageChange = useCallback((newLang: string) => {
    updateAttributes({ language: newLang });
  }, [updateAttributes]);

  const handleRun = async () => {
    if (!EXECUTABLE_LANGUAGES.includes(normalizedLang)) return;
    
    setIsRunning(true);
    setOutput(null);
    setOutputError(false);
    setShowOutput(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code: currentCode, language: normalizedLang },
      });

      if (error) {
        setOutput(error.message || 'Execution failed');
        setOutputError(true);
      } else if (data?.error) {
        setOutput(data.error);
        setOutputError(true);
      } else {
        setOutput(data?.output || 'No output');
        setOutputError(false);
      }
    } catch (err: any) {
      setOutput(err.message || 'Failed to execute code');
      setOutputError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCloseOutput = () => {
    setShowOutput(false);
    setOutput(null);
  };

  return (
    <NodeViewWrapper className="executable-code-block-wrapper my-2" data-type="executableCodeBlock">
      <CodeBlock
        code={currentCode}
        language={language}
        editable={true}
        onEdit={handleCodeChange}
        showLanguageSelect={isEditable}
        onLanguageChange={handleLanguageChange}
        showDelete={isEditable}
        onDelete={deleteNode}
        externalRunControl={true}
        isRunningExternal={isRunning}
        onRunExternal={handleRun}
        outputExternal={output}
        outputErrorExternal={outputError}
        showOutputExternal={showOutput}
        onCloseOutputExternal={handleCloseOutput}
        showToolbarAlways={true}
      />
    </NodeViewWrapper>
  );
};

export default ExecutableCodeBlockView;
