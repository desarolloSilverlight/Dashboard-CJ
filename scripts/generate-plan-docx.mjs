/**
 * Documento único: PLAN_COMERCIAL_TIENDA_CJ.docx
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
  ImageRun,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const docs = path.join(root, "docs");
const outPath = path.join(docs, "PLAN_COMERCIAL_TIENDA_CJ.docx");

function h1(t) {
  return new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { after: 180 } });
}
function h2(t) {
  return new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } });
}
function p(t, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text: t, ...opts })], spacing: { after: 80 } });
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

const diagramPath = path.join(docs, "diagrams", "diagrama-alto-nivel.png");
const diagramPara = [];
if (fs.existsSync(diagramPath)) {
  const img = fs.readFileSync(diagramPath);
  diagramPara.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: img,
          transformation: { width: 600, height: 420 },
          type: "png",
        }),
      ],
      spacing: { after: 200 },
    }),
  );
}

const doc = new Document({
  sections: [
    {
      children: [
        h1("Plan comercial y técnico — Tienda CJ (documento único)"),
        p(
          "Cliente con CJ_API_KEY propia. Tienda tipo Temu/Shein: scrape Apify → match CJ → DeepL → venta + fulfillment CJ. AWS: EC2 o Amplify (uno solo).",
        ),

        h2("1. Resumen de capas y costos"),
        table(
          ["Capa", "Costo típico"],
          [
            ["Apify Temu/Shein", "Variable; ~$0.001/fila (banda)"],
            ["DeepL", "$0 hasta 500k chars/mes; 5k prod. ~$28 caché"],
            ["AWS piloto", "$55–100 EC2 o $52–103 Amplify / mes"],
            ["CJ API", "Puntos (cuenta cliente); sin plan API mensual"],
            ["CJ fulfillment", "Wallet cliente por pedido"],
            ["Tu fee scraping", "$0.015 / producto"],
          ],
        ),

        h2("2. Arquitectura AWS"),
        ...diagramPara,
        p("Diagrama fuente: docs/diagrams/diagrama-alto-nivel.png", { italics: true }),
        table(
          ["Opción", "Piloto USD/mes", "Cuándo"],
          [
            ["EC2 + ALB + RDS", "$55–100", "Control, QPS 1 instancia, webhooks"],
            ["Amplify + RDS + Redis", "$52–103", "Deploy Git, menos ops"],
            ["EC2 + Amplify misma app", "No recomendado", "Costo duplicado"],
            ["Crecimiento", "$200–490", "Más tráfico, WAF, SQS"],
          ],
        ),

        h2("3. Flujo end-to-end"),
        bullet("Apify Temu o Shein (actors en evaluación)."),
        bullet("Match CJ — % por categoría."),
        bullet("Inventario: query + stock (flujo dashboard actual)."),
        bullet("DeepL + caché → publicación."),
        bullet("Venta: PSP + createOrderV3 + trackInfo + webhooks."),

        h2("4. Apify"),
        table(
          ["Volumen", "Temu USD", "Shein USD"],
          [
            ["1 producto", "~0.0011", "~0.0005"],
            ["500 filas", "0.55 – 4", "0.25 – 2.5"],
            ["5 000 filas", "5.5 – 35", "2.5 – 15"],
          ],
        ),

        h2("5. DeepL"),
        table(
          ["Productos", "Costo API (400 c/u, 1 idioma)"],
          [
            ["1", "$0"],
            ["500 verificados CJ", "$0"],
            ["5 000 (caché ~30%)", "~$28"],
            ["5 000 (sin caché)", "~$43"],
          ],
        ),

        h2("6. CJ (cliente)"),
        bullet("50 000 puntos API/día base + bonus por ventas."),
        bullet("listV2=50pts, query=10, stock=10, imagen=1000pts (evitar masivo)."),
        bullet("Prime opcional para QPS; wallet paga producto+envío."),
        table(
          ["Categoría", "Match %", "Scrape para 500 verificados"],
          [
            ["Hogar/accesorios", "55–70%", "715–910"],
            ["Moda", "30–50%", "1000–1667"],
            ["Electrónica marca", "20–40%", "1250–2500"],
          ],
        ),

        h2("7. Precio al cliente"),
        table(
          ["Productos", "Scraping USD"],
          [
            ["1 000", "$15"],
            ["5 000", "$75"],
            ["10 000", "$150"],
          ],
        ),
        p("Traducción opcional: +$0.015 / producto verificado."),

        h2("8. Ejemplo 1 producto"),
        table(
          ["Rubro", "Costo tuyo", "Ingreso"],
          [
            ["Apify", "~$0.0011", "—"],
            ["DeepL", "$0", "—"],
            ["CJ API", "pts cliente", "—"],
            ["AWS", "$0 marginal", "—"],
            ["Scraping", "—", "$0.015"],
            ["Traducción (opc.)", "—", "$0.015"],
            ["Margen variable", "", "~$0.014–0.028"],
          ],
        ),

        h2("9. Ejemplo 5 000 productos"),
        p("Supuesto: 5 000 verificados/publicados; DeepL caché; AWS piloto ~$75/mes; Apify bajo."),
        table(
          ["Concepto", "USD"],
          [
            ["Ingreso scraping", "75"],
            ["Ingreso traducción (opc.)", "75"],
            ["Apify", "5.5 – 35"],
            ["DeepL caché", "~28"],
            ["AWS piloto", "55 – 100"],
            ["Costo total ops (mid)", "~108"],
            ["Margen scraping+traducción (mid)", "~42"],
          ],
        ),
        p(
          "Solo scraping $75 no cubre DeepL+AWS en un solo mes — vender paquete o fee mensual.",
          { bold: true },
        ),

        h2("10. Fases"),
        bullet("0 Local MVP · 1 R&D Apify · 2 Piloto 500 CJ · 3 Prod AWS+PSP · 4 Lote 5k"),

        h2("11. Anexos"),
        p("DIAGRAMA_ALTO_NIVEL.md, CJ_ENDPOINTS_TIENDA.md, FACTURACION_CJ_ESCALABLE.md", {
          italics: true,
        }),
        p("Versión 1.0 — validar precios proveedor antes de contrato.", { italics: true }),
      ],
    },
  ],
});

fs.writeFileSync(outPath, await Packer.toBuffer(doc));
console.log("Written:", outPath);
