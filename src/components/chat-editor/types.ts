export type MessageType = "message" | "takeaway";

export interface ChatMessage {
  id: string;
  speaker: string;
  content: string;
  timestamp?: Date;
  type?: MessageType;
  takeawayTitle?: string;
  takeawayIcon?: string;
}

export interface CourseCharacter {
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  avatar?: string;
}

export const COURSE_CHARACTERS: Record<string, CourseCharacter> = {
  python: { name: "Python", emoji: "🐍", color: "hsl(var(--foreground))", bgColor: "hsl(var(--muted))" },
  sql: { name: "SQL", emoji: "🗄️", color: "hsl(var(--foreground))", bgColor: "hsl(var(--muted))" },
  powerbi: { name: "Power BI", emoji: "📊", color: "hsl(var(--foreground))", bgColor: "hsl(var(--muted))" },
  excel: { name: "Excel", emoji: "📗", color: "hsl(var(--foreground))", bgColor: "hsl(var(--muted))" },
  datascience: { name: "Data Science", emoji: "🤖", color: "hsl(var(--foreground))", bgColor: "hsl(var(--muted))" },
  ai: { name: "AI/ML", emoji: "🧠", color: "hsl(var(--foreground))", bgColor: "hsl(var(--muted))" },
};

export const MENTOR_CHARACTER: CourseCharacter = {
  name: "Karan",
  emoji: "👨‍💻",
  color: "white",
  bgColor: "hsl(210, 100%, 52%)", // iMessage blue
};

export const TAKEAWAY_ICONS = [
  { value: "🧠", label: "Brain" },
  { value: "💡", label: "Lightbulb" },
  { value: "⭐", label: "Star" },
  { value: "🎯", label: "Target" },
  { value: "📌", label: "Pin" },
  { value: "✅", label: "Check" },
  { value: "🔑", label: "Key" },
  { value: "💎", label: "Gem" },
];
