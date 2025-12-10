import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  onUploadComplete?: () => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill document name from file name (without extension)
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setDocumentName(nameWithoutExt);
      setUploadStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Nav izvēlēts fails",
        description: "Lūdzu izvēlieties dokumentu augšupielādei",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus("idle");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentName", documentName || file.name);
      formData.append("replaceExisting", replaceExisting.toString());

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadStatus("success");
      setStatusMessage(data.message);
      toast({
        title: "Dokuments augšupielādēts",
        description: data.message,
      });

      // Reset form
      setFile(null);
      setDocumentName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Nezināma kļūda");
      toast({
        title: "Augšupielādes kļūda",
        description: error instanceof Error ? error.message : "Nezināma kļūda",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Upload className="h-4 w-4" />
        <span>Augšupielādēt dokumentu</span>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="file-upload" className="text-xs text-muted-foreground">
            Fails (.docx, .txt, .md)
          </Label>
          <Input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept=".docx,.txt,.md"
            onChange={handleFileChange}
            className="mt-1 text-sm"
          />
        </div>

        {file && (
          <>
            <div>
              <Label htmlFor="doc-name" className="text-xs text-muted-foreground">
                Dokumenta nosaukums
              </Label>
              <Input
                id="doc-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Ievadiet dokumenta nosaukumu"
                className="mt-1 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="replace"
                checked={replaceExisting}
                onCheckedChange={(checked) => setReplaceExisting(checked === true)}
              />
              <Label htmlFor="replace" className="text-xs text-muted-foreground">
                Aizstāt esošo dokumentu ar tādu pašu nosaukumu
              </Label>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          </>
        )}

        {uploadStatus === "success" && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>{statusMessage}</span>
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{statusMessage}</span>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
          size="sm"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Apstrādā...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Augšupielādēt un apstrādāt
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
