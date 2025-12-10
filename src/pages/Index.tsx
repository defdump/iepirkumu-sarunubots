import { useState, useEffect } from "react";
import { TenderChat } from "@/components/TenderChat";
import { TenderDetails } from "@/components/TenderDetails";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SEED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-documents`;
const EXPECTED_DOCUMENTS = ["Nolikums", "Tehniskā specifikācija", "Esošās situācijas procesu apraksts", "Līguma projekts", "Finanšu piedāvājums", "Finanšu piedāvājumu apkopojums"];

const Index = () => {
  const [highlightedDocuments, setHighlightedDocuments] = useState<string[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [documentsReady, setDocumentsReady] = useState(false);
  const { toast } = useToast();

  // Check and seed documents on page load
  useEffect(() => {
    const checkAndSeedDocuments = async () => {
      try {
        // Get distinct document names from database
        const { data, error } = await supabase
          .from("document_chunks")
          .select("document_name");

        if (error) {
          console.error("Error checking documents:", error);
          setDocumentsReady(true);
          return;
        }

        // Get unique document names
        const existingDocs = [...new Set(data?.map(d => d.document_name) || [])];
        console.log("Existing documents:", existingDocs);

        // Check if base documents exist (at least 4 of the expected 6)
        const baseDocsPresent = EXPECTED_DOCUMENTS.filter(doc => 
          existingDocs.some(existing => existing.toLowerCase().includes(doc.toLowerCase().split(" ")[0]))
        );

        if (baseDocsPresent.length < 4) {
          console.log("Base documents missing, seeding...");
          setIsSeeding(true);
          
          toast({
            title: "Ielādē dokumentus",
            description: "Lūdzu uzgaidiet, tiek ielādēti pamata dokumenti...",
          });

          const response = await fetch(SEED_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          });

          const result = await response.json();

          if (response.ok) {
            toast({
              title: "Dokumenti ielādēti",
              description: result.message || "Pamata dokumenti ir gatavi.",
            });
          } else {
            toast({
              title: "Kļūda",
              description: result.error || "Neizdevās ielādēt dokumentus.",
              variant: "destructive",
            });
          }
          
          setIsSeeding(false);
        }
        
        setDocumentsReady(true);
      } catch (error) {
        console.error("Seed check error:", error);
        setDocumentsReady(true);
        setIsSeeding(false);
      }
    };

    checkAndSeedDocuments();
  }, [toast]);

  const handleDocumentsUsed = (documents: string[]) => {
    setHighlightedDocuments(documents);
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedDocuments([]);
    }, 3000);
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      {isSeeding && (
        <div className="absolute inset-0 bg-background/80 z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Ielādē pamata dokumentus...</p>
          </div>
        </div>
      )}
      <div className="h-full flex">
        {/* Chat Panel - Left Side */}
        <div className="w-[400px] shrink-0 border-r border-border p-4 h-full overflow-hidden">
          <TenderChat onDocumentsUsed={handleDocumentsUsed} />
        </div>

        {/* Tender Details - Right Side */}
        <div className="flex-1 p-6 h-full overflow-auto">
          <TenderDetails highlightedDocuments={highlightedDocuments} />
        </div>
      </div>
    </div>
  );
};

export default Index;