import { useState } from "react";
import { Database, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function SeedButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-documents");

      if (error) {
        throw new Error(error.message);
      }

      setIsSeeded(true);
      toast({
        title: "Dokumenti ielādēti",
        description: data.message || "Dokumentu fragmenti veiksmīgi saglabāti datubāzē.",
      });
    } catch (error) {
      console.error("Seed error:", error);
      toast({
        title: "Kļūda",
        description: "Neizdevās ielādēt dokumentus. Mēģiniet vēlreiz.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isSeeded ? "outline" : "default"}
      size="sm"
      onClick={handleSeed}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSeeded ? (
        <Check className="w-4 h-4" />
      ) : (
        <Database className="w-4 h-4" />
      )}
      {isLoading ? "Ielādē..." : isSeeded ? "Ielādēts" : "Ielādēt dokumentus"}
    </Button>
  );
}
