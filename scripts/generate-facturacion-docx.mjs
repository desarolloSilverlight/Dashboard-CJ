/**
 * Genera docs/FACTURACION_CJ_ESCALABLE.docx desde contenido estructurado.
 * Uso: node scripts/generate-facturacion-docx.mjs
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
const root = path.join(__dirname, "..");
const outPath = path.join(root, "docs", "FACTURACION_CJ_ESCALABLE.docx");

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}

function table(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
          width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
        }),
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({ text: String(cell) })],
            }),
        ),
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
      properties: {},
      children: [
        h1("Facturación y costos escalables — Tienda CJ"),
        p(
          "Documento para explicar al cliente dueño de tienda (API key propia en CJ) cómo se reparten: operación CJ, infraestructura AWS, pagos de compradores y fee de plataforma tipo Temu/Shein.",
        ),
        p("Fuentes: developers.cjdropshipping.com — API Points, Access Limits, Shopping, Logistics, Webhooks.", {
          italics: true,
        }),

        h2("1. Resumen ejecutivo"),
        table(
          ["Concepto", "Quién paga", "Qué es"],
          [
            ["Producto + envío fulfillment", "Cliente (wallet CJ)", "Costo dropshipping por pedido"],
            ["CJ Prime (opcional)", "Cliente", "Más QPS API y perks; no reemplaza costo producto"],
            ["Cuota API (puntos)", "Cuenta CJ del cliente", "50 000 pts/día base + bonus por ventas USD"],
            ["Pasarela B2C", "Fee al cliente", "Comprador paga retail; PSP descuenta comisión"],
            ["AWS", "Cliente o fee mensual", "Hosting, BD, Redis, CDN"],
            ["Plataforma tienda", "Contrato contigo", "Storefront + panel + integraciones"],
          ],
        ),
        p(
          "CJ no vende un plan API mensual aparte. Sin transacciones en CJ durante 30 días consecutivos, CJ puede suspender el permiso API (política documentada).",
          { bold: true },
        ),

        h2("2. Dos flujos de dinero"),
        p("Flujo A — Comprador paga al cliente (precio retail) vía pasarela local (Stripe, Mercado Pago, Wompi, etc.)."),
        p("Flujo B — Cliente paga a CJ vía wallet (createOrderV3 + payBalanceV2 o payType=2) por producto y envío real."),
        p("Margen bruto ≈ Precio venta − Costo CJ − Comisión PSP − impuestos (si aplican)."),

        h2("3. Límites API (escalabilidad)"),
        p("QPS: Free/level 0–1 = 1/s; Plus/2 = 2/s; Prime/3 = 4/s; Advanced/4–5 = 6/s."),
        p("Puntos/día: 50 000 base + (max ventas USD 3 meses) × 100. Replenish por minuto."),
        table(
          ["Operación", "Puntos (doc CJ)"],
          [
            ["listV2 (1 página)", "50"],
            ["Búsqueda 500 productos (5 págs)", "250"],
            ["product/query", "10"],
            ["Stock por PID", "10"],
            ["Cotización CO (2 calls)", "20"],
          ],
        ),

        h2("4. Escenarios de uso API"),
        table(
          ["Escenario", "DAU", "Búsquedas/día", "Detalles/día", "Cotiz./día", "Pedidos/día"],
          [
            ["Piloto", "50", "20", "80", "40", "5"],
            ["Crecimiento", "500", "150", "800", "400", "50"],
            ["Escala", "5 000", "800", "6 000", "2 000", "400"],
          ],
        ),
        p("Puntos consulta/día ≈ (Búsquedas × 250) + (Detalles × 20) + (Cotizaciones × 20)."),
        bullet("Piloto: ~7 300 pts/día — cabe en base 50k."),
        bullet("Crecimiento: ~61 500 — borderline; requiere bonus por ventas y caché agresivo."),
        bullet("Escala: ~360 000 — requiere alto volumen ventas CJ + caché + menos listV2 redundante."),

        h2("5. Ejemplo económico por pedido (ilustrativo USD)"),
        table(
          ["Línea", "USD"],
          [
            ["Precio venta al comprador", "29,90"],
            ["Costo producto CJ", "8,50"],
            ["Envío CJ", "6,20"],
            ["Costo CJ total", "14,70"],
            ["Comisión PSP (3 %)", "0,90"],
            ["Margen bruto", "14,30"],
          ],
        ),
        p("400 pedidos/mes × 14,30 USD margen ≈ 5 720 USD/mes bruto (antes AWS, marketing, devoluciones)."),

        h2("6. Proyección AWS (local hoy → producción)"),
        p(
          "Hoy: npm run dev + .env.local. Producción: HTTPS, Secrets Manager, RDS, webhooks CJ/PSP.",
        ),
        p("EC2 + Amplify a la vez para la misma app Next: NO recomendado (costo duplicado). Elegir uno:", {
          bold: true,
        }),
        table(
          ["Opción", "Cuándo", "Piloto USD/mes"],
          [
            ["A — EC2 t3.small + ALB + RDS", "Control, cron, cola QPS 1 instancia", "55–100"],
            ["B — Amplify Hosting + RDS + Redis", "Deploy Git, menos ops", "52–103"],
            ["C — Crecimiento", "Más tráfico / ASG / WAF", "200–490"],
            ["D — Escala", "Multi-AZ, réplicas", "1 500–2 500+"],
          ],
        ),
        p("EC2 piloto: Docker con Next.js, Redis en EC2 o ElastiCache micro. Amplify: Redis recomendado si hay varias instancias SSR."),
        p("Equivalencia: .env.local → Secrets Manager; caché browser → Redis; localhost → ACM + dominio."),

        h2("7. Endpoints CJ (tienda completa)"),
        p("~22 rutas en operación normal; 8 ya en MVP. Tabla detallada: docs/CJ_ENDPOINTS_TIENDA.md"),
        table(
          ["Fase", "Rutas v1 (prefijo /api2.0/v1)"],
          [
            [
              "MVP hoy",
              "authentication/getAccessToken, refreshAccessToken; product/getCategory, listV2, query, stock/queryByPid; logistic/freightCalculate, freightCalculateTip",
            ],
            [
              "Checkout",
              "shopping/order/createOrderV3, pay/payBalanceV2, pay/getBalance; warehouse/detail; product/variant/queryByVid, stock/queryByVid",
            ],
            ["Post-venta", "shopping/order/list, getOrderDetail; logistic/trackInfo; webhook/set"],
            ["Panel", "setting/get; shopping/wallet/billingHistory, balanceHistory (opc.)"],
            ["UX+", "product/review/query; disputes/* (opc.)"],
          ],
        ),
        p("Evitar: product/list (deprecated), logistic/getTrackInfo, payBalance legacy, queryProductsByImage (1000 pts)."),

        h2("8. Propuesta comercial al cliente"),
        p("Setup único: storefront, panel merchant, CJ + PSP + webhooks + AWS."),
        p("Recurrente — ejemplos de tiers (ajustar en contrato):"),
        table(
          ["Tier", "Pedidos/mes", "Fee plataforma (ejemplo)"],
          [
            ["Starter", "< 200", "$299/mes"],
            ["Growth", "200–2 000", "$799/mes"],
            ["Scale", "2 000+", "Custom"],
          ],
        ),
        p("Pago directo del cliente: wallet CJ, CJ Prime opcional, comisiones PSP, dominio y email."),

        h2("9. Checklist operativo"),
        bullet("Precio retail = costo CJ + margen + envío; webhooks product/stock para cambios."),
        bullet("Tracking vía trackInfo + webhook logistics (timeline tipo Temu)."),
        bullet("Mantener ventas en CJ para no perder API (30 días sin transacciones)."),
        bullet("IP/NAT estable: máximo 3 cuentas API por IP (documentación CJ)."),

        h2("10. Arquitectura de referencia"),
        p(
          "Ver docs/DIAGRAMA_ALTO_NIVEL.md: EC2 o Amplify (uno solo), RDS, Redis, webhooks, mapa BFF→CJ. docs/CJ_ENDPOINTS_TIENDA.md. API key en Secrets Manager.",
        ),
        p("Versión 1.1 — proyección AWS EC2 vs Amplify + endpoints CJ.", { italics: true }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log("Written:", outPath);
