import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2 } from "lucide-react";

interface DocumentViewerProps {
  documentName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewer({ documentName, open, onOpenChange }: DocumentViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!documentName || !open) {
      setContent("");
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
          const fullContent = data.map((chunk) => chunk.content).join("\n\n");
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
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {documentName || "Dokuments"}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="pr-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {content}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
