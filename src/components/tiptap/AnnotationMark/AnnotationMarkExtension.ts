/**
 * AnnotationMark - Custom TipTap mark for inline annotations
 * 
 * This mark wraps annotated text with visible highlighting and data attributes.
 * Annotations are part of the document schema, not metadata-only.
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export interface AnnotationMarkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotationMark: {
      /**
       * Set an annotation mark
       */
      setAnnotation: (attributes: { 
        annotationId: string; 
        status?: 'open' | 'resolved' | 'dismissed';
      }) => ReturnType;
      /**
       * Toggle an annotation mark
       */
      toggleAnnotation: (attributes: { 
        annotationId: string; 
        status?: 'open' | 'resolved' | 'dismissed';
      }) => ReturnType;
      /**
       * Remove an annotation mark
       */
      unsetAnnotation: () => ReturnType;
      /**
       * Update annotation status
       */
      updateAnnotationStatus: (annotationId: string, status: 'open' | 'resolved' | 'dismissed') => ReturnType;
    };
  }
}

export const AnnotationMark = Mark.create<AnnotationMarkOptions>({
  name: 'annotation',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      annotationId: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-id'),
        renderHTML: attributes => {
          if (!attributes.annotationId) return {};
          return { 'data-annotation-id': attributes.annotationId };
        },
      },
      status: {
        default: 'open',
        parseHTML: element => element.getAttribute('data-annotation-status') || 'open',
        renderHTML: attributes => {
          return { 'data-annotation-status': attributes.status || 'open' };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-annotation-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const status = HTMLAttributes['data-annotation-status'] || 'open';
    const statusClass = status === 'open' 
      ? 'annotation-mark-open' 
      : status === 'resolved' 
        ? 'annotation-mark-resolved' 
        : 'annotation-mark-dismissed';

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `annotation-mark ${statusClass}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAnnotation:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleAnnotation:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetAnnotation:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      updateAnnotationStatus:
        (annotationId, status) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            if (!node.isText) return;
            
            const marks = node.marks.filter(
              mark => mark.type.name === this.name && 
                      mark.attrs.annotationId === annotationId
            );

            marks.forEach(mark => {
              if (dispatch) {
                const newMark = mark.type.create({ ...mark.attrs, status });
                tr.addMark(pos, pos + node.nodeSize, newMark);
                found = true;
              }
            });
          });

          return found;
        },
    };
  },
});

export default AnnotationMark;
