import { FileText, Download, Sparkles, ExternalLink, Info, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { tenderData } from "@/data/tenderData";
import { SeedButton } from "@/components/SeedButton";
import { cn } from "@/lib/utils";

// Map database document names to UI document names
const documentNameMap: Record<string, string[]> = {
  "Nolikums": ["Nolikums_Groz"],
  "Tehniskā specifikācija": ["2.pielikums_Tehniskā specifikācija_Groz"],
  "Esošās situācijas procesu apraksts": ["2.pielikums_Tehniskā specifikācija_Groz"],
  "Līguma projekts": ["Nolikums_Groz"],
  "Finanšu piedāvājumu apkopojums": [
    "Iepirkuma Nr. FM VID 2023/176/ANM finanšu piedāvājumu apkopojums",
    "3.pielikums_Finanšu piedāvājums_Groz"
  ],
  "Noslēguma ziņojums": ["Noslēguma ziņojums"],
};

interface TenderDetailsProps {
  highlightedDocuments?: string[];
}

export function TenderDetails({ highlightedDocuments = [] }: TenderDetailsProps) {
  const isDocumentHighlighted = (docName: string) => {
    return highlightedDocuments.some((usedDoc) => {
      const mappedNames = documentNameMap[usedDoc] || [];
      return mappedNames.some((mapped) => docName.includes(mapped) || mapped.includes(docName));
    });
  };

  return (
    <div className="flex flex-col h-full">
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
            <SeedButton />
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

            {/* Documents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Dokumenti</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {tenderData.documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className={cn(
                      "document-card group transition-all duration-300",
                      isDocumentHighlighted(doc.name) && "document-highlight"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300",
                      isDocumentHighlighted(doc.name) ? "bg-green-500/20" : "bg-primary/10"
                    )}>
                      <FileText className={cn(
                        "w-5 h-5 transition-colors duration-300",
                        isDocumentHighlighted(doc.name) ? "text-green-500" : "text-primary"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.filename}
                        {doc.size && ` • ${doc.size}`}
                        {` • ${doc.date}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Sparkles className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
