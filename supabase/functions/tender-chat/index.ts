import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu esi ekspertu asistents, kas palīdz analizēt iepirkumu "BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana".

IEPIRKUMA PAMATINFORMĀCIJA:
- Nosaukums: BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana
- Identifikācijas Nr.: FM VID 2023/176/ANM (FM VID 2024/232/ANM pēc grozījumiem)
- Pasūtītājs: Valsts ieņēmumu dienests (VID)
- Statuss: Noslēdzies
- Publicēts: 22.05.2024
- Termiņš: 16.07.2024 13:00

Tu atbildi TIKAI latviešu valodā. Balstīies uz dotajiem dokumentu fragmentiem un iepirkuma kontekstu.
Ja informācija nav pieejama dotajos fragmentos, godīgi pasaki, ka šī informācija nav pieejama tavā kontekstā.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the last user message for search
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const searchQuery = lastUserMessage?.content || "";

    console.log("Searching for:", searchQuery);

    // Search for relevant document chunks using full-text search
    const { data: searchResults, error: searchError } = await supabase
      .rpc("search_documents", {
        search_query: searchQuery,
        max_results: 8,
      });

    let contextFromDocuments = "";
    
    if (searchError) {
      console.error("Search error:", searchError);
      // Fallback: get all chunks
      const { data: allChunks } = await supabase
        .from("document_chunks")
        .select("document_name, content")
        .limit(10);
      
      if (allChunks && allChunks.length > 0) {
        contextFromDocuments = allChunks
          .map((chunk) => `[${chunk.document_name}]\n${chunk.content}`)
          .join("\n\n---\n\n");
      }
    } else if (searchResults && searchResults.length > 0) {
      console.log(`Found ${searchResults.length} relevant chunks`);
      contextFromDocuments = searchResults
        .map((result: any) => `[${result.document_name}] (atbilstība: ${(result.rank * 100).toFixed(1)}%)\n${result.content}`)
        .join("\n\n---\n\n");
    } else {
      console.log("No search results, fetching all chunks");
      // If no results, get all chunks
      const { data: allChunks } = await supabase
        .from("document_chunks")
        .select("document_name, content")
        .limit(15);
      
      if (allChunks && allChunks.length > 0) {
        contextFromDocuments = allChunks
          .map((chunk) => `[${chunk.document_name}]\n${chunk.content}`)
          .join("\n\n---\n\n");
      }
    }

    // First, get reasoning
    const reasoningResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu esi analītisks asistents. Izanalizē lietotāja jautājumu par iepirkumu un padomā, kā uz to atbildēt.

Pieejamie dokumentu fragmenti:
${contextFromDocuments}

Padomā par:
1. Vai dotajos fragmentos ir atbilde uz jautājumu?
2. Kura dokumenta informācija ir visnoderīgākā?
3. Kāda ir labākā pieeja atbildei?

Atbildi īsi, 2-3 teikumos latviešu valodā.`,
          },
          ...messages,
        ],
      }),
    });

    if (!reasoningResponse.ok) {
      const errorText = await reasoningResponse.text();
      console.error("Reasoning error:", errorText);
    }

    const reasoningData = await reasoningResponse.json();
    const reasoning = reasoningData.choices?.[0]?.message?.content || "";

    // Then, get the actual answer with context
    const answerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}

PIEEJAMIE DOKUMENTU FRAGMENTI:
${contextFromDocuments || "Nav pieejami dokumentu fragmenti. Atbildi, ka informācija nav pieejama."}

Izmanto šos fragmentus, lai atbildētu uz lietotāja jautājumiem. Ja informācija nav atrodama fragmentos, godīgi pasaki to.`,
          },
          ...messages,
        ],
      }),
    });

    if (!answerResponse.ok) {
      if (answerResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Pārāk daudz pieprasījumu. Lūdzu, mēģiniet vēlāk." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (answerResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Nepieciešams papildināt kredītus." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await answerResponse.text();
      console.error("Answer error:", errorText);
      throw new Error("Failed to get answer");
    }

    const answerData = await answerResponse.json();
    const content = answerData.choices?.[0]?.message?.content || "Atvainojiet, nevarēju sagatavot atbildi.";

    return new Response(
      JSON.stringify({ content, reasoning }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Nezināma kļūda" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
