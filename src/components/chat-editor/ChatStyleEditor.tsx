import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, CourseCharacter, MENTOR_CHARACTER, TAKEAWAY_ICONS } from "./types";
import ChatBubble from "./ChatBubble";
import TakeawayBlock from "./TakeawayBlock";
import { cn } from "@/lib/utils";
import { extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/RichTextEditor";
import { Plus, Eye, Edit3, MessageCircle, Trash2, FileText, Code, Send, Image, Link, Bold, Italic, GripVertical, Pencil, ArrowUp, ArrowDown, Terminal, List, ListOrdered, Heading2, Quote, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renderCourseIcon } from "./utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash/Shell" },
  { value: "r", label: "R" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
];

interface ChatStyleEditorProps {
  value: string;
  onChange: (value: string) => void;
  courseType?: string;
  placeholder?: string;
  codeTheme?: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Takeaway format: [TAKEAWAY:icon:title]: content
const TAKEAWAY_REGEX = /^\[TAKEAWAY(?::([^:]*?))?(?::([^\]]*?))?\]:\s*/;

const parseContent = (content: string): ChatMessage[] => {
  const segments = extractChatSegments(content, { allowSingle: true });
  if (segments.length === 0) return [];

  return segments
    .map((s) => {
      const takeawayMatch = s.content.match(TAKEAWAY_REGEX);
      if (s.speaker === "TAKEAWAY" || takeawayMatch) {
        const icon = takeawayMatch?.[1] || "🧠";
        const title = takeawayMatch?.[2] || "One-Line Takeaway for Learners";
        const actualContent = takeawayMatch 
          ? s.content.replace(TAKEAWAY_REGEX, "").trim()
          : s.content;
        return {
          id: generateId(),
          speaker: "TAKEAWAY",
          content: actualContent,
          type: "takeaway" as const,
          takeawayIcon: icon,
          takeawayTitle: title,
        };
      }
      return {
        id: generateId(),
        speaker: s.speaker,
        content: s.content,
        type: "message" as const,
      };
    })
    .filter((m) => m.speaker.trim() && m.content.trim());
};

// Use a special marker to preserve newlines within messages during serialization
const NEWLINE_MARKER = "<<<NEWLINE>>>";

const serializeMessages = (messages: ChatMessage[], explanation: string): string => {
  // Join messages with double newline, but encode internal newlines first
  const chatPart = messages.map((m) => {
    // Handle takeaway blocks
    if (m.type === "takeaway") {
      const icon = m.takeawayIcon || "🧠";
      const title = m.takeawayTitle || "One-Line Takeaway for Learners";
      const encodedContent = m.content.replace(/\n/g, NEWLINE_MARKER);
      return `TAKEAWAY: [TAKEAWAY:${icon}:${title}]: ${encodedContent}`;
    }
    // Replace internal newlines with marker to preserve them
    const encodedContent = m.content.replace(/\n/g, NEWLINE_MARKER);
    return `${m.speaker}: ${encodedContent}`;
  }).join("\n\n");
  
  // Restore internal newlines
  const decodedChatPart = chatPart.replace(new RegExp(NEWLINE_MARKER, "g"), "\n");
  
  if (explanation.trim()) {
    return `${decodedChatPart}\n---\n${explanation.trim()}`;
  }
  return decodedChatPart;
};

interface Course {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface InsertBetweenButtonProps {
  onInsertMessage: () => void;
  onInsertTakeaway: () => void;
  courseCharacterName: string;
  mentorName: string;
}

const InsertBetweenButton = ({
  onInsertMessage,
  onInsertTakeaway,
  courseCharacterName,
  mentorName,
}: InsertBetweenButtonProps) => {
  return (
    <div className="flex justify-center py-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity group/insert">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 bg-muted/50 hover:bg-primary/10 border border-transparent hover:border-primary/30"
          >
            <Plus className="w-3 h-3 text-muted-foreground group-hover/insert:text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48 bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem onClick={onInsertMessage} className="cursor-pointer">
            <MessageCircle className="w-4 h-4 mr-2" />
            <span>Message</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onInsertTakeaway} className="cursor-pointer">
            <Lightbulb className="w-4 h-4 mr-2" />
            <span>Takeaway Block</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface MessageItemProps {
  message: ChatMessage;
  character: CourseCharacter;
  isMentor: boolean;
  isEditing: boolean;
  onEdit: (id: string, content: string, title?: string, icon?: string) => void;
  onStartEdit: (id: string | null) => void;
  onEndEdit: () => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onConvertToTakeaway: (id: string) => void;
  onConvertToMessage: (id: string) => void;
  isEditMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  codeTheme?: string;
}

const SortableMessageItem = ({
  message,
  character,
  isMentor,
  isEditing,
  onEdit,
  onStartEdit,
  onEndEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onConvertToTakeaway,
  onConvertToMessage,
  isEditMode,
  isFirst,
  isLast,
  codeTheme,
}: MessageItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isTakeaway = message.type === "takeaway";

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {isEditMode && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            isTakeaway ? "left-2" : isMentor ? "left-2" : "right-2"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onStartEdit(message.id)}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          {isTakeaway ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onConvertToMessage(message.id)}
              title="Convert to message"
            >
              <MessageCircle className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onConvertToTakeaway(message.id)}
              title="Convert to takeaway"
            >
              <Lightbulb className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(message.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
      {isTakeaway ? (
        <TakeawayBlock
          message={message}
          isEditing={isEditing}
          onEdit={onEdit}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
        />
      ) : (
        <ChatBubble
          message={message}
          character={character}
          isMentor={isMentor}
          isEditing={isEditing}
          onEdit={onEdit}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          codeTheme={codeTheme}
        />
      )}
    </div>
  );
};

const ChatStyleEditor = ({
  value,
  onChange,
  courseType = "python",
  placeholder,
  codeTheme,
}: ChatStyleEditorProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => parseContent(value));
  const [explanation, setExplanation] = useState<string>(() => extractExplanation(value) || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"mentor" | "course">("course");
  const [selectedCourse, setSelectedCourse] = useState(courseType);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [courses, setCourses] = useState<Course[]>([]);
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentorName = "Karan";

  // Fetch courses from database
  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug, icon")
        .order("name");
      
      if (!error && data) {
        setCourses(data);
        // Set first course as default if current selection is not in the list
        if (data.length > 0 && !data.find(c => c.slug === selectedCourse)) {
          setSelectedCourse(data[0].slug);
        }
      }
    };
    fetchCourses();
  }, []);

  // Sync selectedCourse with courseType prop when it changes
  useEffect(() => {
    if (courseType && courses.length > 0) {
      // Find matching course by slug or name
      const matchingCourse = courses.find(
        c => c.slug === courseType || 
             c.name.toLowerCase().replace(/\s+/g, '') === courseType.toLowerCase()
      );
      if (matchingCourse) {
        setSelectedCourse(matchingCourse.slug);
      }
    }
  }, [courseType, courses]);

  // Get course character from fetched courses
  const getCourseCharacter = useCallback((courseSlug: string): CourseCharacter => {
    const course = courses.find(c => c.slug === courseSlug);
    if (course) {
      return {
        name: course.name,
        emoji: course.icon || "📚",
        color: "hsl(var(--foreground))",
        bgColor: "hsl(var(--muted))",
      };
    }
    return {
      name: "Course",
      emoji: "📚",
      color: "hsl(var(--foreground))",
      bgColor: "hsl(var(--muted))",
    };
  }, [courses]);

  const courseCharacter = getCourseCharacter(selectedCourse);

  useEffect(() => {
    const serialized = serializeMessages(messages, explanation);
    if (serialized !== value) {
      onChange(serialized);
    }
  }, [messages, explanation]);

  useEffect(() => {
    const parsed = parseContent(value);
    const parsedExplanation = extractExplanation(value) || "";

    const stripIds = (arr: ChatMessage[]) =>
      arr.map((m) => ({ speaker: m.speaker, content: m.content }));

    if (JSON.stringify(stripIds(parsed)) !== JSON.stringify(stripIds(messages))) {
      setMessages(parsed);
    }
    if (parsedExplanation !== explanation) {
      setExplanation(parsedExplanation);
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

  // handleAddMessage is defined below with manual height reset logic



  const handleInsertCodeSnippet = (language: string = "python") => {
    const codeTemplate = `\`\`\`${language}\n# Your code here\n\n\`\`\``;
    insertAtCursor(codeTemplate, "# Your code here");
  };


  const handleInsertImage = () => {
    insertAtCursor("![Image description](https://example.com/image.png)", "https://example.com/image.png");
  };

  const handleInsertLink = () => {
    insertAtCursor("[Link text](https://example.com)", "https://example.com");
  };

  const handleInsertBold = () => {
    insertAtCursor("**bold text**", "bold text");
  };

  const handleInsertItalic = () => {
    insertAtCursor("*italic text*", "italic text");
  };

  const handleInsertInlineCode = () => {
    insertAtCursor("`code`", "code");
  };

  const handleInsertBulletList = () => {
    insertAtCursor("• Item 1\n• Item 2\n• Item 3", "Item 1");
  };

  const handleInsertNumberedList = () => {
    insertAtCursor("1. Item 1\n2. Item 2\n3. Item 3", "Item 1");
  };

  const handleInsertHeading = () => {
    insertAtCursor("## Heading", "Heading");
  };

  const handleInsertBlockquote = () => {
    insertAtCursor("> Quote text here", "Quote text here");
  };

  const insertAtCursor = (text: string, selectText?: string) => {
    setNewMessage((prev) => prev + (prev ? "\n" : "") + text);
    inputRef.current?.focus();
    // Auto-resize textarea
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 300)}px`;
        
        if (selectText) {
          const cursorPos = inputRef.current.value.lastIndexOf(selectText);
          if (cursorPos !== -1) {
            inputRef.current.setSelectionRange(cursorPos, cursorPos + selectText.length);
          }
        }
      }
    }, 0);
  };

  // Auto-resize textarea on content change, but respect manual resize
  useEffect(() => {
    if (inputRef.current && manualHeight === null) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 400)}px`;
    }
  }, [newMessage, manualHeight]);

  // Track manual resizing
  const handleTextareaMouseUp = useCallback(() => {
    if (inputRef.current) {
      const currentHeight = inputRef.current.offsetHeight;
      const computedHeight = inputRef.current.scrollHeight;
      // If heights differ significantly, user manually resized
      if (Math.abs(currentHeight - computedHeight) > 20 || currentHeight > 80) {
        setManualHeight(currentHeight);
      }
    }
  }, []);

  // Reset manual height when message is sent
  const handleAddMessage = () => {
    if (!newMessage.trim()) return;

    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    const newMsg: ChatMessage = {
      id: generateId(),
      speaker,
      content: newMessage.trim(),
      type: "message",
    };

    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");
    setManualHeight(null); // Reset height after sending
    setCurrentSpeaker((prev) => (prev === "mentor" ? "course" : "mentor"));
    inputRef.current?.focus();
  };

  const handleAddTakeaway = () => {
    const newTakeaway: ChatMessage = {
      id: generateId(),
      speaker: "TAKEAWAY",
      content: "Enter your takeaway content here...",
      type: "takeaway",
      takeawayTitle: "One-Line Takeaway for Learners",
      takeawayIcon: "🧠",
    };
    setMessages((prev) => [...prev, newTakeaway]);
    setEditingId(newTakeaway.id); // Start editing immediately
  };

  // Insert message at a specific position (after given index)
  const handleInsertMessageAt = (afterIndex: number) => {
    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    const newMsg: ChatMessage = {
      id: generateId(),
      speaker,
      content: "New message...",
      type: "message",
    };
    setMessages((prev) => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newMsg);
      return updated;
    });
    setEditingId(newMsg.id);
    setCurrentSpeaker((prev) => (prev === "mentor" ? "course" : "mentor"));
  };

  // Insert takeaway at a specific position (after given index)
  const handleInsertTakeawayAt = (afterIndex: number) => {
    const newTakeaway: ChatMessage = {
      id: generateId(),
      speaker: "TAKEAWAY",
      content: "Enter your takeaway content here...",
      type: "takeaway",
      takeawayTitle: "One-Line Takeaway for Learners",
      takeawayIcon: "🧠",
    };
    setMessages((prev) => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newTakeaway);
      return updated;
    });
    setEditingId(newTakeaway.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends. Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddMessage();
    }
  };

  const handleEditMessage = (id: string, content: string, title?: string, icon?: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          if (m.type === "takeaway") {
            return { 
              ...m, 
              content,
              takeawayTitle: title ?? m.takeawayTitle,
              takeawayIcon: icon ?? m.takeawayIcon,
            };
          }
          return { ...m, content };
        }
        return m;
      })
    );
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // Convert a regular message to takeaway
  const handleConvertToTakeaway = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id && m.type !== "takeaway") {
          return {
            ...m,
            speaker: "TAKEAWAY",
            type: "takeaway" as const,
            takeawayTitle: "Key Takeaway",
            takeawayIcon: "🧠",
          };
        }
        return m;
      })
    );
  };

  // Convert a takeaway back to a regular message
  const handleConvertToMessage = (id: string) => {
    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id && m.type === "takeaway") {
          return {
            ...m,
            speaker,
            type: "message" as const,
            takeawayTitle: undefined,
            takeawayIcon: undefined,
          };
        }
        return m;
      })
    );
  };

  const handleMoveMessage = (id: string, direction: "up" | "down") => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newMessages = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newMessages[index], newMessages[swapIndex]] = [newMessages[swapIndex], newMessages[index]];
      return newMessages;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setMessages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getCharacterForSpeaker = useCallback((speaker: string): CourseCharacter => {
    if (speaker.toLowerCase() === mentorName.toLowerCase()) {
      return MENTOR_CHARACTER;
    }
    // Find matching course by name
    const matchingCourse = courses.find(
      (c) => c.name.toLowerCase() === speaker.toLowerCase()
    );
    if (matchingCourse) {
      return {
        name: matchingCourse.name,
        emoji: matchingCourse.icon || "📚",
        color: "hsl(var(--foreground))",
        bgColor: "hsl(var(--muted))",
      };
    }
    return courseCharacter;
  }, [courses, courseCharacter]);

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
              {courses.map((course) => (
                <SelectItem key={course.slug} value={course.slug}>
                  <span className="flex items-center gap-2">
                    {renderCourseIcon(course.icon, 14)}
                    <span>{course.name}</span>
                  </span>
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
          "min-h-[450px] max-h-[600px]"
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={messages.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    <SortableMessageItem
                      message={message}
                      character={getCharacterForSpeaker(message.speaker)}
                      isMentor={isMentor(message.speaker)}
                      isEditing={editingId === message.id}
                      onEdit={handleEditMessage}
                      onStartEdit={setEditingId}
                      onEndEdit={() => setEditingId(null)}
                      onDelete={handleDeleteMessage}
                      onMoveUp={() => handleMoveMessage(message.id, "up")}
                      onMoveDown={() => handleMoveMessage(message.id, "down")}
                      onConvertToTakeaway={handleConvertToTakeaway}
                      onConvertToMessage={handleConvertToMessage}
                      isEditMode={mode === "edit"}
                      isFirst={index === 0}
                      isLast={index === messages.length - 1}
                      codeTheme={codeTheme}
                    />
                    {/* Insert between button - show after every bubble in edit mode */}
                    {mode === "edit" && (
                      <InsertBetweenButton
                        onInsertMessage={() => handleInsertMessageAt(index)}
                        onInsertTakeaway={() => handleInsertTakeawayAt(index)}
                        courseCharacterName={courseCharacter.name}
                        mentorName={mentorName}
                      />
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
                  "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                  currentSpeaker === "course"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {renderCourseIcon(courseCharacter.emoji, 14)} {courseCharacter.name}
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
                onMouseUp={handleTextareaMouseUp}
                placeholder={`Type a message as ${
                  currentSpeaker === "mentor" ? mentorName : courseCharacter.name
                }...`}
                className={cn(
                  "w-full px-4 py-3 pr-8 rounded-2xl border border-border bg-background",
                  "resize-y min-h-[80px] max-h-[400px] text-sm overflow-y-auto",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                  "placeholder:text-muted-foreground/60 transition-colors duration-200"
                )}
                style={manualHeight ? { height: `${manualHeight}px` } : undefined}
                rows={3}
              />
              <div className="absolute bottom-2 left-4 text-[10px] text-muted-foreground/50">
                Enter to send • Shift+Enter for new line
              </div>
              {/* Resize indicator */}
              <div className="absolute bottom-1 right-1 pointer-events-none text-muted-foreground/30">
                <GripVertical className="w-4 h-4 rotate-45" />
              </div>
            </div>
            
            {/* Insert options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 w-12 rounded-full p-0 shadow-md",
                    "border-border hover:bg-muted",
                    "transition-all duration-200 hover:scale-105"
                  )}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover border border-border shadow-lg z-50">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Code className="w-4 h-4 mr-2" />
                    Code Block
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="bg-popover border border-border shadow-lg z-50">
                      {CODE_LANGUAGES.map((lang) => (
                        <DropdownMenuItem
                          key={lang.value}
                          onClick={() => handleInsertCodeSnippet(lang.value)}
                          className="cursor-pointer"
                        >
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddTakeaway} className="cursor-pointer">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Takeaway Block
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleInsertImage} className="cursor-pointer">
                  <Image className="w-4 h-4 mr-2" />
                  Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertLink} className="cursor-pointer">
                  <Link className="w-4 h-4 mr-2" />
                  Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertBold} className="cursor-pointer">
                  <Bold className="w-4 h-4 mr-2" />
                  Bold Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertItalic} className="cursor-pointer">
                  <Italic className="w-4 h-4 mr-2" />
                  Italic Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertInlineCode} className="cursor-pointer">
                  <Terminal className="w-4 h-4 mr-2" />
                  Inline Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertBulletList} className="cursor-pointer">
                  <List className="w-4 h-4 mr-2" />
                  Bullet List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertNumberedList} className="cursor-pointer">
                  <ListOrdered className="w-4 h-4 mr-2" />
                  Numbered List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertHeading} className="cursor-pointer">
                  <Heading2 className="w-4 h-4 mr-2" />
                  Heading
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertBlockquote} className="cursor-pointer">
                  <Quote className="w-4 h-4 mr-2" />
                  Blockquote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Send button */}
            <Button
              onClick={handleAddMessage}
              disabled={!newMessage.trim()}
              className={cn(
                "h-12 w-12 rounded-full p-0 shadow-lg",
                "bg-[hsl(210,100%,52%)] hover:bg-[hsl(210,100%,45%)]",
                "transition-all duration-200 hover:scale-105"
              )}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Explanation section */}
      <div className="border-t border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Explanation (appears after chat)</span>
        </div>
        {mode === "edit" ? (
          <RichTextEditor
            value={explanation}
            onChange={setExplanation}
            placeholder="Add an explanation or summary of the conversation... (optional)"
          />
        ) : (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg border border-border bg-background min-h-[100px]"
            dangerouslySetInnerHTML={{ __html: explanation || "<p class='text-muted-foreground'>No explanation added</p>" }}
          />
        )}
        <p className="text-xs text-muted-foreground mt-2">
          This text will appear below the chat conversation as an explanation section.
        </p>
      </div>

      <style>{`
        .chat-style-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default ChatStyleEditor;
