import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENDER_CONTEXT = `
Tu esi ekspertu asistents, kas palīdz analizēt iepirkumu "BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana".

IEPIRKUMA INFORMĀCIJA:

Nosaukums: BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana
Identifikācijas Nr.: FM VID 2023/176/ANM (arī FM VID 2024/232/ANM pēc grozījumiem)
Pasūtītājs: Valsts ieņēmumu dienests (VID)
Adrese: Talejas iela 1, Rīga, LV-1978
Kontakti: vid@vid.gov.lv, +371 67122689
Statuss: Noslēdzies
Publicēts: 22.05.2024
Piedāvājumu iesniegšanas termiņš: 16.07.2024 13:00

PAR BAXE SISTĒMU:
BAXE (Baltic X-ray Exchange) ir Baltijas valstu (Latvija, Lietuva, Igaunija) muitas iestāžu kopīga sistēma rentgena attēlu apmaiņai un analīzei. Sistēma tiek izmantota kravas pārbaudēs uz robežām.

GALVENĀS IEPIRKUMA PRASĪBAS:

1. SISTĒMAS PAPLAŠINĀŠANA:
- Jaunu rentgena iekārtu integrācija
- Autoceļu kontroles punktu pievienošana
- Dzelzceļa kontroles punktu pievienošana
- Attēlu koplietošana starp Baltijas valstīm

2. TEHNISKĀS PRASĪBAS:
- Notikumu izveide un aprakstīšana
- Attēlu koplietošana un konvertēšana starp dažādiem formātiem
- Attēla analīze ar mākslīgo intelektu (AI)
- Vēsturisko un jauno notikumu sasaiste
- Meklēšana, datu atlase un filtrēšana
- Auditācijas funkcionalitāte
- Kļūdu ziņojumu sistēma
- Lietotāju tiesību pārvaldība
- Integrācija ar citām informācijas sistēmām
- Atskaišu ģenerēšana

3. INFRASTRUKTŪRAS PRASĪBAS:
- Serveru un datubāzu prasības
- Drošības prasības (autentifikācija, autorizācija)
- Veiktspējas prasības
- Datu migrēšanas prasības

4. LĪGUMA NOTEIKUMI:
- Garantijas periods: 36 mēneši
- Uzturēšanas pakalpojumi jānodrošina
- SLA (pakalpojumu līmeņa vienošanās) prasības jāievēro

5. FINANSES:
- Piedāvājuma nodrošinājums ir obligāts
- Vērtēšana notiek pēc zemākās cenas principa
- Var tikt izmantots ES fondu finansējums

CPV KODI:
- 72267000: Programmatūras uzturēšanas un labošanas pakalpojumi
- 48800000: Informācijas sistēmas un serveri

PIELIKUMI:
1. pielikums: Pieteikums
2. pielikums: Tehniskā specifikācija (105 lpp.)
2-1. pielikums: Esošās situācijas procesu apraksts
2-2. pielikums: Konceptuāls apraksts (autoceļš)
2-3. pielikums: Konceptuāls apraksts (dzelzceļš)
3. pielikums: Finanšu piedāvājums
4. pielikums: Līguma projekts
5. pielikums: Piedāvājuma nodrošinājuma veidlapa
6. pielikums: Apakšuzņēmēja apliecinājums

Atbildi latviešu valodā. Esi precīzs un balstīies uz iepirkuma dokumentāciju.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
            content: `Tu esi analītisks asistents. Tev jāizanalizē lietotāja jautājums par iepirkumu un jāizdomā, kā uz to atbildēt.
            
Padomā par:
1. Kāda informācija ir nepieciešama, lai atbildētu?
2. Kur šī informācija atrodas dokumentācijā?
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
      throw new Error("Failed to get reasoning");
    }

    const reasoningData = await reasoningResponse.json();
    const reasoning = reasoningData.choices?.[0]?.message?.content || "";

    // Then, get the actual answer
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
            content: TENDER_CONTEXT,
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
