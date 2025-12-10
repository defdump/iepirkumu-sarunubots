import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { default as mammoth } from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Strip HTML tags to get plain text for embeddings
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate embedding using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  // Truncate text if too long (max ~8000 tokens, roughly 32000 chars)
  const truncatedText = text.slice(0, 30000);
  
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: truncatedText,
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

// Split HTML into chunks while preserving structure
function splitHtmlIntoChunks(html: string, targetChunkSize: number = 3000): string[] {
  const chunks: string[] = [];
  
  // Split by paragraph tags first
  const parts = html.split(/(<\/p>|<\/li>|<\/tr>|<\/h[1-6]>)/gi);
  
  let currentChunk = "";
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (currentChunk.length + part.length > targetChunkSize && currentChunk.length > 100) {
      chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk += part;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50);
}

// Split plain text into chunks
function splitTextIntoChunks(text: string, targetChunkSize: number = 2000): string[] {
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
  
  return chunks.filter(chunk => chunk.length > 50);
}

// Extract both HTML and plain text from DOCX
async function extractFromDocx(arrayBuffer: ArrayBuffer): Promise<{ html: string; text: string }> {
  try {
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ arrayBuffer }),
      mammoth.extractRawText({ arrayBuffer }),
    ]);
    
    if (htmlResult.messages.length > 0) {
      console.log("Mammoth messages:", htmlResult.messages);
    }
    
    return {
      html: htmlResult.value,
      text: textResult.value,
    };
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
    
    // Extract content based on file type
    let htmlContent = "";
    let textContent = "";
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith(".docx")) {
      const extracted = await extractFromDocx(arrayBuffer);
      htmlContent = extracted.html;
      textContent = extracted.text;
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      textContent = extractTextFromTxt(arrayBuffer);
      htmlContent = textContent; // Plain text doesn't have HTML
    } else {
      throw new Error(`Unsupported file type: ${fileName}. Supported: .docx, .txt, .md`);
    }

    console.log(`Extracted ${htmlContent.length} chars HTML, ${textContent.length} chars text`);

    // For DOCX, chunk the HTML for display, but use text for embeddings
    const isDocx = fileName.endsWith(".docx");
    const displayChunks = isDocx ? splitHtmlIntoChunks(htmlContent) : splitTextIntoChunks(textContent);
    const textChunks = splitTextIntoChunks(textContent);
    
    console.log(`Split into ${displayChunks.length} display chunks, ${textChunks.length} text chunks`);

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
    // Use the smaller of the two chunk arrays to ensure alignment
    const numChunks = Math.min(displayChunks.length, textChunks.length);
    
    const chunksToInsert: Array<{
      document_name: string;
      chunk_index: number;
      content: string;
      metadata: { source: string; total_chunks: number; has_html: boolean };
      embedding: string;
    }> = [];

    for (let i = 0; i < numChunks; i++) {
      console.log(`Generating embedding for chunk ${i + 1}/${numChunks}`);
      
      // Use plain text for embedding generation
      const embedding = await generateEmbedding(textChunks[i], openaiApiKey);
      
      chunksToInsert.push({
        document_name: documentName,
        chunk_index: i,
        content: displayChunks[i], // Store HTML for display
        metadata: { 
          source: "uploaded_document", 
          total_chunks: numChunks,
          has_html: isDocx,
        },
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
        totalCharacters: htmlContent.length,
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
