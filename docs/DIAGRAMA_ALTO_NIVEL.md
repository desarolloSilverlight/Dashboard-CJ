# Diagrama de alto nivel — Tienda tipo Temu/Shein sobre CJ (AWS)

> **Documento único (arquitectura + costos + ejemplos 1 / 5 000):** [`PLAN_COMERCIAL_TIENDA_CJ.md`](./PLAN_COMERCIAL_TIENDA_CJ.md) · [`PLAN_COMERCIAL_TIENDA_CJ.docx`](./PLAN_COMERCIAL_TIENDA_CJ.docx)

**Alcance:** una tienda B2C para compradores finales + panel del **cliente dueño de tienda** (su `CJ_API_KEY`). Despliegue en **AWS**. Objetivo: catálogo, checkout, pagos al comerciante, fulfillment y **tracking** vía CJ API 2.0 + webhooks.

**Leyenda**

| Símbolo | Significado |
|---------|-------------|
| Línea sólida | Flujo objetivo del producto |
| Caja con borde grueso | Ya existe en el repo (MVP catálogo/detalle/cotización CO) |
| Caja punteada | Por implementar (pedidos, pagos B2C, webhooks, auth multi-usuario) |

Referencias CJ: [API V2.0](https://developers.cjdropshipping.com/en/api/api2/), [Shopping](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html), [Logistics / trackInfo](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html), [Webhooks](https://developers.cjdropshipping.com/en/api/api2/api/webhook.html), [API Points](https://developers.cjdropshipping.com/en/api/api2/standard/points.html).

## Imágenes exportadas (UML / arquitectura)

| Archivo | Formato | Descripción |
|---------|---------|-------------|
| [diagrama-alto-nivel.png](./diagrams/diagrama-alto-nivel.png) | **PlantUML** (componentes + actores) | **Principal — estilo UML** para slides y DOCX |
| [diagrama-alto-nivel.svg](./diagrams/diagrama-alto-nivel.svg) | PlantUML vector | Editable en Illustrator / Figma (import SVG) |
| [diagrama-alto-nivel-completo.png](./diagrams/diagrama-alto-nivel-completo.png) | Mermaid | Vista completa con todos los módulos CJ |
| [diagrama-01-contexto.png](./diagrams/diagrama-01-contexto.png) | Mermaid | Vista resumida |

Regenerar: `npm run docs:diagrams` (fuente PlantUML: [`diagrams/diagrama-alto-nivel.puml`](./diagrams/diagrama-alto-nivel.puml)).

![Diagrama alto nivel — PlantUML (componentes)](./diagrams/diagrama-alto-nivel.png)

---

## Diagrama 1 — Contexto y contenedores (vista única principal)

> Si el renderizador falla por tamaño, usar los diagramas 2 y 3 más abajo (misma información, partida).

```mermaid
flowchart TB
  subgraph Actores["Actores"]
    Shopper["Comprador final\n(app web móvil/desktop)"]
    Merchant["Dueño de tienda / operadores\n(panel admin)"]
  end

  subgraph AWS["Amazon Web Services (piloto recomendado)"]
    CF["CloudFront opcional\n(o CDN Amplify)"]
    ALB["ALB o Amplify Hosting\nuna sola capa compute — ver § AWS"]

    subgraph Compute["Compute — elegir UNO"]
      Next["Next.js 15\nApp Router + BFF\n(EC2 Docker o Amplify SSR)"]
    end

    SM["Secrets Manager\nCJ_API_KEY del cliente"]
    Redis["ElastiCache Redis\nsesiones, cola QPS, caché catálogo"]
    DB["RDS PostgreSQL\nusuarios B2C, carritos, pedidos locales,\nmárgenes, estados tracking"]
    SQS["SQS\neventos webhook CJ"]
    WH["Lambda / Route\nPOST /api/webhooks/cj"]
    Jobs["Worker / Cron\nsincroniza pedidos, reintentos CJ"]
  end

  subgraph PagosB2C["Pagos al comerciante (no CJ)"]
    PSP["Pasarela local\nStripe / Mercado Pago / Wompi / etc."]
  end

  subgraph CJ["CJ Dropshipping API 2.0 (ver docs/CJ_ENDPOINTS_TIENDA.md)"]
    CJAuth["authentication\ngetAccessToken, refresh"]
    CJSet["setting/get"]
    CJProd["product\ngetCategory, listV2, query,\nvariant*, stock*, review?"]
    CJWh["warehouse/detail"]
    CJShop["shopping\norder/createOrderV3, list,\ngetOrderDetail, pay/*"]
    CJLog["logistic\nfreightCalculate*, trackInfo"]
    CJHook["webhook/set + callbacks"]
    CJDisp["disputes/* opc."]
  end

  Shopper -->|"HTTPS: navegar, carrito, checkout, mis pedidos"| CF
  Merchant -->|"HTTPS: KPIs, pedidos, catálogo, margen"| CF
  CF --> ALB --> Next

  Next --> SM
  Next --> Redis
  Next --> DB
  Next --> PSP
  PSP -->|"webhook pago confirmado"| WH

  WH --> SQS --> Jobs
  Jobs --> Next

  Next -->|"BFF + rate limit QPS\n(token del cliente)"| CJAuth
  Next --> CJSet
  Next --> CJProd
  Next --> CJWh
  Next --> CJShop
  Next --> CJLog
  Next --> CJHook
  Next --> CJDisp

  CJHook -->|"HTTPS POST\order / logistics / stock"| WH

  classDef mvp stroke-width:3px
  class Next mvp
```

### Qué hace cada bloque

| Contenedor | Responsabilidad |
|------------|-----------------|
| **Next.js (BFF)** | Una sola salida a CJ desde servidor; cola **QPS**; proxy actual `/api/cj/*`, auth `/api/auth/*`, cotización CO; futuro: checkout, órdenes, webhooks. |
| **RDS** | Fuente de verdad **de la tienda** (cuentas compradores, carrito, `platformOrderId` ↔ CJ, precio venta, estado UI tipo Temu). CJ sigue siendo fuente de fulfillment. |
| **Redis** | Caché catálogo (hoy en browser; en producción también server-side), sesiones, deduplicación webhooks. |
| **PSP** | El **comprador paga al cliente** (precio retail + envío mostrado). CJ **no** cobra tarjeta al consumidor final en este modelo. |
| **CJ Wallet** | Tras venta confirmada, el **cliente** paga producto+envío a CJ (`payBalanceV2` o `payType=2` en create). |

---

## Transición: local (hoy) → AWS

```mermaid
flowchart LR
  subgraph Hoy["Desarrollo actual"]
    Dev["npm run dev\nlocalhost:3000"]
    Env[".env.local\nCJ_API_KEY"]
    Dev --> Env
  end

  subgraph AWSOpt["Opciones producción"]
    A["A — EC2 + Docker\n+ RDS\n(recomendado piloto)"]
    B["B — Amplify Hosting\n+ RDS + Redis\n(menos ops)"]
    C["C — EC2 + Amplify\nmisma app duplicada\nNO recomendado"]
  end

  Hoy -->|"CI/CD + Secrets Manager"| A
  Hoy --> B
  C -.->|"evitar costo doble"| X["❌"]
```

| Criterio | **EC2 básico** (t3.small) | **Amplify básico** (Hosting) |
|----------|---------------------------|------------------------------|
| Despliegue | Docker / PM2, tú gestionas parches | Git push, build automático |
| Next.js API + BFF | Natural, proceso always-on | SSR + Route Handlers soportados |
| Cola QPS CJ (1 req/s) | OK en **1 instancia**; al escalar → Redis | Con varias instancias **Redis obligatorio** |
| Webhooks CJ (&lt;3 s) | URL estable vía ALB + ACM | URL estable dominio Amplify |
| Cron / workers | cron en EC2 o EventBridge | Lambda + EventBridge aparte |
| Costo piloto/mes | ~**$70–130** (EC2+RDS) | ~**$90–160** (build SSR+RDS) |
| Cuándo elegir | Control, workers, IP fija CJ | Equipo pequeño, deploy rápido |

**Nota:** CloudFront puede ir delante de **EC2** (origen ALB). Amplify ya incluye CDN; no hace falta **EC2 + Amplify** para la misma app Next — elige uno u otro.

---

## Diagrama 2 — Mapa BFF → endpoints CJ

```mermaid
flowchart LR
  subgraph BFF["Next.js BFF /api/cj/* + rutas dedicadas"]
    P["Catálogo"]
    D["Detalle"]
    L["Logística CO"]
    O["Pedidos"]
    W["Webhooks"]
  end

  subgraph CJAPI["CJ v1 rutas"]
    E1["GET getCategory\nGET listV2"]
    E2["GET query\nGET stock/queryByPid"]
    E3["POST freightCalculate\nPOST freightCalculateTip"]
    E4["POST createOrderV3\nGET order/list\nGET getOrderDetail\nPOST payBalanceV2\nGET getBalance"]
    E5["GET trackInfo\nPOST webhook/set"]
    E6["GET setting/get\nGET warehouse/detail\nGET review/query\nGET disputes/*"]
  end

  P --> E1
  D --> E2
  L --> E3
  O --> E4
  W --> E5
  O --> E6
```

Detalle tabular: [`CJ_ENDPOINTS_TIENDA.md`](./CJ_ENDPOINTS_TIENDA.md).

---

## Diagrama 3 — Flujo de compra y tracking (estilo marketplace)

```mermaid
sequenceDiagram
  autonumber
  participant C as Comprador
  participant T as Tienda Next.js
  participant DB as RDS
  participant PSP as Pasarela pago
  participant CJ as CJ API
  participant WH as Webhook CJ

  C->>T: Producto + variante + qty
  T->>CJ: freightCalculate + freightCalculateTip
  CJ-->>T: Opciones envío + costo
  T->>C: Precio retail (costo CJ + margen + envío)

  C->>T: Checkout (dirección CO)
  T->>PSP: Cobro B2C
  PSP-->>T: Pago OK
  T->>DB: Pedido PAID (local)

  T->>CJ: createOrderV3 (platformOrderId, payType 2 o 3)
  alt payType 3 crear luego pagar
    T->>CJ: payBalanceV2 (shipmentOrderId)
  end
  CJ-->>T: cjOrderId, sub-órdenes

  T->>DB: Vincular IDs CJ + estado CREATED

  WH->>T: order / logistics (trackNumber, trackingUrl)
  T->>DB: Actualizar estado (En preparación → En tránsito → Entregado)
  opt Consulta activa
    C->>T: Ver tracking
    T->>CJ: logistic/trackInfo
    CJ-->>T: trackingStatus, lastMileCarrier
    T-->>C: Timeline tipo Temu
  end

  Merchant->>T: Panel ventas / margen / disputas
  T->>CJ: order/list, getOrderDetail, getBalance
```

### Estados de pedido sugeridos (UI)

| Estado UI (comprador) | Origen |
|----------------------|--------|
| Pendiente pago | Local + PSP |
| Pagado / confirmado | PSP webhook |
| Procesando en almacén | Webhook `order` CJ |
| Enviado | `trackNumber` + webhook `logistics` |
| En tránsito / última milla | `trackInfo` |
| Entregado | `trackInfo.trackingStatus` |
| Incidencia / disputa | Módulo disputes CJ + soporte local |

---

## Diagrama 4 — Escalabilidad de usuarios (pendiente volumen exacto)

Modelo **una tienda / un tenant / una CJ_API_KEY** (la del cliente). Escala horizontal del **compute**; límites duros en **CJ QPS + puntos API**.

```mermaid
flowchart LR
  subgraph Escalar["Escala en AWS"]
    H1["Réplicas Next\n(auto scaling CPU/RPS)"]
    R1["Redis cluster"]
    D1["RDS read replica\n(solo lectura catálogo/pedidos)"]
  end

  subgraph Limites["Límites CJ (por cuenta cliente)"]
    QPS["QPS 1–6/s\nsegún Prime / sales level"]
    PTS["Puntos/día\n50k base + ventas×100"]
    IP["Máx. 3 cuentas API\npor IP (doc CJ)"]
  end

  H1 --> R1
  H1 --> D1
  H1 --> Limites
```

| Fase | Compradores concurrentes (orientativo) | Acciones |
|------|----------------------------------------|----------|
| **S** | &lt; 500 DAU | 1–2 instancias Next, Redis pequeño, cola QPS 1/s |
| **M** | 500–5k DAU | Auto-scaling, caché agresivo catálogo, webhooks vs polling, evaluar CJ Prime (QPS) |
| **L** | 5k+ DAU | Read replicas, CDN assets, NAT/IP dedicada si varias cuentas CJ, monitoreo `pointsInfo` |

---

## Mapa MVP actual → producto Temu-like

| Capacidad | Estado repo | API CJ principal |
|-----------|-------------|------------------|
| Catálogo / categorías / 500 ítems | Hecho | `getCategory`, `listV2` |
| Ficha producto / variantes | Hecho | `product/query` |
| Inventario | Hecho | `stock/queryByPid` |
| Cotización envío Colombia | Hecho | `freightCalculate`, `freightCalculateTip` |
| Auth token servidor | Hecho | `getAccessToken` |
| Carrito / checkout B2C | Pendiente | — + PSP |
| Crear y pagar pedido CJ | Pendiente | `createOrderV3`, `payBalanceV2` |
| Listado pedidos merchant | Pendiente | `order/list`, `getOrderDetail` |
| Tracking comprador | Pendiente | `trackInfo` + webhook `logistics` |
| Alertas stock/precio | Pendiente | webhook `stock`, `product` |
| Login compradores / admin | Pendiente | Cognito o NextAuth + RDS |

---

## Decisiones ya tomadas (para el diagrama)

1. **CJ_API_KEY del cliente** → almacenada en **Secrets Manager**; nunca en el cliente browser.
2. **AWS** → piloto: **EC2 + RDS** *o* **Amplify + RDS** (no duplicar ambos computes); webhooks HTTPS; `CJ_API_KEY` en Secrets Manager.
3. **Pagos consumidor** → pasarela del comerciante; **pagos CJ** → wallet del mismo cliente en CJ.
4. **Un diagrama principal + dos de apoyo** (secuencia compra + escala) para no saturar una sola figura.

Documento de costos y facturación: [`FACTURACION_CJ_ESCALABLE.docx`](./FACTURACION_CJ_ESCALABLE.docx) (y fuente Markdown [`FACTURACION_CJ_ESCALABLE.md`](./FACTURACION_CJ_ESCALABLE.md)).
