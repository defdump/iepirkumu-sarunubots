import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { default as mammoth } from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate embedding using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Embedding API error:", error);
    throw new Error(`Embedding API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Split text into chunks of approximately target size
function splitIntoChunks(text: string, targetChunkSize: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > targetChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
}

// Extract HTML from DOCX using mammoth (preserves formatting)
async function extractHtmlFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    if (result.messages.length > 0) {
      console.log("Mammoth messages:", result.messages);
    }
    return result.value;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract content from DOCX");
  }
}

// Simple text extraction for plain text files
function extractTextFromTxt(arrayBuffer: ArrayBuffer): string {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(arrayBuffer);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentName = formData.get("documentName") as string || file.name;
    const replaceExisting = formData.get("replaceExisting") === "true";

    if (!file) {
      throw new Error("No file provided");
    }

    console.log(`Processing document: ${documentName} (${file.size} bytes, type: ${file.type})`);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text based on file type
    let fullText = "";
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith(".docx")) {
      fullText = await extractHtmlFromDocx(arrayBuffer);
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      fullText = extractTextFromTxt(arrayBuffer);
    } else {
      throw new Error(`Unsupported file type: ${fileName}. Supported: .docx, .txt, .md`);
    }

    console.log(`Extracted ${fullText.length} characters of text`);

    // Split into chunks
    const textChunks = splitIntoChunks(fullText);
    console.log(`Split into ${textChunks.length} chunks`);

    // Delete existing chunks for this document if replacing
    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from("document_chunks")
        .delete()
        .eq("document_name", documentName);
      
      if (deleteError) {
        console.error("Delete error:", deleteError);
      } else {
        console.log(`Deleted existing chunks for: ${documentName}`);
      }
    }

    // Process chunks and generate embeddings
    const chunksToInsert: Array<{
      document_name: string;
      chunk_index: number;
      content: string;
      metadata: { source: string; total_chunks: number };
      embedding: string;
    }> = [];

    for (let i = 0; i < textChunks.length; i++) {
      console.log(`Generating embedding for chunk ${i + 1}/${textChunks.length}`);
      
      const embedding = await generateEmbedding(textChunks[i], openaiApiKey);
      
      chunksToInsert.push({
        document_name: documentName,
        chunk_index: i,
        content: textChunks[i],
        metadata: { source: "uploaded_document", total_chunks: textChunks.length },
        embedding: JSON.stringify(embedding),
      });
    }

    // Insert all chunks
    const { data, error } = await supabase
      .from("document_chunks")
      .insert(chunksToInsert)
      .select();

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    console.log(`Successfully inserted ${data?.length || 0} chunks for ${documentName}`);

    return new Response(
      JSON.stringify({
        success: true,
        documentName,
        chunksCreated: data?.length || 0,
        totalCharacters: fullText.length,
        message: `Dokuments "${documentName}" veiksmīgi apstrādāts ar ${data?.length || 0} fragmentiem`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
