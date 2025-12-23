import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, CourseCharacter, COURSE_CHARACTERS, MENTOR_CHARACTER } from "./types";
import ChatBubble from "./ChatBubble";
import { cn } from "@/lib/utils";
import { normalizeChatInput } from "@/lib/chatContent";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Edit3, MessageCircle, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface ChatStyleEditorProps {
  value: string;
  onChange: (value: string) => void;
  courseType?: string;
  placeholder?: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const parseContent = (content: string): ChatMessage[] => {
  const normalized = normalizeChatInput(content);
  if (!normalized.trim()) return [];

  const lines = normalized.split("\n");
  const messages: ChatMessage[] = [];
  let currentMessage: ChatMessage | null = null;

  const speakerTokenRe = /([^:\n]{1,60}):\s*/g;

  for (const rawLine of lines) {
    const line = rawLine;
    const matches = Array.from(line.matchAll(speakerTokenRe)).filter((m) => /[A-Za-z]/.test(m[1] || ""));

    if (matches.length === 0) {
      if (currentMessage && line.trim()) {
        currentMessage.content += (currentMessage.content ? "\n" : "") + line;
      }
      continue;
    }

    // If there's text before the first "Speaker:", treat it as continuation.
    const firstIndex = matches[0].index ?? 0;
    if (firstIndex > 0 && currentMessage) {
      const prefix = line.slice(0, firstIndex).trim();
      if (prefix) currentMessage.content += "\n" + prefix;
    }

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const speaker = (m[1] || "").trim();
      const start = (m.index ?? 0) + m[0].length;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? line.length) : line.length;
      const chunk = line.slice(start, end).trim();

      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: generateId(),
        speaker,
        content: chunk,
      };
    }
  }

  if (currentMessage) messages.push(currentMessage);

  return messages.filter((m) => m.speaker.trim() && m.content.trim());
};

const serializeMessages = (messages: ChatMessage[]): string => {
  return messages.map((m) => `${m.speaker}: ${m.content}`).join("\n\n");
};

const ChatStyleEditor = ({
  value,
  onChange,
  courseType = "python",
  placeholder,
}: ChatStyleEditorProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => parseContent(value));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"mentor" | "course">("course");
  const [selectedCourse, setSelectedCourse] = useState(courseType);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const courseCharacter = COURSE_CHARACTERS[selectedCourse] || COURSE_CHARACTERS.python;
  const mentorName = "Karan";

  useEffect(() => {
    const serialized = serializeMessages(messages);
    if (serialized !== value) {
      onChange(serialized);
    }
  }, [messages]);

  useEffect(() => {
    const parsed = parseContent(value);

    const stripIds = (arr: ChatMessage[]) =>
      arr.map((m) => ({ speaker: m.speaker, content: m.content }));

    if (JSON.stringify(stripIds(parsed)) !== JSON.stringify(stripIds(messages))) {
      setMessages(parsed);
    }
  }, [value]);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleAddMessage = () => {
    if (!newMessage.trim()) return;

    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    const newMsg: ChatMessage = {
      id: generateId(),
      speaker,
      content: newMessage.trim(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");
    setCurrentSpeaker((prev) => (prev === "mentor" ? "course" : "mentor"));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddMessage();
    }
  };

  const handleEditMessage = (id: string, content: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    );
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMoveMessage = (id: string, direction: "up" | "down") => {
    const index = messages.findIndex((m) => m.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === messages.length - 1) return;

    const newMessages = [...messages];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newMessages[index], newMessages[swapIndex]] = [newMessages[swapIndex], newMessages[index]];
    setMessages(newMessages);
  };

  const getCharacterForSpeaker = (speaker: string): CourseCharacter => {
    if (speaker.toLowerCase() === mentorName.toLowerCase()) {
      return MENTOR_CHARACTER;
    }
    return (
      Object.values(COURSE_CHARACTERS).find(
        (c) => c.name.toLowerCase() === speaker.toLowerCase()
      ) || courseCharacter
    );
  };

  const isMentor = (speaker: string) =>
    speaker.toLowerCase() === mentorName.toLowerCase();

  return (
    <div className="chat-style-editor rounded-xl border border-border bg-background overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">Chat Editor</span>
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COURSE_CHARACTERS).map(([key, char]) => (
                <SelectItem key={key} value={key}>
                  {char.emoji} {char.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "edit" | "preview")}>
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs px-3 h-7">
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-3 h-7">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chat container */}
      <div
        ref={chatContainerRef}
        className={cn(
          "p-6 overflow-y-auto bg-gradient-to-b from-background to-muted/20",
          "min-h-[400px] max-h-[500px]"
        )}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 0%, transparent 70%)`,
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Start a conversation</p>
            <p className="text-xs mt-1 opacity-70">
              Type as {courseCharacter.name} or {mentorName}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div key={message.id} className="group relative">
                <ChatBubble
                  message={message}
                  character={getCharacterForSpeaker(message.speaker)}
                  isMentor={isMentor(message.speaker)}
                  isEditing={editingId === message.id}
                  onEdit={handleEditMessage}
                  onStartEdit={setEditingId}
                  onEndEdit={() => setEditingId(null)}
                />
                
                {/* Edit controls (visible on hover in edit mode) */}
                {mode === "edit" && (
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                      isMentor(message.speaker) ? "left-2" : "right-2"
                    )}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveMessage(message.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveMessage(message.id, "down")}
                      disabled={index === messages.length - 1}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteMessage(message.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input area (only in edit mode) */}
      {mode === "edit" && (
        <div className="border-t border-border bg-muted/30 p-4">
          {/* Speaker toggle */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Speaking as:</span>
            <div className="flex rounded-full bg-muted p-0.5">
              <button
                onClick={() => setCurrentSpeaker("course")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  currentSpeaker === "course"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {courseCharacter.emoji} {courseCharacter.name}
              </button>
              <button
                onClick={() => setCurrentSpeaker("mentor")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  currentSpeaker === "mentor"
                    ? "bg-[hsl(210,100%,52%)] shadow-sm text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                👨‍💻 {mentorName}
              </button>
            </div>
          </div>

          {/* Message input */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Type a message as ${
                  currentSpeaker === "mentor" ? mentorName : courseCharacter.name
                }...`}
                className={cn(
                  "w-full px-4 py-3 rounded-2xl border border-border bg-background",
                  "resize-none min-h-[48px] max-h-[120px] text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                  "placeholder:text-muted-foreground/60"
                )}
                rows={1}
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/50">
                Enter to send • Shift+Enter for new line
              </div>
            </div>
            <Button
              onClick={handleAddMessage}
              disabled={!newMessage.trim()}
              className={cn(
                "h-12 w-12 rounded-full p-0 shadow-lg",
                "bg-[hsl(210,100%,52%)] hover:bg-[hsl(210,100%,45%)]",
                "transition-all duration-200 hover:scale-105"
              )}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      <style>{`
        .chat-style-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default ChatStyleEditor;
