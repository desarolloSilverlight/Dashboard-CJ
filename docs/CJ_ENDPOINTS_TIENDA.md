# Endpoints CJ API 2.0 — Tienda tipo Temu/Shein

Prefijo oficial: `https://developers.cjdropshipping.com/api2.0/v1`  
En este proyecto el BFF expone rutas como `/api/cj/product/listV2` → `/product/listV2`.

Leyenda **Uso**: **Hoy** = implementado en repo · **Tienda** = necesario para producto completo · **Opc.** = mejora UX/ops · **No** = deprecated o evitar.

| Módulo | Método | Ruta (v1) | Uso | Función en la tienda |
|--------|--------|-----------|-----|----------------------|
| Auth | POST | `/authentication/getAccessToken` | **Hoy** | Token servidor (`CJ_API_KEY`) |
| Auth | POST | `/authentication/refreshAccessToken` | **Hoy** | Renovar token |
| Auth | POST | `/authentication/logout` | Opc. | Cerrar sesión API |
| Settings | GET | `/setting/get` | **Tienda** | Límites QPS/cuotas en panel merchant |
| Product | GET | `/product/getCategory` | **Hoy** | Navegación categorías |
| Product | GET | `/product/listV2` | **Hoy** | Catálogo / búsqueda (50 pts/pág) |
| Product | GET | `/product/query` | **Hoy** | Ficha producto (10 pts) |
| Product | GET | `/product/variant/query` | Opc. | Variantes si no vienen en query |
| Product | GET | `/product/variant/queryByVid` | **Tienda** | Validar variante en checkout |
| Product | GET | `/product/stock/queryByPid` | **Hoy** | Inventario detalle (10 pts) |
| Product | GET | `/product/stock/queryByVid` | **Tienda** | Stock en checkout |
| Product | GET | `/product/stock/queryBySku` | Opc. | SKU alternativo |
| Product | GET | `/product/review/query` | Opc. | Reseñas estilo marketplace |
| Product | GET | `/product/globalWarehouseList` | Opc. | Orígenes de envío |
| Product | GET | `/product/myProduct/list` | Opc. | Catálogo curado del merchant |
| Product | GET | `/product/list` | No | Deprecated (solo explorer) |
| Product | POST | `/product/queryProductsByImage` | No | 1000 pts — evitar |
| Warehouse | GET | `/warehouse/detail` | **Tienda** | Almacén / `storageId` en pedido |
| Shopping | POST | `/shopping/order/createOrderV3` | **Tienda** | Crear pedido tras pago B2C |
| Shopping | GET | `/shopping/order/list` | **Tienda** | Panel pedidos |
| Shopping | GET | `/shopping/order/getOrderDetail` | **Tienda** | Detalle + tracking fields |
| Shopping | POST | `/shopping/order/confirmOrder` | Opc. | Confirmación según flujo CJ |
| Shopping | GET | `/shopping/pay/getBalance` | **Tienda** | Saldo wallet merchant |
| Shopping | POST | `/shopping/pay/payBalanceV2` | **Tienda** | Pagar sub-orden CJ |
| Shopping | POST | `/shopping/pay/payBalance` | No | Legacy — usar V2 |
| Shopping | POST | `/shopping/order/createOrder` | No | Legacy |
| Shopping | POST | `/shopping/order/createOrderV2` | No | Legacy |
| Shopping | GET | `/shopping/wallet/billingHistory` | Opc. | Historial facturación (10 pts) |
| Shopping | GET | `/shopping/wallet/balanceHistory` | Opc. | Movimientos wallet (10 pts) |
| Logistics | POST | `/logistic/freightCalculate` | **Hoy** | Cotización envío |
| Logistics | POST | `/logistic/freightCalculateTip` | **Hoy** | Desglose transportistas CO |
| Logistics | GET | `/logistic/trackInfo` | **Tienda** | Timeline tracking comprador |
| Logistics | GET | `/logistic/getTrackInfo` | No | Deprecated |
| Logistics | POST | `/logistic/partnerFreightCalculate` | Opc. | Freight alternativo |
| Logistics | GET | `/logistic/getSupplierLogisticsTemplate` | Opc. | Plantillas logísticas |
| Webhook | POST | `/webhook/set` | **Tienda** | Registrar URLs HTTPS |
| Webhook | POST | `/webhook/product/subscribe` | Opc. | Push cambios producto (10 pts) |
| Webhook | POST | `/webhook/product/unsubscribe` | Opc. | Baja suscripción |
| Disputes | GET | `/disputes/disputeProducts` | Opc. | Abrir disputa por pedido |
| Disputes | POST | `/disputes/disputeConfirmInfo` | Opc. | Confirmar disputa |
| Disputes | POST | `/disputes/uploadFile` | Opc. | Adjuntos (20 pts) |

**Webhooks entrantes (CJ → tu AWS):** tras `webhook/set`, CJ POST a tu URL pública por eventos `order`, `logistics`, `stock`, `product`, `makeup`, `privateOrder` (ver [Webhook](https://developers.cjdropshipping.com/en/api/api2/api/webhook.html)).

**No incluidos** (otro producto CJ): conexión OAuth tiendas Shopify/eBay, affiliate token, sandbox `createOrder` salvo pruebas explícitas.

**Conteo orientativo:** ~**22 endpoints** llamados activamente en tienda completa; **8** ya usados en MVP.
