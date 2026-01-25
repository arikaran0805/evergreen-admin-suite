/**
 * ExecutableCodeBlockView - TipTap NodeView for interactive code blocks
 *
 * Uses the shared CodeBlock component for UI consistency with chat bubbles.
 * This file handles only TipTap-specific behavior (node sync, context tracking).
 *
 * ROLES: All users can edit and execute code (editing code ≠ editing content)
 */

import { useState, useEffect, useCallback, useId } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import CodeBlock from '@/components/chat-editor/CodeBlock';
import { useCodeTheme } from '@/hooks/useCodeTheme';
import { useCodeEdit } from '@/contexts/CodeEditContext';
import { supabase } from '@/integrations/supabase/client';

// All available languages
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'plaintext', label: 'Plain Text' },
];

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  html: 'markup',
  xml: 'markup',
  shell: 'bash',
  sh: 'bash',
};

const EXECUTABLE_LANGUAGES = ['python', 'javascript', 'typescript'];

const ExecutableCodeBlockView = ({
  node,
  updateAttributes,
  editor,
  deleteNode,
}: NodeViewProps) => {
  const { language = 'python', code = '' } = node.attrs;
  const { theme: codeTheme } = useCodeTheme();

  // Generate stable ID for this code block instance
  const instanceId = useId();

  // Get code edit context (may be undefined if not wrapped in provider)
  let codeEditContext: ReturnType<typeof useCodeEdit> | null = null;
  try {
    codeEditContext = useCodeEdit();
  } catch {
    // Context not available - that's okay, we just won't track edits
  }

  const [localCode, setLocalCode] = useState(code);
  const [originalCode] = useState(code);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<{ text: string | null; isError: boolean; show: boolean }>({
    text: null,
    isError: false,
    show: false,
  });

  const isEditable = editor?.isEditable ?? true;

  // Sync code when node attrs change externally
  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  // Report code edits to context
  useEffect(() => {
    if (codeEditContext) {
      codeEditContext.reportCodeEdit(instanceId, localCode, originalCode, language);
    }
  }, [localCode, originalCode, language, instanceId, codeEditContext]);

  const handleLanguageChange = useCallback(
    (newLang: string) => {
      updateAttributes({ language: newLang });
    },
    [updateAttributes]
  );

  const handleCodeEdit = useCallback(
    (newCode: string) => {
      setLocalCode(newCode);
      updateAttributes({ code: newCode });
    },
    [updateAttributes]
  );

  const normalizedLang = LANGUAGE_MAP[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';

  const handleRun = useCallback(async (): Promise<{ output?: string; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code: localCode, language: normalizedLang },
      });

      if (error) {
        return { error: error.message || 'Execution failed' };
      } else if (data?.error) {
        return { error: data.error };
      } else {
        return { output: data?.output || 'No output' };
      }
    } catch (err: any) {
      return { error: err.message || 'Failed to execute code' };
    }
  }, [localCode, normalizedLang]);

  const handleCloseOutput = useCallback(() => {
    setOutput({ text: null, isError: false, show: false });
  }, []);

  return (
    <NodeViewWrapper
      className="executable-code-block-wrapper my-2"
      data-type="executableCodeBlock"
    >
      <CodeBlock
        code={localCode}
        language={language}
        overrideTheme={codeTheme}
        editable={true}
        showToolbarAlways={true}
        onEdit={handleCodeEdit}
        showLanguageSelector={isEditable}
        languageOptions={LANGUAGES}
        onLanguageChange={handleLanguageChange}
        showDeleteButton={isEditable}
        onDelete={deleteNode}
        placeholder="// Write your code here..."
        showRunButton={EXECUTABLE_LANGUAGES.includes(normalizedLang)}
      />
    </NodeViewWrapper>
  );
};

export default ExecutableCodeBlockView;
