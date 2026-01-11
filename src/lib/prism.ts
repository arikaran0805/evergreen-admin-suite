/**
 * Centralized PrismJS initialization
 * This ensures the core Prism library is loaded and available globally
 * before any language components are imported.
 */
import Prism from "prismjs";

// Make Prism available globally for language components
if (typeof window !== "undefined") {
  (window as any).Prism = Prism;
}

// Import the base theme
import "prismjs/themes/prism.css";

// Now import language components (they require global Prism)
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-r";

export default Prism;
