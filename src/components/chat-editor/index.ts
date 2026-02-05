export { default as ChatStyleEditor } from "./ChatStyleEditor";
export { default as ChatBubble } from "./ChatBubble";
export { default as ChatConversationView } from "./ChatConversationView";
export { default as TakeawayBlock } from "./TakeawayBlock";
export * from "./types";
export * from "./utils";
export * from "./chatColors";

// FreeformBlock and freeform components are intentionally NOT exported here
// to avoid loading the heavy fabric.js library on every page.
// Import directly from "./FreeformBlock" or "./freeform" when needed.
