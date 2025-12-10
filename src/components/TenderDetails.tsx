import { useState } from "react";
import { FileText, Download, Sparkles, ExternalLink, Info, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { tenderData } from "@/data/tenderData";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface DatabaseDocument {
  document_name: string;
  chunk_count: number;
  created_at: string;
}

interface TenderDetailsProps {
  highlightedDocuments?: string[];
  onDocumentsChange?: () => void;
}

export function TenderDetails({ highlightedDocuments = [], onDocumentsChange }: TenderDetailsProps) {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data: documents = [], refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<DatabaseDocument[]> => {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('document_name, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by document_name and count chunks
      const docMap = new Map<string, { chunk_count: number; created_at: string }>();
      data?.forEach(chunk => {
        if (!docMap.has(chunk.document_name)) {
          docMap.set(chunk.document_name, { chunk_count: 1, created_at: chunk.created_at });
        } else {
          docMap.get(chunk.document_name)!.chunk_count++;
        }
      });
      
      return Array.from(docMap.entries()).map(([name, info]) => ({
        document_name: name,
        chunk_count: info.chunk_count,
        created_at: info.created_at,
      }));
    },
  });

  const isDocumentHighlighted = (docName: string) => {
    return highlightedDocuments.some((usedDoc) => 
      docName.toLowerCase().includes(usedDoc.toLowerCase()) || 
      usedDoc.toLowerCase().includes(docName.toLowerCase())
    );
  };

  const handleDocumentClick = (docName: string) => {
    setSelectedDocument(docName);
    setViewerOpen(true);
  };

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header */}
      <Card className="border-0 shadow-none bg-card rounded-xl border border-border mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <img
              src={tenderData.organization.logo}
              alt={tenderData.organization.name}
              className="w-16 h-16 rounded-lg object-contain bg-white p-1 border border-border"
            />
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground leading-tight mb-2">
                {tenderData.title}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="tender-badge">{tenderData.type}</span>
                <span className="text-sm text-muted-foreground">
                  Izsludināja:{" "}
                  <a href="#" className="text-primary hover:underline">
                    {tenderData.organization.name}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="w-fit mb-4">
          <TabsTrigger value="overview">Pārskats</TabsTrigger>
          <TabsTrigger value="parts">Daļas</TabsTrigger>
          <TabsTrigger value="participants">Dalībnieki</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Pamata informācija</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Statuss</p>
                    <span className="status-badge status-badge-closed">
                      {tenderData.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Publicēts</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {tenderData.publishedDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Termiņš</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {tenderData.deadline}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Upload */}
            <DocumentUpload onUploadComplete={refetch} />

            {/* Documents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Dokumenti ({documents.length})</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nav apstrādātu dokumentu. Izmantojiet augšupielādi vai "Seed" pogu.
                  </p>
                ) : (
                  documents.map((doc) => (
                    <div 
                      key={doc.document_name} 
                      onClick={() => handleDocumentClick(doc.document_name)}
                      className={cn(
                        "document-card group transition-all duration-300 cursor-pointer hover:bg-accent/50",
                        isDocumentHighlighted(doc.document_name) && "document-highlight"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300",
                        isDocumentHighlighted(doc.document_name) ? "bg-green-500/20" : "bg-primary/10"
                      )}>
                        <FileText className={cn(
                          "w-5 h-5 transition-colors duration-300",
                          isDocumentHighlighted(doc.document_name) ? "text-green-500" : "text-primary"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {doc.document_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.chunk_count} fragmenti • {new Date(doc.created_at).toLocaleDateString('lv-LV')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* CPV Codes */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium">CPV kodi</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tenderData.cpvCodes.map((cpv) => (
                    <div key={cpv.code} className="flex items-start gap-3">
                      <code className="text-sm font-mono bg-secondary px-2 py-0.5 rounded">
                        {cpv.code}
                      </code>
                      <p className="text-sm text-muted-foreground">{cpv.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sources */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium">Avoti</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tenderData.sources.map((source, index) => (
                    <Button key={index} variant="outline" size="sm" asChild>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts" className="mt-0">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Šī sadaļa ir izstrādes procesā</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="mt-0">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Šī sadaļa ir izstrādes procesā</p>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <DocumentViewer 
        documentName={selectedDocument}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
