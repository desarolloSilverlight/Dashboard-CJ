# Plan comercial y técnico — Tienda CJ (documento único)

**Cliente:** dueño de tienda con **su `CJ_API_KEY`**. **Objetivo:** marketplace tipo Temu/Shein → match **CJ** → catálogo en español → venta + fulfillment CJ. **Hosting:** AWS (piloto **EC2** *o* **Amplify**, no ambos para la misma app).

**Imagen arquitectura:** [`diagrams/diagrama-alto-nivel.png`](./diagrams/diagrama-alto-nivel.png) · **Pipeline scrape:** [`diagrams/pipeline-scraping-cj.png`](./diagrams/pipeline-scraping-cj.png)

---

## 1. Visión en una página

| Capa | Qué es | Costo típico |
|------|--------|--------------|
| **Origen** | Apify scrape **Temu** o **Shein** (actor en evaluación) | Pay-per-event, variable |
| **Match** | ¿Existe en CJ? (`listV2` + `query`; imagen solo excepciones) | Puntos API CJ (cuenta cliente) |
| **Traducción** | DeepL ES + **caché** | Free hasta 500k chars/mes |
| **Tienda** | Next.js BFF + RDS + Redis (AWS) | **$55–103/mes** piloto |
| **Venta** | PSP → cliente; fulfillment **wallet CJ** | Por pedido |
| **Tu fee** | Scraping **$0.015/producto** (+ traducción opcional igual) | Ingreso servicio |

---

## 2. Arquitectura AWS

### 2.1 Diagrama lógico

```
Comprador / Merchant → CloudFront o CDN Amplify → Next.js (BFF) → RDS + Redis + Secrets (CJ_API_KEY)
                              ↓                                    ↓
                         Pasarela B2C                         CJ API 2.0
                              ↓                                    ↓
                         Webhooks                            Webhooks CJ
```

### 2.2 EC2 vs Amplify (elegir **uno**)

| Criterio | EC2 + ALB + RDS | Amplify Hosting + RDS + Redis |
|----------|-----------------|-------------------------------|
| Ops | Tú (Docker/PM2, parches) | Git push, build automático |
| Cola QPS CJ (1 req/s) | OK 1 instancia; al escalar → Redis | Varias instancias SSR → **Redis obligatorio** |
| Webhooks CJ (&lt;3 s) | ALB + ACM | Dominio Amplify |
| **Piloto USD/mes** | **$55 – 100** | **$52 – 103** |
| Recomendado si | Control, workers, IP estable | Equipo pequeño, deploy rápido |

**No** duplicar EC2 + Amplify sirviendo la **misma** app Next.

### 2.3 Costos AWS mensuales (una tienda, us-east-1)

| Fase | EC2 (A) | Amplify (B) | Notas |
|------|---------|-------------|--------|
| **Piloto** | $55–100 | $52–103 | db.t4g.micro, tráfico bajo |
| **Crecimiento** | $200–490 | similar | ASG, WAF, SQS/Lambda webhooks |
| **Escala** | $1 500–2 500+ | | Multi-AZ, réplicas |

**Hoy (local):** `npm run dev` + `.env.local` — sin costo AWS; producción exige HTTPS + RDS + secretos.

---

## 3. Flujo producto (Temu/Shein → tienda)

1. **Scrape** (Apify Temu *o* Shein, actors **variables** hasta el mejor).
2. **Match CJ** — % depende de **categoría** (§6).
3. **Inventario** — flujo actual: `product/query`, `stock/queryByPid`, margen.
4. **DeepL** — título + descripción + variantes (caché).
5. **Publicación + venta** — cotización CO, checkout PSP, `createOrderV3`, tracking.

---

## 4. Costos Apify (proveedor)

| Estado | Política |
|--------|----------|
| Actors | **Variables** en R&D; luego 1 Temu + 1 Shein congelados |
| Banda Temu | **~$0.0011–0.0015 / fila** + posible **~$0.10 / búsqueda** |
| Banda Shein | **~$0.0005–0.002 / fila** (listado vs detalle) |
| 500 filas scrape | **$0.55 – 4** (Temu) · **$0.25 – 2.5** (Shein) |
| 5 000 filas | **$5.5 – 35** · **$2.5 – 15** |

---

## 5. Costos DeepL (API)

| Regla | Valor |
|-------|--------|
| Gratis / mes | **500 000 caracteres** (plan API Free) |
| Pro | **$5.49/mes** + **$25 / millón** chars (desde char 500 001 si aplica free) |
| Supuesto | **~400 caracteres / producto**, 1 idioma |
| Caché | **~30 %** ahorro (colores, tallas, frases repetidas) |

| Productos traducidos | Chars (~400 c/u) | Costo API (con free) | Con caché ~30 % |
|----------------------|------------------|----------------------|-----------------|
| 1 | 400 | $0 | $0 |
| 500 verificados CJ | 200 000 | **$0** | **$0** |
| 1 250 | 500 000 | $0 | $0 |
| 2 500 | 1 M | ~$18 | ~$5.49 |
| **5 000** | 2 M | **~$43** | **~$28** |

Verificar con DeepL si Pro descuenta los 500k; si no, sumar ~**$12.50** desde 2 500 productos.

---

## 6. Costos CJ (cuenta del cliente)

| Concepto | Detalle |
|----------|---------|
| Plan API mensual | **No existe** — API con la cuenta CJ |
| CJ Prime (opcional) | ~$16–60/mes — más QPS, no reemplaza producto/envío |
| Fulfillment | **Wallet CJ** — producto + envío por pedido |
| Puntos API | **50 000/día** base + ventas × 100 pts/$1 |
| QPS | 1/s (free) hasta 6/s (Advanced) |

**Puntos relevantes al catálogo:**

| Operación | Puntos |
|-----------|--------|
| `listV2` (1 página) | 50 |
| `product/query` | 10 |
| `stock/queryByPid` | 10 |
| `queryProductsByImage` | **1000** (evitar masivo) |
| Cotización envío (2 calls) | 20 |

**Match por categoría (% orientativo → scrape para 500 verificados):**

| Categoría | Match % | Scrape aprox. para 500 CJ OK |
|-----------|---------|------------------------------|
| Hogar / accesorios | 55–70 % | 715–910 |
| Belleza / gadgets | 45–60 % | 833–1 111 |
| Moda | 30–50 % | 1 000–1 667 |
| Electrónica marca | 20–40 % | 1 250–2 500 |

---

## 7. Precio al cliente (tu servicio)

| Productos | Cobro scraping | USD/u |
|-----------|----------------|-------|
| 1 000 | $15 | $0.015 |
| 2 500 | $37.50 | $0.015 |
| **5 000** | **$75** | $0.015 |
| 10 000 | $150 | $0.015 |

Traducción opcional: mismo **$0.015/u** sobre productos **verificados/publicados**.

---

## 8. Ejemplo **1 producto** (todos los rubros)

Escenario: 1 fila Apify Temu, match CJ keyword, 400 chars DeepL, **sin** prorratear AWS (costo fijo mensual aparte).

| Rubro | Costo tuyo (USD) | Ingreso cliente | Notas |
|-------|------------------|-----------------|--------|
| Apify | **~0.0011** | — | +0.10 si 1.er ítem de búsqueda nueva |
| DeepL | **0** | — | &lt; 500k/mes acumulado |
| CJ API | **0*** | — | *~60 pts, cuenta cliente |
| AWS | **0** marginal | — | Piloto ~$75/mes compartido |
| **Scraping** | — | **0.015** | |
| **Traducción (opc.)** | — | **0.015** | |
| **Margen variable** | | **~0.014 – 0.028** | Sin search fee |

---

## 9. Ejemplo **5 000 productos** (escalado completo)

Supuestos: **5 000 verificados y publicados** (ya descontado scrape extra por match — ver §6 si partes de scrape bruto). Traducción con **caché**. AWS piloto **EC2** ~**$75/mes**. Apify Temu banda media.

### 9.1 Ingresos servicio (tuyo)

| Concepto | USD |
|----------|-----|
| Scraping 5 000 × $0.015 | **75.00** |
| Traducción 5 000 × $0.015 (opc.) | **75.00** |
| **Total servicios (ambos)** | **150.00** |

### 9.2 Costos operativos (tuyo)

| Rubro | Bajo | Alto |
|-------|------|------|
| Apify (5 000 filas) | 5.50 | 35.00 |
| DeepL (caché) | 28.00 | 28.00 |
| DeepL (sin caché) | — | 43.00 |
| AWS piloto (1 mes) | 55.00 | 100.00 |
| CJ API / wallet | — | *Cuenta cliente* |

### 9.3 Resultado estimado (mes del lote)

| Escenario | Ingreso | Costos (Apify+DeepL caché+AWS mid) | Margen bruto |
|-----------|---------|-------------------------------------|--------------|
| Solo scraping | $75 | ~5.5 + 28 + 75 = **108.5** | **−33.5**† |
| Scraping + traducción cobrada | $150 | **108.5** | **~41.5** |
| Scraping + traducción, Apify bajo | $150 | ~5.5 + 28 + 55 = **88.5** | **~61.5** |

†Si **solo** cobras scraping $75, un lote de 5 000 en un mes **no cubre** DeepL+AWS — conviene **paquete** (scraping+traducción), **fee mensual**, o **amortizar** AWS en varios lotes/mes.

### 9.4 CJ en el mismo lote (cuenta cliente, no tu P&L)

| Concepto | Orden magnitud |
|----------|----------------|
| Puntos match+query+stock 5 000 SKU | ~50k–250k pts (keyword, amortizado) |
| Días API si 1 QPS | Planificar cola / Prime |
| Wallet | Solo al **vender** (producto+envío) |

---

## 10. Planificación por fases

| Fase | Entregable | Costo orientativo |
|------|------------|-------------------|
| **0 Local** | MVP catálogo CJ (hoy) | $0 AWS |
| **1 R&D scrape** | Elegir actors Temu/Shein | $20–80 Apify |
| **2 Piloto 500 CJ** | Match + traducción + tienda staging | AWS $55–100 + DeepL $0 |
| **3 Producción** | AWS + webhooks + PSP + pedidos | AWS + CJ Prime si QPS |
| **4 Lote 5 000** | Catálogo masivo | §9 + contrato por verificados |

---

## 11. Checklist decisiones

- [ ] EC2 **o** Amplify (uno solo)
- [ ] Actors Apify definitivos
- [ ] Cobrar por **SKU verificado CJ** vs filas scrape
- [ ] Paquete scraping + traducción para márgenes sanos en 5k
- [ ] Piloto 50 PID: medir **caracteres reales** DeepL
- [ ] Confirmar DeepL Pro vs 500k gratis
- [ ] Política categorías y % match en contrato

---

## 12. Anexos (detalle técnico)

| Doc | Contenido |
|-----|-----------|
| [DIAGRAMA_ALTO_NIVEL.md](./DIAGRAMA_ALTO_NIVEL.md) | Diagramas Mermaid + AWS |
| [CJ_ENDPOINTS_TIENDA.md](./CJ_ENDPOINTS_TIENDA.md) | Endpoints API |
| [COSTOS_PIPELINE_SCRAPING_TRADUCCION.md](./COSTOS_PIPELINE_SCRAPING_TRADUCCION.md) | Pipeline scrape (expandido) |
| [FACTURACION_CJ_ESCALABLE.md](./FACTURACION_CJ_ESCALABLE.md) | Pedidos, PSP, tiers SaaS |

**Documento único exportable:** [`PLAN_COMERCIAL_TIENDA_CJ.docx`](./PLAN_COMERCIAL_TIENDA_CJ.docx) — generar con `npm run docs:plan`.

*Versión 1.0 — cifras estimadas; validar Apify, DeepL y AWS Pricing Calculator antes de contrato.*
