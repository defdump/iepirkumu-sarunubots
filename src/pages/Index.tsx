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
    <div className="h-screen overflow-hidden bg-background">
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