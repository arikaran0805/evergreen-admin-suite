import type { Monaco } from "@monaco-editor/react";

type Loaded = {
  prettier: { format: (code: string, options: any) => Promise<string> | string };
  pluginPython: any;
};

let loadedPromise: Promise<Loaded> | null = null;
let pythonMonacoFormatterRegistered = false;

async function loadPrettierPython(): Promise<Loaded> {
  if (!loadedPromise) {
    loadedPromise = (async () => {
      const prettierMod: any = await import("prettier/standalone");
      const pluginPythonMod: any = await import("@prettier/plugin-python");

      const prettier = prettierMod?.default ?? prettierMod;
      const pluginPython = pluginPythonMod?.default ?? pluginPythonMod;

      return { prettier, pluginPython };
    })();
  }

  return loadedPromise;
}

export async function formatPython(
  code: string,
  options: {
    tabWidth?: number;
  } = {},
): Promise<string> {
  const { prettier, pluginPython } = await loadPrettierPython();
  const formatted = await prettier.format(code, {
    parser: "python",
    plugins: [pluginPython],
    tabWidth: options.tabWidth ?? 4,
  });
  return typeof formatted === "string" ? formatted : String(formatted);
}

/**
 * Adds a Python formatting provider so Monaco's built-in "Format Document" works.
 * Safe to call multiple times; it registers only once per app session.
 */
export function registerMonacoPythonFormatter(
  monaco: Monaco,
  getTabWidth: () => number,
) {
  if (pythonMonacoFormatterRegistered) return;
  pythonMonacoFormatterRegistered = true;

  monaco.languages.registerDocumentFormattingEditProvider("python", {
    provideDocumentFormattingEdits: async (model) => {
      const formatted = await formatPython(model.getValue(), {
        tabWidth: getTabWidth(),
      });

      return [
        {
          range: model.getFullModelRange(),
          text: formatted,
        },
      ];
    },
  });
}
