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
      setExecutableCodeBlock: (attributes?: { language?: string; code?: string; autofocus?: boolean }) => ReturnType;
      /**
       * Toggle an executable code block
       */
      toggleExecutableCodeBlock: (attributes?: { language?: string; autofocus?: boolean }) => ReturnType;
    };
  }
}

export const ExecutableCodeBlock = Node.create<ExecutableCodeBlockOptions>({
  name: 'executableCodeBlock',

  group: 'block',

  // This node is rendered by a React NodeView (textarea). It should be atomic
  // so ProseMirror doesn't try to manage a text cursor inside it.
  atom: true,

  content: '',

  marks: '',

  code: true,

  defining: true,

  isolating: true,

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
      autofocus: {
        default: false,
        parseHTML: element => element.getAttribute('data-autofocus') === 'true',
        // Don't serialize autofocus into HTML output
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
          const text = code?.textContent || element.textContent || '';
          return { language, code: text };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'executableCodeBlock' }),
      // Serialize code from attributes (we do not store code in ProseMirror content)
      ['pre', {}, ['code', { class: node.attrs?.language ? `language-${node.attrs.language}` : undefined }, node.attrs?.code || '']],
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
          // Insert a fresh node instead of converting the current paragraph.
          // Converting can leave hidden ProseMirror text selections (double cursor).
          return commands.insertContent({
            type: this.name,
            attrs: {
              language: attributes?.language ?? 'python',
              code: attributes?.code ?? '',
              autofocus: attributes?.autofocus ?? false,
            },
          });
        },
      toggleExecutableCodeBlock:
        (attributes) =>
        ({ editor, commands }) => {
          if (editor.isActive(this.name)) {
            // Remove the node by converting back to paragraph
            return commands.clearNodes();
          }
          return commands.insertContent({
            type: this.name,
            attrs: {
              language: attributes?.language ?? 'python',
              code: '',
              autofocus: attributes?.autofocus ?? false,
            },
          });
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
