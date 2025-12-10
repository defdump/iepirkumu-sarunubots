import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: Date;
}

interface TenderChatProps {
  onDocumentsUsed?: (documents: string[]) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tender-chat`;

// Parse cited sources from the AI response
const parseCitedSources = (content: string): string[] => {
  const sources: string[] = [];
  
  // Match patterns like "Avots: Nolikums" or "Avoti: Nolikums; Tehniskā specifikācija"
  const sourceMatch = content.match(/Avot[si]?:\s*([^\n]+)/i);
  if (sourceMatch) {
    const sourceText = sourceMatch[1];
    // Split by common separators and clean up
    const parts = sourceText.split(/[;,]/).map(s => s.trim());
    
    for (const part of parts) {
      // Extract document name (before any comma or additional details)
      const docName = part.split(',')[0].trim();
      if (docName) {
        // Map common variations to standard names
        if (docName.toLowerCase().includes('nolikum')) sources.push('Nolikums');
        else if (docName.toLowerCase().includes('tehnisk')) sources.push('Tehniskā specifikācija');
        else if (docName.toLowerCase().includes('līgum')) sources.push('Līguma projekts');
        else if (docName.toLowerCase().includes('finanšu')) sources.push('Finanšu piedāvājumu apkopojums');
        else if (docName.toLowerCase().includes('esošā')) sources.push('Esošās situācijas procesu apraksts');
        else if (docName.toLowerCase().includes('noslēgum')) sources.push('Noslēguma ziņojums');
        else sources.push(docName);
      }
    }
  }
  
  return [...new Set(sources)]; // Remove duplicates
};

export function TenderChat({ onDocumentsUsed }: TenderChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "assistant",
      content: "Ko vēlies zināt par šo iepirkumu?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 0);

    const conversationHistory = messages
      .filter((m) => m.id !== "greeting")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    conversationHistory.push({ role: "user", content: userMessage.content });

    let assistantContent = "";
    let reasoning = "";
    let usedDocuments: string[] = [];
    const assistantId = (Date.now() + 1).toString();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle metadata event (reasoning + used documents)
            if (parsed.type === "metadata") {
              reasoning = parsed.reasoning || "";
              usedDocuments = parsed.usedDocuments || [];
              continue;
            }

            // Handle content delta
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === assistantId) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent, reasoning } : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: assistantContent,
                    reasoning,
                    timestamp: new Date(),
                  },
                ];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final update with reasoning
      if (assistantContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent, reasoning } : m
          )
        );
        
        // Parse cited sources from the response instead of using all context documents
        const citedDocuments = parseCitedSources(assistantContent);
        if (citedDocuments.length > 0 && onDocumentsUsed) {
          onDocumentsUsed(citedDocuments);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "Atvainojiet, radās kļūda. Lūdzu, mēģiniet vēlreiz.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleReasoning = (id: string) => {
    setExpandedReasoning(expandedReasoning === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-sm">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Iepirkuma Asistents</h2>
          <p className="text-xs text-muted-foreground">RAG ar spriešanu</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              {message.reasoning && (
                <div className="w-full max-w-[85%] mb-2">
                  <button
                    onClick={() => toggleReasoning(message.id)}
                    className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Spriešanas process
                    {expandedReasoning === message.id ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  {expandedReasoning === message.id && (
                    <div className="reasoning-block mt-2 text-amber-800">
                      {message.reasoning}
                    </div>
                  )}
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%]",
                  message.role === "user"
                    ? "chat-bubble-user"
                    : "chat-bubble-assistant"
                )}
              >
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {message.timestamp.toLocaleTimeString("lv-LV", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-start">
              <div className="chat-bubble-assistant">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-muted-foreground">Domāju...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Gaidu atbildi..." : "Uzdodiet jautājumu par iepirkumu..."}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
