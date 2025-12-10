import { useState } from "react";
import { TenderChat } from "@/components/TenderChat";
import { TenderDetails } from "@/components/TenderDetails";

const Index = () => {
  const [highlightedDocuments, setHighlightedDocuments] = useState<string[]>([]);

  const handleDocumentsUsed = (documents: string[]) => {
    setHighlightedDocuments(documents);
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedDocuments([]);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex">
        {/* Chat Panel - Left Side */}
        <div className="w-[400px] shrink-0 border-r border-border p-4">
          <TenderChat onDocumentsUsed={handleDocumentsUsed} />
        </div>

        {/* Tender Details - Right Side */}
        <div className="flex-1 p-6 overflow-hidden">
          <TenderDetails highlightedDocuments={highlightedDocuments} />
        </div>
      </div>
    </div>
  );
};

export default Index;
