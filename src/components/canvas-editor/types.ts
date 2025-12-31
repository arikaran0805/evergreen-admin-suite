export type BlockType = "chat" | "richtext";

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  collapsed: boolean;
}

export const BLOCK_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: "chat", label: "Chat Editor", icon: "MessageCircle" },
  { type: "richtext", label: "Rich Text Editor", icon: "FileText" },
];
