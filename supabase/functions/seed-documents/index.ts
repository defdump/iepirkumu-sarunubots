import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Document content chunks for the BAXE tender
const documentChunks = [
  // Nolikums - Main tender document
  {
    document_name: "Nolikums",
    chunks: [
      `BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana
      Iepirkuma identifikācijas Nr. FM VID 2024/232/ANM
      Pasūtītājs: Valsts ieņēmumu dienests (VID)
      Adrese: Talejas iela 1, Rīga, LV-1978, Latvija
      Tālrunis: +371 67122689
      E-pasts: vid@vid.gov.lv
      Iepirkuma līguma ietvaros veikto darbu apmaksai var tikt izmantots Eiropas Savienības fondu finansējums.`,
      
      `Piedāvājuma iesniegšanas termiņš: 16.07.2024 plkst. 13:00
      Publicēšanas datums: 22.05.2024
      Statuss: Noslēdzies
      Piedāvājumi jāiesniedz Elektronisko iepirkumu sistēmā (EIS) e-konkursu apakšsistēmā.
      Piedāvājuma derīguma termiņš: 6 mēneši no piedāvājumu atvēršanas datuma.`,
      
      `Pretendentu kvalifikācijas prasības:
      1. Pretendentam jābūt reģistrētam Elektronisko iepirkumu sistēmā (EIS)
      2. Pretendentam jābūt pieredzei līdzīgu projektu īstenošanā
      3. Pretendentam jānodrošina kvalificēti speciālisti
      4. Pretendentam jāiesniedz piedāvājuma nodrošinājums`,
      
      `Piedāvājuma izvēles kritērijs: zemākā cena
      Vērtēšana notiek pēc zemākās cenas principa - uzvar pretendents ar viszemāko kopējo piedāvājuma summu, kas atbilst visām kvalifikācijas prasībām.`,
    ],
  },
  
  // Tehniskā specifikācija
  {
    document_name: "Tehniskā specifikācija",
    chunks: [
      `BAXE (Baltic X-ray Exchange) ir Baltijas valstu muitas iestāžu kopīga sistēma rentgena attēlu apmaiņai un analīzei.
      Sistēma tiek izmantota kravas pārbaudēs uz robežām starp Latviju, Lietuvu un Igauniju.
      BAXE nodrošina rentgena attēlu koplietošanu un konvertēšanu starp dažādiem formātiem.`,
      
      `BAXE komponentes:
      1. Centrālais mezgls (CM) - sistēmas kodols, kas nodrošina datu apmaiņu starp visiem lokālajiem mezgliem
      2. Lokālie mezgli (LM) - atrodas katrā muitas kontroles punktā (MKP)
      3. Rentgena kontroles sistēmas (RKS) - dažādu ražotāju rentgena iekārtas
      4. Attēlu analīzes modulis ar mākslīgo intelektu (AI)`,
      
      `Funkcionālās prasības:
      - Notikumu izveide un aprakstīšana
      - Attēlu koplietošana un konvertēšana starp formātiem (ORF, DICOM, JPEG, PNG)
      - Attēla analīze ar mākslīgo intelektu
      - Vēsturisko un jauno notikumu sasaiste
      - Meklēšana, datu atlase un filtrēšana
      - Auditācijas funkcionalitāte
      - Kļūdu ziņojumu sistēma
      - Lietotāju tiesību pārvaldība
      - Integrācija ar citām informācijas sistēmām
      - Atskaišu ģenerēšana`,
      
      `Infrastruktūras prasības:
      - Serveru un datubāzu prasības
      - Drošības prasības (autentifikācija, autorizācija)
      - Veiktspējas prasības
      - Datu migrēšanas prasības
      - BAXE jānodrošina 99.5% pieejamība`,
      
      `Nefunkcionālās prasības:
      - Prasības saskarnēm un dizainam
      - Prasības veiktspējai - sistēmai jāspēj apstrādāt vismaz 1000 notikumu dienā
      - Prasības uzturamībai
      - Prasības autentifikācijai un autorizācijai
      - Prasības konfigurācijai
      - Prasības datu migrēšanai
      - Prasības drošībai - jāatbilst VDAR un citiem normatīvajiem aktiem`,
    ],
  },
  
  // Esošās situācijas apraksts
  {
    document_name: "Esošās situācijas procesu apraksts",
    chunks: [
      `BAXE uzbūve un arhitektūra:
      Sistēma sastāv no centrālā mezgla un lokālajiem mezgliem.
      Centrālais mezgls atrodas VID serverī Rīgā.
      Lokālie mezgli ir uzstādīti katrā muitas kontroles punktā.
      Datu apmaiņa notiek caur drošu VPN savienojumu.`,
      
      `Esošie muitas kontroles punkti ar BAXE:
      - Terehova MKP (Latvija-Krievija robeža)
      - Grebņeva MKP (Latvija-Krievija robeža)
      - Pāternieki MKP (Latvija-Baltkrievija robeža)
      Plānotie jaunie MKP:
      - Indras MKP
      - Kārsavas MKP
      - Liepājas MKP
      - Ventspils MKP`,
      
      `Loģiskā esošās skanēšanas aparatūras pieslēgšanas shēma:
      RKS -> Lokālais mezgls -> VPN -> Centrālais mezgls -> Lietotāju saskarne
      Atbalstītie rentgena iekārtu ražotāji: Smiths Detection, Nuctech, Rapiscan`,
    ],
  },
  
  // Līguma projekts
  {
    document_name: "Līguma projekts",
    chunks: [
      `Līguma priekšmets:
      1. BAXE paplašināšana un pilnveidošana
      2. BAXE uzturēšana un atbalsta pakalpojumi
      3. BAXE garantijas nodrošināšana (36 mēneši)
      4. BAXE tehnikas piegāde
      5. Apmācības VID darbiniekiem
      6. Standartprogrammatūras licenču piegāde`,
      
      `Garantijas noteikumi:
      - Garantijas periods: 36 mēneši
      - Garantijas ietvaros IZPILDĪTĀJS novērš visas kļūdas bez papildu samaksas
      - Kritisko kļūdu novēršanas laiks: 4 stundas
      - Būtisku kļūdu novēršanas laiks: 24 stundas
      - Nekritisko kļūdu novēršanas laiks: 72 stundas`,
      
      `Uzturēšanas prasības:
      - IZPILDĪTĀJS nodrošina atbalstu darba dienās no 8:00 līdz 17:00
      - Kritiskām kļūdām - 24/7 atbalsts
      - Konsultācijas par tehniskiem jautājumiem
      - Regulāri atjauninājumi un drošības ielāpi`,
      
      `Līguma izpildes termiņi:
      - Paplašināšanas darbu izpildes termiņš: saskaņā ar projekta plānu
      - Uzturēšanas periods: 60 mēneši no līguma noslēgšanas
      - Garantijas periods: 36 mēneši pēc katra darba pieņemšanas`,
    ],
  },
  
  // Finanšu piedāvājumu apkopojums (REĀLI DATI no piedāvājumu atvēršanas protokola)
  {
    document_name: "Finanšu piedāvājumu apkopojums",
    chunks: [
      `PRETENDENTU IESNIEGTO FINANŠU PIEDĀVĀJUMU APKOPOJUMS
      Iepirkums: BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana
      Iepirkuma identifikācijas Nr. FM VID 2024/232/ANM
      Pasūtītājs: Valsts ieņēmumu dienests (reģ. Nr. 90000069281)
      Daļa Nr. 1 - Iepirkums`,
      
      `Iesniegtie piedāvājumi:
      
      Pretendents: Personu apvienība, kas sastāv no SIA "Olnio" un SIA "Armgate"
      Iesniegšanas datums un laiks: 10.10.2024 plkst. 20:22
      Finanšu piedāvājums (cena bez PVN): EUR 2,114,660.00
      
      Personu apvienības dalībnieki:
      - SIA Olnio
      - "Armgate" SIA`,
      
      `Piedāvājumu atvēršanas informācija:
      - Dokumenta avots: Elektronisko iepirkumu sistēmas e-konkursu apakšsistēmas ģenerēts apkopojums
      - Apkopojuma sagatavošanas laiks: 11.10.2024; 14:00
      - Saņemto piedāvājumu skaits: 1
      - Uzvarētājs: Personu apvienība (SIA "Olnio" + SIA "Armgate")
      - Līguma summa bez PVN: EUR 2,114,660.00`,
    ],
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clear existing chunks
    await supabase.from("document_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert all chunks
    const allChunks: Array<{
      document_name: string;
      chunk_index: number;
      content: string;
      metadata: { source: string };
    }> = [];

    for (const doc of documentChunks) {
      for (let i = 0; i < doc.chunks.length; i++) {
        allChunks.push({
          document_name: doc.document_name,
          chunk_index: i,
          content: doc.chunks[i],
          metadata: { source: "tender_documents" },
        });
      }
    }

    const { data, error } = await supabase
      .from("document_chunks")
      .insert(allChunks)
      .select();

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    console.log(`Successfully inserted ${data?.length || 0} document chunks`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Ielādēti ${data?.length || 0} dokumentu fragmenti`,
        chunks: data?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
