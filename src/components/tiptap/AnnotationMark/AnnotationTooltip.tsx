/**
 * AnnotationTooltip - Stable tooltip that anchors to annotation marks
 * 
 * Uses editor state for positioning, NOT window.getSelection().
 * Renders in a portal to survive editor re-renders.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageSquare, Check, X, Trash2 } from 'lucide-react';

export interface AnnotationData {
  id: string;
  status: 'open' | 'resolved' | 'dismissed';
  comment: string;
  selectedText: string;
  authorName?: string;
  createdAt?: string;
}

interface AnnotationTooltipProps {
  editor: Editor | null;
  annotations: AnnotationData[];
  isAdmin?: boolean;
  isModerator?: boolean;
  onResolve?: (annotationId: string) => void;
  onDismiss?: (annotationId: string) => void;
  onDelete?: (annotationId: string) => void;
  onAnnotationClick?: (annotationId: string) => void;
}

interface TooltipState {
  visible: boolean;
  annotationId: string | null;
  position: { top: number; left: number } | null;
  placement: 'top' | 'bottom';
}

const AnnotationTooltip = ({
  editor,
  annotations,
  isAdmin = false,
  isModerator = false,
  onResolve,
  onDismiss,
  onDelete,
  onAnnotationClick,
}: AnnotationTooltipProps) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    annotationId: null,
    position: null,
    placement: 'top',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastAnnotationId = useRef<string | null>(null);

  // Find annotation mark at current selection using editor state
  const findAnnotationAtSelection = useCallback(() => {
    if (!editor) return null;

    const { from, to } = editor.state.selection;
    
    // Check if selection is within an annotation mark
    const marks = editor.state.doc.nodeAt(from)?.marks || [];
    const annotationMark = marks.find(mark => mark.type.name === 'annotation');
    
    if (annotationMark) {
      return annotationMark.attrs.annotationId as string;
    }

    // Also check resolved position for empty selections
    const $from = editor.state.doc.resolve(from);
    const storedMarks = editor.state.storedMarks || $from.marks();
    const storedAnnotation = storedMarks.find(mark => mark.type.name === 'annotation');
    
    if (storedAnnotation) {
      return storedAnnotation.attrs.annotationId as string;
    }

    return null;
  }, [editor]);

  // Calculate tooltip position based on annotation mark DOM node
  const calculatePosition = useCallback((annotationId: string): { top: number; left: number; placement: 'top' | 'bottom' } | null => {
    if (!editor) return null;

    // Find the DOM element with the annotation
    const editorDom = editor.view.dom;
    const annotationSpan = editorDom.querySelector(`[data-annotation-id="${annotationId}"]`);
    
    if (!annotationSpan) return null;

    const rect = annotationSpan.getBoundingClientRect();
    const tooltipHeight = 120; // Approximate tooltip height
    const padding = 8;

    let top = rect.top - tooltipHeight - padding;
    let placement: 'top' | 'bottom' = 'top';

    // If not enough space above, position below
    if (top < padding) {
      top = rect.bottom + padding;
      placement = 'bottom';
    }

    const left = rect.left + rect.width / 2;

    return { top, left, placement };
  }, [editor]);

  // Listen to selection updates
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const annotationId = findAnnotationAtSelection();
      
      if (annotationId && annotationId !== lastAnnotationId.current) {
        const position = calculatePosition(annotationId);
        
        if (position) {
          lastAnnotationId.current = annotationId;
          setTooltip({
            visible: true,
            annotationId,
            position: { top: position.top, left: position.left },
            placement: position.placement,
          });
        }
      } else if (!annotationId && tooltip.visible) {
        // Delay hiding to allow for click interactions
        setTimeout(() => {
          if (!tooltipRef.current?.matches(':hover')) {
            lastAnnotationId.current = null;
            setTooltip(prev => ({ ...prev, visible: false, annotationId: null }));
          }
        }, 100);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('focus', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('focus', handleSelectionUpdate);
    };
  }, [editor, findAnnotationAtSelection, calculatePosition, tooltip.visible]);

  // Handle scroll to update position
  useEffect(() => {
    if (!tooltip.visible || !tooltip.annotationId) return;

    const handleScroll = () => {
      const position = calculatePosition(tooltip.annotationId!);
      if (position) {
        setTooltip(prev => ({
          ...prev,
          position: { top: position.top, left: position.left },
          placement: position.placement,
        }));
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [tooltip.visible, tooltip.annotationId, calculatePosition]);

  // Handle hover on annotation marks (for read-only mode and UX)
  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;

    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      const annotationSpan = target.closest('[data-annotation-id]') as HTMLElement | null;
      
      if (annotationSpan) {
        const annotationId = annotationSpan.getAttribute('data-annotation-id');
        if (annotationId && annotationId !== lastAnnotationId.current) {
          const position = calculatePosition(annotationId);
          if (position) {
            lastAnnotationId.current = annotationId;
            setTooltip({
              visible: true,
              annotationId,
              position: { top: position.top, left: position.left },
              placement: position.placement,
            });
          }
        }
      }
    };

    const handleMouseLeave = (e: Event) => {
      const relatedTarget = (e as MouseEvent).relatedTarget as HTMLElement | null;
      
      // Don't hide if moving to the tooltip or another annotation
      if (relatedTarget?.closest('[data-annotation-id]') || 
          relatedTarget?.closest('.annotation-tooltip-portal')) {
        return;
      }

      // Delay hiding to allow smooth transition to tooltip
      setTimeout(() => {
        if (!tooltipRef.current?.matches(':hover')) {
          lastAnnotationId.current = null;
          setTooltip(prev => ({ ...prev, visible: false, annotationId: null }));
        }
      }, 150);
    };

    // Add listeners to all annotation marks
    editorDom.addEventListener('mouseenter', handleMouseEnter, true);
    editorDom.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      editorDom.removeEventListener('mouseenter', handleMouseEnter, true);
      editorDom.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [editor, calculatePosition]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        // Check if click is on an annotation mark
        const target = e.target as HTMLElement;
        if (!target.closest('[data-annotation-id]')) {
          lastAnnotationId.current = null;
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get annotation data
  const annotation = annotations.find(a => a.id === tooltip.annotationId);
  const canModify = isAdmin || isModerator;

  if (!tooltip.visible || !tooltip.position || !annotation) {
    return null;
  }

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[9999] transform -translate-x-1/2",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
      style={{
        top: `${tooltip.position.top}px`,
        left: `${tooltip.position.left}px`,
      }}
    >
      {/* Arrow */}
      {tooltip.placement === 'top' ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover" />
        </div>
      ) : (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-popover" />
        </div>
      )}

      <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[260px] max-w-[360px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Annotation</span>
          </div>
          <Badge 
            variant={annotation.status === 'open' ? 'destructive' : 'secondary'}
            className="text-[10px] h-5"
          >
            {annotation.status}
          </Badge>
        </div>

        {/* Selected text preview */}
        <div className="px-3 py-2 bg-primary/5 border-l-4 border-primary">
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            "{annotation.selectedText}"
          </p>
        </div>

        {/* Comment */}
        <div className="px-3 py-2">
          <p className="text-sm text-foreground">{annotation.comment}</p>
          {annotation.authorName && (
            <p className="text-xs text-muted-foreground mt-1">
              — {annotation.authorName}
            </p>
          )}
        </div>

        {/* Actions */}
        {canModify && annotation.status === 'open' && (
          <div className="flex items-center gap-1 px-3 py-2 border-t border-border bg-muted/20">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => onResolve?.(annotation.id)}
            >
              <Check className="h-3 w-3" />
              Resolve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={() => onDismiss?.(annotation.id)}
            >
              <X className="h-3 w-3" />
              Dismiss
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() => onDelete?.(annotation.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Render in portal for stability
  return createPortal(tooltipContent, document.body);
};

export default AnnotationTooltip;
