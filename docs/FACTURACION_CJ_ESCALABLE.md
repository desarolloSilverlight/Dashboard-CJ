# Facturación y costos escalables — Tienda CJ (cliente con API key propia)

> Anexo del plan único: [`PLAN_COMERCIAL_TIENDA_CJ.md`](./PLAN_COMERCIAL_TIENDA_CJ.md)

Documento para explicar al **cliente dueño de tienda** cómo se reparten los costos entre: (1) su operación en CJ, (2) la infraestructura AWS, (3) pagos de sus compradores, y (4) el fee del proyecto tipo Temu/Shein.

Fuentes oficiales CJ (consultar versiones vigentes):

- [API Points Resource Rules](https://developers.cjdropshipping.com/en/api/api2/standard/points.html)
- [Access Frequency Restrictions](https://developers.cjdropshipping.com/en/api/start/limit.html)
- [Shopping / Orders / Pay](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html)
- [CJ Prime](https://cjdropshipping.com/prime)

---

## 1. Resumen ejecutivo

| Concepto | Quién paga | Qué es |
|----------|------------|--------|
| Producto + envío fulfillment | Cliente (wallet CJ) | Costo real del dropshipping por pedido |
| Membresía CJ Prime (opcional) | Cliente | Más QPS API y beneficios sourcing; no sustituye costo de producto |
| Cuota API (puntos) | Incluida en cuenta CJ | 50 000 pts/día base + bonus por volumen de ventas en CJ |
| Pasarela (tarjeta/PSE/etc.) | Comisiones descontadas al cliente | Lo paga el comprador; fee va al PSP |
| AWS (hosting) | Cliente o fee mensual tuyo | CloudFront, compute, BD, Redis |
| Desarrollo / SaaS tienda | Tu contrato con el cliente | Panel + storefront + integraciones |

**Importante:** CJ **no** vende un “plan API mensual” aparte. El acceso API va con la cuenta del cliente. Sin actividad comercial en CJ durante **30 días** consecutivos, CJ puede **suspender** el permiso API (política documentada en Points).

---

## 2. Dos flujos de dinero (no mezclar)

### Flujo A — Comprador → Cliente (tienda)

1. Comprador paga **precio de venta** (producto + envío mostrado + impuestos si aplican).
2. El dinero entra a la **pasarela / cuenta del cliente** (Stripe, Mercado Pago, Wompi, etc.).
3. Comisiones PSP: típicamente **2,5 % – 3,5 % + fijo** por transacción (varía por país y volumen).

### Flujo B — Cliente → CJ (fulfillment)

1. Tras confirmar pago local, el sistema crea pedido en CJ (`createOrderV3`).
2. El cliente paga a CJ con **balance/wallet** (`payBalanceV2` o `payType=2` al crear).
3. Costo CJ ≈ **precio producto + envío logístico CJ** (lo que ya cotizaste con `freightCalculate`).

### Margen bruto por pedido (ejemplo)

```
Margen bruto = Precio venta al comprador − Costo CJ − Comisión PSP − (opcional) impuestos
```

---

## 3. Límites API CJ (escalabilidad técnica)

### 3.1 Velocidad (QPS)

| Perfil | QPS aprox. |
|--------|------------|
| Free / sales level 0–1 | 1 req/s |
| Plus / level 2 | 2 req/s |
| Prime / level 3 | 4 req/s |
| Advanced / level 4–5 | 6 req/s |

La app actual usa cola ~**1 req/s** (`CJ_QPS_INTERVAL_MS=1100`). Con tráfico alto conviene **CJ Prime** o subir sales level para no hacer colas largas en checkout y tracking.

### 3.2 Puntos diarios (desde reglas documentadas 2026)

- **Base:** 50 000 puntos / día (UTC).
- **Extra:** max(ventas USD últimos 3 meses) × **100 puntos por $1**.
- Replenish por minuto: total / 1440.
- Sin puntos: HTTP **429** con `pointsInfo`.

**Coste en puntos (endpoints que usa la tienda):**

| Operación | Puntos |
|-----------|--------|
| `listV2` (1 página) | 50 |
| Búsqueda 500 productos (5 páginas) | 250 |
| `product/query` | 10 |
| Stock por PID | 10 |
| Cotización CO (calculate + tip) | 20 |
| `createOrderV3` | ver doc (si no listado → 0) |
| `trackInfo` | ver doc logística |

Endpoints no listados en la tabla de puntos **no consumen** puntos según CJ.

---

## 4. Escenarios de uso API (escalable)

Supuestos para dimensionar (ajustar con analytics reales):

| Escenario | DAU compradores | Búsquedas catálogo/día | Detalles producto/día | Cotizaciones/día | Pedidos/día |
|-----------|-----------------|------------------------|-------------------------|------------------|-------------|
| **Piloto** | 50 | 20 | 80 | 40 | 5 |
| **Crecimiento** | 500 | 150 | 800 | 400 | 50 |
| **Escala** | 5 000 | 800 | 6 000 | 2 000 | 400 |

### Cálculo puntos API (solo consulta catálogo/logística)

Fórmula simplificada:

```
Puntos/día ≈ (Búsquedas × 250) + (Detalles × 20) + (Cotizaciones × 20) + (Pedidos × overhead pedido)
```

Overhead pedido: consultas `getOrderDetail` + `trackInfo` + webhooks (webhooks no listados como consumo de puntos en la doc de puntos).

| Escenario | Puntos consulta estimados/día | ¿Cabe en 50k base? |
|-----------|-------------------------------|---------------------|
| Piloto | ~20×250 + 80×20 + 40×20 = **7 300** | Sí |
| Crecimiento | ~150×250 + 800×20 + 400×20 = **61 500** | Borderline; necesita **bonus por ventas** o menos búsquedas repetidas / más caché |
| Escala | ~800×250 + 6000×20 + 2000×20 = **360 000** | No solo con base; requiere **ventas en CJ** elevadas (bonus) + caché CDN/server + reducir `listV2` |

**Palancas técnicas:** caché catálogo 30–60 min, no repetir `listV2` al volver atrás (ya en MVP), precalcular categorías, webhooks de stock en lugar de polling, búsqueda incremental (&lt;500) en horas pico.

**Palancas comerciales:** volumen de ventas en CJ aumenta puntos; CJ Prime para QPS.

---

## 5. Ejemplo económico por pedido (Colombia, ilustrativo)

Valores **ficticios** para presentación al cliente:

| Línea | USD |
|-------|-----|
| Precio venta al comprador | 29,90 |
| Costo producto CJ | 8,50 |
| Envío CJ (cotizado) | 6,20 |
| **Costo CJ total** | **14,70** |
| Comisión PSP (3 %) | 0,90 |
| **Margen bruto** | **14,30** |

Si el cliente vende **400 pedidos/mes** a ese margen: ~**5 720 USD/mes** bruto antes de AWS, marketing, dev y devoluciones.

CJ cobra al cliente **~14,70 USD × 400 = 5 880 USD/mes** en fulfillment (vía wallet), alineado con ventas si el retail cubre costos.

---

## 6. Proyección AWS (desde local hoy → producción)

Hoy el stack corre en **local** (`npm run dev`, `.env.local`). En producción hace falta HTTPS público (webhooks CJ + PSP), secretos rotados y base de datos persistente (usuarios, pedidos, carritos).

### 6.1 ¿EC2 + Amplify juntos?

| Enfoque | Veredicto |
|---------|-----------|
| **Solo EC2** (Docker/PM2) + RDS | Recomendado **piloto** si quieren control, cron y una instancia always-on para la cola QPS. |
| **Solo Amplify Hosting** (plan básico) + RDS + Redis | Recomendado si priorizan **deploy desde Git** y menos administración de servidor. |
| **EC2 y Amplify corriendo la misma app Next** | **No recomendado** — costo duplicado y dos orígenes; usar **uno** como compute. |
| **CloudFront + EC2** (sin Amplify) | CDN delante del ALB; equivalente funcional al CDN que trae Amplify. |

### 6.2 Desglose mensual por arquitectura (USD, una tienda, us-east-1)

**Opción A — EC2 piloto (recomendada para BFF + webhooks)**

| Componente | Especificación | Piloto/mes |
|------------|----------------|------------|
| EC2 | t3.small (2 vCPU, 2 GB), 1 AZ | ~$15–18 |
| ALB | 1 load balancer | ~$18–22 |
| RDS PostgreSQL | db.t4g.micro, 20 GB | ~$12–18 |
| Elastic IP / datos | tráfico salida moderado | ~$5–15 |
| Secrets Manager + CloudWatch | logs básicos | ~$5–10 |
| Redis | contenedor en EC2 (piloto) *o* ElastiCache micro +$12 | $0–15 |
| **Subtotal A** | | **~$55–100** |

**Opción B — Amplify básico + RDS**

| Componente | Especificación | Piloto/mes |
|------------|----------------|------------|
| Amplify Hosting | build SSR + GB-servidos (tráfico bajo-medio) | ~$25–60 |
| RDS PostgreSQL | db.t4g.micro | ~$12–18 |
| ElastiCache Redis | cache.t4g.micro (necesario si >1 instancia SSR) | ~$12–15 |
| Route 53 + dominio | hosted zone | ~$1–5 |
| Secrets Manager | | ~$2–5 |
| **Subtotal B** | | **~$52–103** |

**Opción C — Crecimiento (cualquier opción A o B evolucionada)**

| Servicio | Crecimiento/mes |
|----------|-----------------|
| Compute (EC2 t3.medium×2 ASG *o* Amplify más tráfico) | $80–200 |
| RDS db.t4g.small + backup | $35–70 |
| ElastiCache | $40–80 |
| CloudFront / WAF (opcional anti-DDoS) | $30–100 |
| SQS + Lambda (webhooks asíncronos) | $10–40 |
| **Total C** | **~$200–490** |

**Opción D — Escala**

| Total orientativo | **$1 500–2 500+**/mes (multi-AZ RDS, WAF, réplicas, más compute) |

### 6.3 Equivalencia con “local”

| Local | AWS |
|-------|-----|
| `.env.local` | Secrets Manager + variables en Amplify/EC2 |
| Caché catálogo en browser | + Redis server-side en producción |
| Sin HTTPS | ACM + ALB o dominio Amplify |
| Sin BD | RDS obligatorio para checkout/pedidos |

Detalle de endpoints CJ: [`CJ_ENDPOINTS_TIENDA.md`](./CJ_ENDPOINTS_TIENDA.md).

---

## 7. Endpoints CJ consumidos (tienda completa)

Resumen: **~22 rutas** en operación normal; **8** ya usadas en el MVP actual.

| Fase | Endpoints clave |
|------|-----------------|
| MVP (hoy) | `getAccessToken`, `refreshAccessToken`, `getCategory`, `listV2`, `query`, `stock/queryByPid`, `freightCalculate`, `freightCalculateTip` |
| Checkout / pedidos | `createOrderV3`, `payBalanceV2`, `getBalance`, `warehouse/detail`, `variant/queryByVid`, `stock/queryByVid` |
| Post-venta | `order/list`, `getOrderDetail`, `trackInfo`, `webhook/set` |
| Panel merchant | `setting/get`, `wallet/billingHistory`, `wallet/balanceHistory` (opc.) |
| UX marketplace | `review/query`, `disputes/*` (opc.) |

Tabla completa método + ruta + puntos: ver `docs/CJ_ENDPOINTS_TIENDA.md`.

---

## 8. Qué facturarle al cliente (propuesta comercial)

### 8.1 Setup único

- Diseño UX storefront tipo marketplace, integración CJ completa, PSP Colombia, panel merchant, webhooks, despliegue AWS.

### 8.2 Recurrente (elige modelo)

**Modelo A — Fee fijo + AWS reinvoice**

- Fee plataforma: $X / mes (soporte, updates, monitor API).
- AWS: costo real + 10–15 % gestión.

**Modelo B — Fee + % sobre GMV**

- % pequeño sobre ventas procesadas en la tienda (requiere reporting claro en panel).

**Modelo C — Todo incluido tiered**

| Tier | Pedidos/mes | Fee plataforma/mes (ejemplo) |
|------|-------------|------------------------------|
| Starter | &lt; 200 | $299 |
| Growth | 200–2 000 | $799 |
| Scale | 2 000+ | Custom |

*(Cifras ejemplo; reemplazar en propuesta final.)*

### 8.3 Lo que el cliente paga directo (sin pasar por ti)

- Recargas **wallet CJ** (fulfillment).
- **CJ Prime** si lo desea.
- Comisiones **PSP**.
- Dominio, SMS, email transaccional (SES, Twilio).

---

## 9. Checklist legal / operativo

1. Precio mostrado = costo CJ + margen + envío; política de cambios si CJ actualiza precio/stock (webhook `product` / `stock`).
2. Tiempos de entrega alineados a `deliveryDay` / `trackInfo`.
3. Política devoluciones alineada a [disputes CJ](https://developers.cjdropshipping.com/en/api/api2/) si aplica.
4. Mantener **transacciones en CJ** para no perder API (regla 30 días).
5. Una **IP / NAT** estable: límite doc **3 usuarios API por IP**.

---

## 10. Glosario

| Término | Definición |
|---------|------------|
| BFF | Backend for Frontend; Next.js proxy a CJ |
| GMV | Gross Merchandise Value; ventas brutas tienda |
| PSP | Payment Service Provider |
| platformOrderId | ID del pedido en tu RDS, enviado a CJ en createOrder |
| shipmentOrderId | ID para pagar sub-orden con payBalanceV2 |

---

*Versión 1.1 — proyección AWS EC2 vs Amplify + catálogo endpoints CJ. Ajustar cifras con AWS Pricing Calculator.*
