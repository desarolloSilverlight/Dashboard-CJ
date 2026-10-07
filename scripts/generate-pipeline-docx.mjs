/**
 * Genera docs/COSTOS_PIPELINE_SCRAPING_TRADUCCION.docx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "COSTOS_PIPELINE_SCRAPING_TRADUCCION.docx");

function h1(t) {
  return new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } });
}
function h2(t) {
  return new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } });
}
function p(t, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text: t, ...opts })], spacing: { after: 100 } });
}
function bullet(t) {
  return new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 60 } });
}

function table(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        }),
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((c) => new TableCell({ children: [new Paragraph(String(c))] })),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [headerRow, ...dataRows],
  });
}

const doc = new Document({
  sections: [
    {
      children: [
        h1("Pipeline Temu/Shein → CJ → DeepL — costos"),
        p("Flujo: Apify (Temu o Shein) → match en CJ → inventario (flujo actual) → traducción → tienda."),

        h2("1. Flujo"),
        bullet("Scraping: Apify Temu o Shein — actors VARIABLES hasta elegir el mejor."),
        bullet("Match CJ: listV2 + query (volumen); % match varía por CATEGORÍA."),
        bullet("500 verificados en CJ: solo traducción + publicación (sin re-scrape)."),
        bullet("DeepL con caché para variantes repetidas."),

        h2("2. Precio al cliente — scraping"),
        table(
          ["Productos", "Precio USD", "USD/producto"],
          [
            ["1,000", "$15", "$0.015"],
            ["2,500", "$37.50", "$0.015"],
            ["5,000", "$75", "$0.015"],
            ["10,000", "$150", "$0.015"],
          ],
        ),

        h2("3. DeepL"),
        table(
          ["Concepto", "Detalle"],
          [
            ["Gratis/mes", "500,000 caracteres (API Free)"],
            ["Cobro desde", "Carácter 500,001"],
            ["Plan Pro", "$5.49/mes + $25 por millón de caracteres"],
            ["~400 chars/producto", "~1,250 gratis; ~1,785 con caché 30%"],
          ],
        ),
        table(
          ["Productos", "Sin caché", "Con caché ~30%"],
          [
            ["500 verificados CJ (~400 c/u)", "$0", "$0"],
            ["1,250", "$0", "$0"],
            ["2,500", "~$18", "~$5.49"],
            ["5,000", "~$43", "~$28"],
            ["10,000", "~$93", "~$65"],
          ],
        ),
        p("Si Pro NO descuenta 500k gratis, sumar ~$12.50 desde 2,500 productos.", { italics: true }),

        h2("4. 500 productos verificados en CJ — solo traducción"),
        p("500 × 400 caracteres = 200,000 → dentro de 500,000 gratis/mes → costo DeepL API: $0."),
        table(
          ["Chars/producto", "Total chars", "Costo DeepL (Free/Pro con descuento)"],
          [
            ["400 (base)", "200,000", "$0"],
            ["800", "400,000", "$0"],
            ["1,000", "500,000", "$0 (límite)"],
            ["1,200", "600,000", "~$7.99 si 100k facturables con Pro"],
          ],
        ),
        p("Cobro traducción $0.015/u × 500 = $7.50 ingreso; margen API $7.50 si DeepL $0."),
        p("Para obtener 500 verificados: scrape ≈ 500 / %match categoría (ej. 50% → ~1,000 filas Apify)."),

        h2("5. Match CJ por categoría (% orientativo)"),
        table(
          ["Categoría", "Match %", "Scrape para 500 verificados"],
          [
            ["Hogar / accesorios genérico", "55–70%", "715–910"],
            ["Belleza / gadgets", "45–60%", "833–1,111"],
            ["Moda", "30–50%", "1,000–1,667"],
            ["Electrónica marca", "20–40%", "1,250–2,500"],
          ],
        ),

        h2("6. Apify — banda hasta fijar actor"),
        table(
          ["Volumen", "Temu USD", "Shein USD"],
          [
            ["500 filas", "$0.55 – 4", "$0.25 – 2.5"],
            ["5,000 filas", "$5.5 – 35", "$2.5 – 15"],
          ],
        ),

        h2("7. Un producto — ejemplo"),
        table(
          ["Concepto", "Costo tuyo", "Cobro cliente"],
          [
            ["Apify Temu (1 fila)", "~$0.0011 (+ search si aplica)", "—"],
            ["Apify Shein estándar", "~$0.0005", "—"],
            ["DeepL", "$0", "—"],
            ["Scraping", "—", "$0.015"],
            ["Margen bruto (Temu, sin search fee)", "~$0.014", ""],
          ],
        ),

        h2("8. 5,000 productos — resumen"),
        table(
          ["Concepto", "USD"],
          [
            ["Ingreso scraping ($0.015/u)", "$75"],
            ["Apify Temu (estimado)", "$5.50 – 35"],
            ["DeepL con caché", "~$28"],
            ["Margen (solo scraping + traducción costo)", "$12 – 41"],
            ["+ Cobro traducción ($0.015/u extra)", "+$75 ingreso → margen ~$87–117"],
          ],
        ),

        h2("9. CJ match volumen"),
        p("queryProductsByImage: 1000 pts/llamada — no escalar 5000×/día. Usar listV2 + query + caché de match."),
        p("Ver docs/COSTOS_PIPELINE_SCRAPING_TRADUCCION.md y DIAGRAMA_ALTO_NIVEL.md.", { italics: true }),
      ],
    },
  ],
});

fs.writeFileSync(outPath, await Packer.toBuffer(doc));
console.log("Written:", outPath);
