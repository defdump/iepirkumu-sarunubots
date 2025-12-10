import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Document content chunks for the BAXE tender - REAL DATA from parsed documents
const documentChunks = [
  // Nolikums - Main tender document
  {
    document_name: "Nolikums",
    chunks: [
      `ATKLĀTA KONKURSA NOLIKUMS
Iepirkuma identifikācijas Nr. FM VID 2024/232/ANM
"BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana"
APSTIPRINĀTS Valsts ieņēmumu dienesta iepirkuma komisijas 2024. gada 23. augusta sēdē, protokols Nr. 2
Iepirkuma līguma ietvaros veikto darbu apmaksai var tikt izmantots Eiropas Savienības fondu finansējums.`,

      `PASŪTĪTĀJA INFORMĀCIJA:
Valsts ieņēmumu dienests (VID)
NMR kods: 90000069281
Adrese: Talejas iela 1, Rīga, LV-1978, Latvija
Tālrunis: +371 67122689
E-pasts: vid@vid.gov.lv
Tīmekļvietne: www.vid.gov.lv
Pircēja profila adrese: https://www.eis.gov.lv/EKEIS/Supplier/Organizer/498`,

      `NOLIKUMA SATURS UN PIELIKUMI:
1. Vispārīga informācija par atklātu konkursu
2. Informācija par iepirkuma priekšmetu
3. Pretendentu kvalifikācijas prasības un atbilstību apliecinošie dokumenti
4. Piedāvājuma vērtēšana un piedāvājuma izvēles kritērijs
5. Pretendenta izslēgšanas noteikumi

PIELIKUMI:
1. pielikums - PIETEIKUMS uz 4 lp.
2. pielikums - TEHNISKĀ SPECIFIKĀCIJA uz 105 lp.
2-1.pielikums - Esošās situācijas procesu apraksts uz 8 lp.
2-2.pielikums - Konceptuāls apraksts (autoceļš) uz 14 lp.
2-3.pielikums - Konceptuāls apraksts (dzelzceļš) uz 13 lp.
3. pielikums - FINANŠU PIEDĀVĀJUMS uz 12 lp.
4. pielikums - LĪGUMA PROJEKTS uz 77 lp.
5. pielikums - PIEDĀVĀJUMA NODROŠINĀJUMA VEIDLAPA uz 1 lp.
6. pielikums - APAKŠUZŅĒMĒJA APLIECINĀJUMS uz 1 lp.`,

      `PIEDĀVĀJUMA IESNIEGŠANA:
Piedāvājumu iesniegšanas termiņš: 2024. gada 30. septembra plkst. 10.00
Piedāvājumus piegādātāji var iesniegt elektroniski EIS e-konkursu apakšsistēmā.
Piedāvājumu atvēršana: 2024. gada 30. septembra plkst. 14.00
Pretendents – piegādātājs, kurš ir reģistrēts Elektronisko iepirkumu sistēmā (EIS) un ir iesniedzis piedāvājumu EIS e-konkursu apakšsistēmā.`,

      `PRETENDENTU KVALIFIKĀCIJAS PRASĪBAS:
1. Pretendentam jābūt reģistrētam Elektronisko iepirkumu sistēmā (EIS)
2. Pretendentam jābūt pieredzei līdzīgu projektu īstenošanā
3. Pretendentam jānodrošina kvalificēti speciālisti
4. Pretendentam jāiesniedz piedāvājuma nodrošinājums
Piedāvājuma izvēles kritērijs: zemākā cena
Vērtēšana notiek pēc zemākās cenas principa - uzvar pretendents ar viszemāko kopējo piedāvājuma summu.`,
    ],
  },

  // Tehniskā specifikācija
  {
    document_name: "Tehniskā specifikācija",
    chunks: [
      `2. PIELIKUMS - TEHNISKĀ SPECIFIKĀCIJA
Atklātam konkursam "BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana"
Iepirkuma identifikācijas Nr. FM VID 2024/232/ANM
Sagatavošanas datums: 2024. gada 23. augusts
Pieļaujama dokumentā iekļautās informācijas citēšana un izmantošana atvasinātu darbu veidošanai.`,

      `TEHNISKĀS SPECIFIKĀCIJAS SATURA RĀDĪTĀJS:
1. Ievads - Dokumenta nolūks, definīcijas, saistītie dokumenti
2. Vispārīgās prasības - BAXE komponentes, BAXE objekti
3. Funkcionālās prasības:
   - (NK) Prasības notikuma izveidei un aprakstīšanai
   - (BP_1.7.) Attēlu koplietošana un konvertēšana
   - (BP_2) Attēla analīze ar mākslīgo intelektu
   - (NS) Prasības vēsturisko un jauno notikumu sasaistei
   - (NP) Prasības Notikuma pārbaudei
   - (RP) Prasības Notikuma pārvaldībai
   - (MFP) Prasības meklēšanai, datu atlasei un filtrēšanai
   - (AP) Prasības BAXE auditācijai
   - (KZP) Prasības BAXE kļūdu ziņojumiem
   - (ADMP) Prasības BAXE administrēšanai
   - (LTP) Lietotāju tiesību pārvaldība
   - (INP) Prasības integrācijai ar citām IS
   - (ATP) Prasības atskaitēm
   - (DP) Prasības datu plūsmai, apmaiņai un glabāšanai
   - (IDK) Prasības ievadīto datu kontrolēm
   - (CIT) Citas prasības`,

      `4. Infrastruktūras prasības:
   - (IVP) Infrastruktūras vispārīgās prasības
   - (IDP) Infrastruktūras detalizētākās prasības
5. Nefunkcionālās prasības:
   - Prasības saskarnēm un dizainam
   - Prasības BAXE veiktspējai
   - Prasības BAXE uzturamībai
   - Prasības autentifikācijai un autorizācijai
   - Prasības BAXE konfigurācijai
   - Prasības datu migrēšanai
   - Prasības BAXE darbības pārbaudei
   - Prasības BAXE drošībai
   - Prasības datu un dokumentu arhivēšanai
   - Prasības BAXE ieviešanai
6. Organizatoriskās prasības`,

      `BAXE KOMPONENTES:
1. Centrālais mezgls (CM) - sistēmas kodols datu apmaiņai starp visiem lokālajiem mezgliem
2. Lokālie mezgli (LM) - uzstādīti katrā muitas kontroles punktā (MKP)
3. Rentgena kontroles sistēmas (RKS) - dažādu ražotāju rentgena iekārtas
4. Attēlu analīzes modulis ar mākslīgo intelektu (AI)

BAXE (Baltic X-ray Exchange) ir Baltijas valstu muitas iestāžu kopīga sistēma rentgena attēlu apmaiņai un analīzei.
Sistēma tiek izmantota kravas pārbaudēs uz robežām starp Latviju, Lietuvu un Igauniju.
Atbalstītie formāti: ORF, DICOM, JPEG, PNG`,
    ],
  },

  // Esošās situācijas procesu apraksts
  {
    document_name: "Esošās situācijas procesu apraksts",
    chunks: [
      `2-1. PIELIKUMS - ESOŠĀS SITUĀCIJAS PROCESU APRAKSTS
BALTIJAS VALSTU MUITAS RENTGENA KONTROLES SISTĒMAS VIENOTO DATU APMAIŅAS SISTĒMA
Valsts ieņēmumu dienests

Dokumenta mērķis: Apkopot biznesa procesu analīzes, programmatūras un infrastruktūras izpētes rezultātus un definēt augsta līmeņa biznesa prasības nākotnes BAXE risinājumam.

Dokumenta auditorija:
- VID darbinieki, kas saistīti ar BAXE izmantošanu
- Iepirkuma pretendenti`,

      `DEFINĪCIJAS UN SAĪSINĀJUMI:
BAXE - Baltijas valstu kravas rentgeniekārtu attēlu apmaiņas sistēma
MKP - Muitas kontroles punkts
ORF - Neapstrādāts formāts no dažādu ražotāju sistēmām
RKS - Rentgena kontroles sistēma
CM - Centrālais mezgls
LM - Lokālais mezgls`,

      `BAXE UZBŪVE UN ARHITEKTŪRA:
Sistēma sastāv no centrālā mezgla un lokālajiem mezgliem.
Centrālais mezgls atrodas VID serverī Rīgā.
Lokālie mezgli ir uzstādīti katrā muitas kontroles punktā.
Datu apmaiņa notiek caur drošu VPN savienojumu.

Loģiskā shēma: RKS -> Lokālais mezgls -> VPN -> Centrālais mezgls -> Lietotāju saskarne
Atbalstītie rentgena iekārtu ražotāji: Smiths Detection, Nuctech, Rapiscan`,

      `ESOŠIE UN PLĀNOTIE MUITAS KONTROLES PUNKTI:
Esošie MKP ar BAXE:
- Terehova MKP (Latvija-Krievija robeža)
- Grebņeva MKP (Latvija-Krievija robeža)
- Pāternieki MKP (Latvija-Baltkrievija robeža)

Plānotie jaunie MKP:
- Indras MKP
- Kārsavas MKP
- Liepājas MKP
- Ventspils MKP`,
    ],
  },

  // Līguma projekts
  {
    document_name: "Līguma projekts",
    chunks: [
      `4. PIELIKUMS - LĪGUMA PROJEKTS
LĪGUMS Nr. FM VID 2024/232/ANM
"BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana"

PUSES:
Valsts ieņēmumu dienests (VID) - Pasūtītājs
IZPILDĪTĀJS - Konkursa uzvarētājs`,

      `LĪGUMA PRIEKŠMETS (2.1. punkts):
2.1.1. BAXE paplašināšana un pilnveidošana - funkcionalitātes papildināšana un izmaiņu realizācija
2.1.2. BAXE uzturēšana un atbalsta pakalpojumi - konsultācijas, problēmu novēršana, administrēšana, testēšana
2.1.3. BAXE garantijas nodrošināšana saskaņā ar Līguma 9.punktu
2.1.4. BAXE tehnikas piegāde atbilstoši tehniskajām prasībām
2.1.5. Apmācības VID nodarbinātajiem darbam ar BAXE
2.1.6. Pārvaldības standartprogrammatūras licenču piegāde

VID nav saistīts ar visu objektu paplašināšanu - piesaka atbilstoši vajadzībām un finanšu iespējām.`,

      `GARANTIJAS NOTEIKUMI (9. punkts):
Garantijas periods: 36 mēneši
Garantijas ietvaros IZPILDĪTĀJS novērš visas kļūdas bez papildu samaksas

KĻŪDU NOVĒRŠANAS LAIKI:
- Kritiskās kļūdas: 4 stundas
- Būtiskas kļūdas: 24 stundas
- Nekritiskas kļūdas: 72 stundas`,

      `UZTURĒŠANAS PRASĪBAS:
IZPILDĪTĀJS nodrošina atbalstu darba dienās no 8:00 līdz 17:00
Kritiskām kļūdām - 24/7 atbalsts
Konsultācijas par tehniskiem jautājumiem
Regulāri atjauninājumi un drošības ielāpi

LĪGUMA IZPILDES TERMIŅI:
- Paplašināšanas darbu termiņš: saskaņā ar projekta plānu
- Uzturēšanas periods: 60 mēneši no līguma noslēgšanas
- Garantijas periods: 36 mēneši pēc katra darba pieņemšanas`,
    ],
  },

  // Finanšu piedāvājums - DETALIZĒTS
  {
    document_name: "Finanšu piedāvājums",
    chunks: [
      `3. PIELIKUMS - FINANŠU PIEDĀVĀJUMS
Atklātam konkursam "BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana"
Iepirkuma identifikācijas Nr. FM VID 2024/232/ANM

FINANŠU PIEDĀVĀJUMA SADAĻAS:
1. Paplašināšanas izmaksas (1. tabula)
2. Pilnveidošanas, uzturēšanas un garantijas izmaksas (2. tabula - darbietilpības novērtējums)
3. Darbietilpības elementu skaidrojums (3. tabula)`,

      `1. SADAĻA - PAPLAŠINĀŠANAS IZMAKSAS (1. tabula):
Nr. | Pozīcija | Cena EUR bez PVN
1. Centrālā mezgla programmatūras izstrāde*
2. Lokālo mezglu programmatūras izstrāde*
3. Lokālo mezglu ieviešana**:
   3.1. Indras MKP
   3.2. Kārsavas MKP
   3.3. Terehovas MKP
   3.4. Pāternieku MKP
   3.5. Liepājas MKP
   3.6. Ventspils MKP
KOPĀ, EUR bez PVN:

* Programmatūras izstrādes izmaksās jāietver: analīze, programmēšana, dokumentācijas izstrāde, versiju sagatavošana, testēšanas vides izveide, instalācijas pakotņu sagatavošana.
** Lokālo mezglu ieviešanas izmaksās jāietver: uzstādīšana, RKS integrēšana, sākotnējās apmācības.`,

      `2. SADAĻA - DARBIETILPĪBAS NOVĒRTĒJUMA TABULA (2. tabula):
Nr. | Darbietilpības elements | Darbietilpība (cilvēkdienas) | Cilvēkdienas likme | Summa EUR
1. Cilvēkdiena (vidējā svērtā likme)
2. Elements: Forma
   2.1. Viena formas elementa pievienošana/labošana/noņemšana
   2.2. Vienkārša forma (līdz 10 laukiem)
   2.3. Vidēji sarežģīta forma (11-20 lauki)
   2.4. Sarežģīta forma (21-40 lauki)
3. Datu pārbaude, pielasīšana vai atlase
   3.1. Vienkārša datu pārbaude
   3.2. Vidēji sarežģīta datu pārbaude
   3.3. Sarežģīta datu pārbaude
4. Algoritms
   4.1. Vienkāršs algoritms (lineārs, bez zarošanās)
   4.2. Vidēji sarežģīts algoritms (līdz 15 lēmumu zariem)
   4.3. Sarežģīts algoritms (16-30 lēmumu zari)`,

      `2. SADAĻA (turpinājums):
5. Darba plūsma
   5.1. Vienkārša darba plūsma (līdz 10 šķautnēm)
   5.2. Vidēji sarežģīta darba plūsma (11-20 šķautnes)
   5.3. Sarežģīta darba plūsma (21-40 šķautnes)
6. Klasifikators
   6.1. Viena ieraksta pievienošana/labošana/noņemšana
   6.2. Vienkāršs klasifikators (bez hierarhijas, līdz 150 ierakstiem)
   6.3. Vidēji sarežģīts klasifikators (līdz 3 hierarhijas līmeņiem, 151-3000 ieraksti)
   6.4. Sarežģīts klasifikators (virs 3 hierarhijas līmeņiem, >3000 ieraksti)
7. Atskaite/pārskats
   7.1. Viena filtra pievienošana/labošana/noņemšana
   7.2. Vienkārša atskaite
   7.3. Vidēji sarežģīta atskaite
   7.4. Sarežģīta atskaite
8. Datubāzes tabulas pievienošana
   8.1. Viena lauka/relācijas pievienošana/labošana/noņemšana
   8.2. Vienkārši papildinājumi/izmaiņas
   8.3. Vidēji sarežģīti papildinājumi/izmaiņas
   8.4. Sarežģīti papildinājumi/izmaiņas`,

      `3. SADAĻA - DARBIETILPĪBAS ELEMENTU SKAIDROJUMS (3. tabula):

FORMA - Patstāvīga vai apakšforma ar fiksēta skaita ekrāna elementiem (ievadlauks, izvadlauks, radiopoga, izvēles rūtiņa, izkrītošais saraksts).
- Vienkārša forma: līdz 10 laukiem
- Vidēji sarežģīta forma: 11-20 lauki
- Sarežģīta forma: 21-40 lauki

ALGORITMS - Programmatūras vienums datu apstrādei un rezultāta saņemšanai.
- Vienkāršs: lineārs, bez zarošanās un cikliem
- Vidēji sarežģīts: ar zarošanos līdz 15 lēmumu zariem vai līdz 3 cikliem
- Sarežģīts: 16-30 lēmumu zari vai līdz 10 cikliem

DARBA PLŪSMA - Sakārtota notikumu virkne biznesa rezultāta sasniegšanai.
KLASIFIKATORS - Sistematizēts objektu saraksts ar kodiem identifikācijai.

CILVĒKDIENAS LIKME: Vidējā svērtā likme (viena konstanta vērtība uz visiem elementiem). Cilvēkdienas ilgums: 8 darba stundas.`,
    ],
  },

  // Finanšu piedāvājumu apkopojums (REĀLI DATI no atvēršanas protokola)
  {
    document_name: "Finanšu piedāvājumu apkopojums",
    chunks: [
      `PRETENDENTU IESNIEGTO FINANŠU PIEDĀVĀJUMU APKOPOJUMS
Iepirkums: BAXE risinājuma paplašināšana, pilnveidošana, uzturēšana un garantijas nodrošināšana
Iepirkuma identifikācijas Nr. FM VID 2024/232/ANM
Pasūtītājs: Valsts ieņēmumu dienests (reģ. Nr. 90000069281)
Daļa Nr. 1 - Iepirkums`,

      `IESNIEGTIE PIEDĀVĀJUMI:

Pretendents: Personu apvienība, kas sastāv no SIA "Olnio" un SIA "Armgate"
Iesniegšanas datums un laiks: 10.10.2024 plkst. 20:22
Finanšu piedāvājums (cena bez PVN): EUR 2,114,660.00

Personu apvienības dalībnieki:
- SIA Olnio
- "Armgate" SIA`,

      `PIEDĀVĀJUMU ATVĒRŠANAS INFORMĀCIJA:
Dokumenta avots: Elektronisko iepirkumu sistēmas e-konkursu apakšsistēmas ģenerēts apkopojums
Apkopojuma sagatavošanas laiks: 11.10.2024; 14:00
Saņemto piedāvājumu skaits: 1
Uzvarētājs: Personu apvienība (SIA "Olnio" + SIA "Armgate")
Līguma summa bez PVN: EUR 2,114,660.00`,
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
        message: `Ielādēti ${data?.length || 0} dokumentu fragmenti no 6 dokumentiem`,
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
