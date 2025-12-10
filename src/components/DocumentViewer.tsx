import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentViewerProps {
  documentName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Process text to detect and format common patterns
function formatDocumentContent(text: string): string {
  return text
    // Convert numbered lists (1., 2., etc.) to proper formatting
    .replace(/^(\d+\.)\s+/gm, '\n**$1** ')
    // Convert bullet points
    .replace(/^[-•]\s+/gm, '\n• ')
    // Add spacing before section headers (ALL CAPS lines)
    .replace(/^([A-ZĀČĒĢĪĶĻŅŌŖŠŪŽ][A-ZĀČĒĢĪĶĻŅŌŖŠŪŽ\s\d.,()-]{10,})$/gm, '\n\n### $1\n')
    // Format table-like structures with pipes
    .replace(/\|/g, ' │ ')
    // Clean up excessive whitespace
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function DocumentViewer({ documentName, open, onOpenChange }: DocumentViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);

  useEffect(() => {
    if (!documentName || !open) {
      setContent("");
      setChunkCount(0);
      return;
    }

    const fetchDocumentContent = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("document_chunks")
          .select("content, chunk_index")
          .eq("document_name", documentName)
          .order("chunk_index", { ascending: true });

        if (error) {
          console.error("Error fetching document:", error);
          setContent("Kļūda ielādējot dokumentu.");
          return;
        }

        if (data && data.length > 0) {
          setChunkCount(data.length);
          const fullContent = data.map((chunk) => chunk.content).join("\n\n");
          setContent(formatDocumentContent(fullContent));
        } else {
          setContent("Dokuments nav atrasts.");
        }
      } catch (e) {
        console.error("Fetch error:", e);
        setContent("Kļūda ielādējot dokumentu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentContent();
  }, [documentName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{documentName || "Dokuments"}</h2>
              {chunkCount > 0 && (
                <p className="text-xs text-muted-foreground">{chunkCount} fragmenti</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-8 py-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Ielādē dokumentu...</p>
              </div>
            ) : (
              <div className="document-content">
                {content.split('\n').map((line, index) => {
                  // Handle headers (### prefix)
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={index} className="text-sm font-bold text-foreground mt-6 mb-3 uppercase tracking-wide border-b border-border/50 pb-2">
                        {line.replace('### ', '')}
                      </h3>
                    );
                  }
                  
                  // Handle bold text markers
                  if (line.includes('**')) {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={index} className="text-sm text-foreground/90 leading-relaxed mb-2">
                        {parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  }
                  
                  // Handle bullet points
                  if (line.startsWith('• ')) {
                    return (
                      <p key={index} className="text-sm text-foreground/90 leading-relaxed mb-1 pl-4">
                        <span className="text-primary mr-2">•</span>
                        {line.slice(2)}
                      </p>
                    );
                  }
                  
                  // Handle empty lines
                  if (line.trim() === '') {
                    return <div key={index} className="h-3" />;
                  }
                  
                  // Regular paragraph
                  return (
                    <p key={index} className="text-sm text-foreground/90 leading-relaxed mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
