/**
 * Unified Code Formatter
 * 
 * Language-aware, syntax-safe formatting that matches LeetCode behavior.
 * Uses industry-standard formatters per language.
 */

import type { Monaco } from "@monaco-editor/react";

export interface FormatResult {
  success: boolean;
  formattedCode?: string;
  error?: string;
}

// Lazy-loaded Prettier modules
let prettierPromise: Promise<{
  prettier: any;
  parserBabel: any;
  parserTypescript: any;
  parserHtml: any;
  pluginEstree: any;
  pluginPython: any;
}> | null = null;

async function loadPrettier() {
  if (!prettierPromise) {
    prettierPromise = (async () => {
      const [
        prettierMod,
        parserBabelMod,
        parserTypescriptMod,
        parserHtmlMod,
        pluginEstreeMod,
        pluginPythonMod,
      ] = await Promise.all([
        import("prettier/standalone"),
        import("prettier/plugins/babel"),
        import("prettier/plugins/typescript"),
        import("prettier/plugins/html"),
        import("prettier/plugins/estree"),
        import("@prettier/plugin-python"),
      ]);

      return {
        prettier: prettierMod.default ?? prettierMod,
        parserBabel: parserBabelMod.default ?? parserBabelMod,
        parserTypescript: parserTypescriptMod.default ?? parserTypescriptMod,
        parserHtml: parserHtmlMod.default ?? parserHtmlMod,
        pluginEstree: pluginEstreeMod.default ?? pluginEstreeMod,
        pluginPython: pluginPythonMod.default ?? pluginPythonMod,
      };
    })();
  }
  return prettierPromise;
}

/**
 * Format Python code using PEP-8 / Black-style rules
 */
async function formatPython(code: string, tabWidth: number): Promise<FormatResult> {
  try {
    const { prettier, pluginPython } = await loadPrettier();
    const formatted = await prettier.format(code, {
      parser: "python",
      plugins: [pluginPython],
      tabWidth,
      printWidth: 88, // Black's default
    });
    return { success: true, formattedCode: formatted.trimEnd() };
  } catch (error: any) {
    return {
      success: false,
      error: parsePrettierError(error),
    };
  }
}

/**
 * Format JavaScript code using Prettier
 */
async function formatJavaScript(code: string, tabWidth: number): Promise<FormatResult> {
  try {
    const { prettier, parserBabel, pluginEstree } = await loadPrettier();
    const formatted = await prettier.format(code, {
      parser: "babel",
      plugins: [parserBabel, pluginEstree],
      tabWidth,
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
      printWidth: 80,
    });
    return { success: true, formattedCode: formatted.trimEnd() };
  } catch (error: any) {
    return {
      success: false,
      error: parsePrettierError(error),
    };
  }
}

/**
 * Format TypeScript code using Prettier
 */
async function formatTypeScript(code: string, tabWidth: number): Promise<FormatResult> {
  try {
    const { prettier, parserTypescript, pluginEstree } = await loadPrettier();
    const formatted = await prettier.format(code, {
      parser: "typescript",
      plugins: [parserTypescript, pluginEstree],
      tabWidth,
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
      printWidth: 80,
    });
    return { success: true, formattedCode: formatted.trimEnd() };
  } catch (error: any) {
    return {
      success: false,
      error: parsePrettierError(error),
    };
  }
}

/**
 * Format Java code - basic indentation formatting
 * Note: Full Java formatting requires a JVM-based formatter.
 * This provides basic structural formatting.
 */
function formatJava(code: string, tabWidth: number): FormatResult {
  try {
    const lines = code.split('\n');
    const indent = ' '.repeat(tabWidth);
    let depth = 0;
    const formatted: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      // Decrease depth for closing braces
      if (line.startsWith('}') || line.startsWith(')')) {
        depth = Math.max(0, depth - 1);
      }

      // Add the line with proper indentation
      if (line.length > 0) {
        formatted.push(indent.repeat(depth) + line);
      } else {
        formatted.push('');
      }

      // Increase depth for opening braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      depth += openBraces - closeBraces;
      depth = Math.max(0, depth);
    }

    return { success: true, formattedCode: formatted.join('\n').trimEnd() };
  } catch (error: any) {
    return {
      success: false,
      error: "Unable to format due to syntax errors. Fix errors and try again.",
    };
  }
}

/**
 * Format C/C++ code - basic indentation formatting
 * Note: Full C++ formatting requires clang-format.
 * This provides basic structural formatting.
 */
function formatCpp(code: string, tabWidth: number): FormatResult {
  try {
    const lines = code.split('\n');
    const indent = ' '.repeat(tabWidth);
    let depth = 0;
    const formatted: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      // Handle preprocessor directives (no indentation)
      if (line.startsWith('#')) {
        formatted.push(line);
        continue;
      }

      // Decrease depth for closing braces
      if (line.startsWith('}') || line.startsWith(')')) {
        depth = Math.max(0, depth - 1);
      }

      // Handle case/default in switch statements
      if (line.startsWith('case ') || line.startsWith('default:')) {
        formatted.push(indent.repeat(Math.max(0, depth - 1)) + line);
      } else if (line.length > 0) {
        formatted.push(indent.repeat(depth) + line);
      } else {
        formatted.push('');
      }

      // Increase depth for opening braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      depth += openBraces - closeBraces;
      depth = Math.max(0, depth);
    }

    return { success: true, formattedCode: formatted.join('\n').trimEnd() };
  } catch (error: any) {
    return {
      success: false,
      error: "Unable to format due to syntax errors. Fix errors and try again.",
    };
  }
}

/**
 * Parse Prettier errors into user-friendly messages
 */
function parsePrettierError(error: any): string {
  const message = error?.message || String(error);
  
  // Check for common syntax error patterns
  if (message.includes('SyntaxError') || message.includes('Unexpected token')) {
    return "Unable to format due to syntax errors. Fix errors and try again.";
  }
  
  if (message.includes('Parse error')) {
    return "Unable to format due to syntax errors. Fix errors and try again.";
  }

  return "Unable to format due to syntax errors. Fix errors and try again.";
}

/**
 * Main format function - routes to appropriate language formatter
 */
export async function formatCode(
  code: string,
  language: string,
  tabWidth: number = 4
): Promise<FormatResult> {
  // Skip formatting if code is empty or whitespace only
  if (!code.trim()) {
    return { success: true, formattedCode: code };
  }

  switch (language.toLowerCase()) {
    case 'python':
      return formatPython(code, tabWidth);
    case 'javascript':
      return formatJavaScript(code, tabWidth);
    case 'typescript':
      return formatTypeScript(code, tabWidth);
    case 'java':
      return formatJava(code, tabWidth);
    case 'cpp':
    case 'c':
      return formatCpp(code, tabWidth);
    case 'sql':
    case 'mysql':
      // SQL formatting is complex; return unchanged
      return { success: true, formattedCode: code };
    default:
      return { success: true, formattedCode: code };
  }
}

/**
 * Check if a language supports formatting
 */
export function supportsFormatting(language: string): boolean {
  const supported = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c'];
  return supported.includes(language.toLowerCase());
}

// Track formatter registration state per language
const registeredFormatters = new Set<string>();

/**
 * Register formatters for Monaco Editor
 * This enables the built-in "Format Document" command (Shift+Alt+F)
 */
export function registerMonacoFormatters(
  monaco: Monaco,
  getTabWidth: () => number
) {
  // Python formatter
  if (!registeredFormatters.has('python')) {
    registeredFormatters.add('python');
    monaco.languages.registerDocumentFormattingEditProvider("python", {
      provideDocumentFormattingEdits: async (model) => {
        const result = await formatPython(model.getValue(), getTabWidth());
        if (result.success && result.formattedCode !== undefined) {
          return [{ range: model.getFullModelRange(), text: result.formattedCode }];
        }
        return [];
      },
    });
  }

  // JavaScript formatter
  if (!registeredFormatters.has('javascript')) {
    registeredFormatters.add('javascript');
    monaco.languages.registerDocumentFormattingEditProvider("javascript", {
      provideDocumentFormattingEdits: async (model) => {
        const result = await formatJavaScript(model.getValue(), getTabWidth());
        if (result.success && result.formattedCode !== undefined) {
          return [{ range: model.getFullModelRange(), text: result.formattedCode }];
        }
        return [];
      },
    });
  }

  // TypeScript formatter
  if (!registeredFormatters.has('typescript')) {
    registeredFormatters.add('typescript');
    monaco.languages.registerDocumentFormattingEditProvider("typescript", {
      provideDocumentFormattingEdits: async (model) => {
        const result = await formatTypeScript(model.getValue(), getTabWidth());
        if (result.success && result.formattedCode !== undefined) {
          return [{ range: model.getFullModelRange(), text: result.formattedCode }];
        }
        return [];
      },
    });
  }

  // Java formatter
  if (!registeredFormatters.has('java')) {
    registeredFormatters.add('java');
    monaco.languages.registerDocumentFormattingEditProvider("java", {
      provideDocumentFormattingEdits: (model) => {
        const result = formatJava(model.getValue(), getTabWidth());
        if (result.success && result.formattedCode !== undefined) {
          return [{ range: model.getFullModelRange(), text: result.formattedCode }];
        }
        return [];
      },
    });
  }

  // C++ formatter
  if (!registeredFormatters.has('cpp')) {
    registeredFormatters.add('cpp');
    monaco.languages.registerDocumentFormattingEditProvider("cpp", {
      provideDocumentFormattingEdits: (model) => {
        const result = formatCpp(model.getValue(), getTabWidth());
        if (result.success && result.formattedCode !== undefined) {
          return [{ range: model.getFullModelRange(), text: result.formattedCode }];
        }
        return [];
      },
    });
  }
}
