/**
 * CodeBlock - Re-exports MonacoCodeBlock for backward compatibility
 * 
 * This file maintains the old import path while the actual implementation
 * is now consolidated in the code-block/MonacoCodeBlock component.
 */

export { default, type MonacoCodeBlockProps as CodeBlockProps } from '@/components/code-block/MonacoCodeBlock';
