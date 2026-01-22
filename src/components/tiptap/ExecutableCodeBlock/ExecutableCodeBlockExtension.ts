/**
 * ExecutableCodeBlock TipTap Extension
 * 
 * Custom node extension that replaces the default code block with an
 * interactive, executable code editor matching chat bubble behavior.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ExecutableCodeBlockView from './ExecutableCodeBlockView';

export interface ExecutableCodeBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    executableCodeBlock: {
      /**
       * Set an executable code block
       */
      setExecutableCodeBlock: (attributes?: { language?: string; code?: string }) => ReturnType;
      /**
       * Toggle an executable code block
       */
      toggleExecutableCodeBlock: (attributes?: { language?: string }) => ReturnType;
    };
  }
}

export const ExecutableCodeBlock = Node.create<ExecutableCodeBlockOptions>({
  name: 'executableCodeBlock',

  group: 'block',

  content: 'text*',

  marks: '',

  code: true,

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'executable-code-block',
      },
    };
  },

  addAttributes() {
    return {
      language: {
        default: 'python',
        parseHTML: element => element.getAttribute('data-language') || 'python',
        renderHTML: attributes => ({
          'data-language': attributes.language,
        }),
      },
      code: {
        default: '',
        parseHTML: element => element.textContent || '',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="executableCodeBlock"]',
      },
      // Also parse regular pre/code blocks and convert them
      {
        tag: 'pre',
        preserveWhitespace: 'full',
        getAttrs: node => {
          const element = node as HTMLElement;
          const code = element.querySelector('code');
          const language = code?.className?.match(/language-(\w+)/)?.[1] || 'python';
          return { language };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'executableCodeBlock' }),
      ['pre', {}, ['code', {}, 0]],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExecutableCodeBlockView);
  },

  addCommands() {
    return {
      setExecutableCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleExecutableCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.toggleExecutableCodeBlock(),
      // When inside code block, Tab should be captured
      Tab: ({ editor }) => {
        if (editor.isActive(this.name)) {
          return true; // Handled by the NodeView
        }
        return false;
      },
      // Backspace at the start of empty code block converts to paragraph
      Backspace: ({ editor }) => {
        const { empty, $anchor } = editor.state.selection;
        const isAtStart = $anchor.pos === $anchor.start();
        
        if (!empty || !isAtStart || !editor.isActive(this.name)) {
          return false;
        }
        
        const codeContent = $anchor.parent.textContent;
        if (codeContent === '') {
          return editor.commands.clearNodes();
        }
        
        return false;
      },
      // Enter at the end of empty code block exits to new paragraph
      Enter: ({ editor }) => {
        if (!editor.isActive(this.name)) {
          return false;
        }
        
        const { state } = editor;
        const { $from } = state.selection;
        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
        const codeContent = $from.parent.textContent;
        const endsWithDoubleNewline = codeContent.endsWith('\n\n');
        
        if (isAtEnd && endsWithDoubleNewline) {
          // Remove trailing newlines and exit
          return editor
            .chain()
            .command(({ tr }) => {
              const pos = $from.pos;
              const textContent = $from.parent.textContent.slice(0, -2);
              tr.insertText(textContent, $from.start(), $from.end());
              return true;
            })
            .exitCode()
            .run();
        }
        
        return false;
      },
    };
  },
});

export default ExecutableCodeBlock;
