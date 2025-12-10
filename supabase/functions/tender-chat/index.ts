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
Ja informācija nav pieejama dotajos fragmentos, godīgi pasaki, ka šī informācija nav pieejama tavā kontekstā.

SVARĪGI - AVOTU NORĀDĪŠANA:
Katras atbildes beigās OBLIGĀTI norādi avotus, ja izmantoji informāciju no dokumentiem.
Formāts: "Avots: [Dokumenta nosaukums], [konkrēta sadaļa/punkts ja zināms]"
Piemēri:
- "Avots: Nolikums, 3. nodaļa"
- "Avots: Tehniskā specifikācija, prasības infrastruktūrai"
- "Avots: Finanšu piedāvājumu apkopojums"
- "Avots: Līguma projekts, garantijas noteikumi"
Ja izmantoji vairākus dokumentus, norādi visus: "Avoti: Nolikums; Tehniskā specifikācija"
Ja neatradi informāciju dokumentos, neraksti avotu.`;

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

    let contextFromDocuments = "";
    let relevantChunks: any[] = [];

    // Generate embedding for the search query
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (OPENAI_API_KEY && searchQuery) {
      try {
        console.log("Generating query embedding...");
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: searchQuery,
            dimensions: 768,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data[0].embedding;

          // Use semantic search with the match_documents function
          const { data: semanticResults, error: semanticError } = await supabase.rpc(
            "match_documents",
            {
              query_embedding: JSON.stringify(queryEmbedding),
              match_threshold: 0.3,
              match_count: 10,
            }
          );

          if (semanticError) {
            console.error("Semantic search error:", semanticError);
          } else if (semanticResults && semanticResults.length > 0) {
            console.log(`Semantic search found ${semanticResults.length} chunks`);
            relevantChunks = semanticResults.map((r: any) => ({
              document_name: r.document_name,
              content: r.content,
              similarity: r.similarity,
            }));
          }
        } else {
          console.error("Embedding API error:", await embeddingResponse.text());
        }
      } catch (e) {
        console.error("Embedding exception:", e);
      }
    }

    // Fallback: get chunks from ALL documents if semantic search didn't work
    if (relevantChunks.length === 0) {
      console.log("Semantic search unavailable, fetching chunks from all documents");
      
      // Get chunks from each document to ensure coverage
      const { data: allChunks, error: allError } = await supabase
        .from("document_chunks")
        .select("document_name, content, chunk_index")
        .order("chunk_index", { ascending: true })
        .limit(150); // Increased limit to get all ~104 chunks

      if (allError) {
        console.error("All chunks error:", allError);
      } else if (allChunks) {
        console.log(`Fetched ${allChunks.length} total chunks`);
        
        // Log which documents we got
        const docCounts = allChunks.reduce((acc: Record<string, number>, chunk) => {
          acc[chunk.document_name] = (acc[chunk.document_name] || 0) + 1;
          return acc;
        }, {});
        console.log("Documents fetched:", JSON.stringify(docCounts));
        
        relevantChunks = allChunks;
      }
    }

    // Build context string and track unique document names
    const usedDocuments: string[] = [];
    if (relevantChunks.length > 0) {
      const uniqueDocs = new Set<string>();
      relevantChunks.forEach((chunk) => uniqueDocs.add(chunk.document_name));
      usedDocuments.push(...Array.from(uniqueDocs));
      
      contextFromDocuments = relevantChunks
        .map((chunk) => `[${chunk.document_name}]\n${chunk.content}`)
        .join("\n\n---\n\n");
      console.log(`Context built with ${relevantChunks.length} chunks from documents: ${usedDocuments.join(", ")}`);
    } else {
      console.log("WARNING: No chunks available for context!");
    }

    // First, get reasoning (non-streaming)
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

Pieejamie dokumentu fragmenti (${relevantChunks.length} fragmenti):
${contextFromDocuments || "Nav pieejami fragmenti."}

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

    let reasoning = "";
    if (reasoningResponse.ok) {
      const reasoningData = await reasoningResponse.json();
      reasoning = reasoningData.choices?.[0]?.message?.content || "";
    } else {
      console.error("Reasoning error:", await reasoningResponse.text());
    }

    // Stream the actual answer
    const answerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}

PIEEJAMIE DOKUMENTU FRAGMENTI (${relevantChunks.length} fragmenti):
${contextFromDocuments || "Nav pieejami dokumentu fragmenti."}

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

    // Create a custom stream that prepends reasoning and used documents
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send metadata first (reasoning + used documents)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: "metadata", 
          reasoning: reasoning || "",
          usedDocuments: usedDocuments 
        })}\n\n`));

        // Forward the AI stream
        const reader = answerResponse.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Nezināma kļūda" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
