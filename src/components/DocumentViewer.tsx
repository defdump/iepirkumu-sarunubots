import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentViewerProps {
  documentName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewer({ documentName, open, onOpenChange }: DocumentViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [isHtmlContent, setIsHtmlContent] = useState(false);

  useEffect(() => {
    if (!documentName || !open) {
      setContent("");
      setChunkCount(0);
      setIsHtmlContent(false);
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
          const fullContent = data.map((chunk) => chunk.content).join("\n");
          
          // Check if content contains HTML tags
          const hasHtml = /<[a-z][\s\S]*>/i.test(fullContent);
          setIsHtmlContent(hasHtml);
          setContent(fullContent);
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
            ) : isHtmlContent ? (
              <div 
                className="document-html-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <div className="document-plain-content whitespace-pre-wrap text-sm leading-relaxed">
                {content}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
