import { TenderChat } from "@/components/TenderChat";
import { TenderDetails } from "@/components/TenderDetails";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex">
        {/* Chat Panel - Left Side */}
        <div className="w-[400px] shrink-0 border-r border-border p-4">
          <TenderChat />
        </div>

        {/* Tender Details - Right Side */}
        <div className="flex-1 p-6 overflow-hidden">
          <TenderDetails />
        </div>
      </div>
    </div>
  );
};

export default Index;
