# Dashboard CJ Dropshipping

E-commerce conectado al API de CJ Dropshipping.

Next.js 15 + BFF para la [Product API](https://developers.cjdropshipping.com/en/api/api2/api/product.html) de CJ.

## Configuración

1. Copia `.env.example` → `.env.local`
2. Pon tu **CJ_API_KEY** (My CJ → Authorization → API → Copy)
3. Opcional: **CJ_EMAIL** (solo referencia en la UI; el token usa la API key)
4. `npm install` && `npm run dev` → [http://localhost:3000](http://localhost:3000)

El servidor obtiene el **access token** con `POST /authentication/getAccessToken`. Usa **Actualizar token** si expiró (o refresh automático).

## Despliegue (Cloudflare)

La app tiene rutas `/api`, así que no puede publicarse como sitio estático. Se despliega en Cloudflare con [OpenNext](https://opennext.js.org/cloudflare/get-started). En el panel está bajo **Workers & Pages** y la URL pública queda en `*.workers.dev`.

1. Conecta este repositorio en Cloudflare, o en local ejecuta `npx wrangler login` y luego `npm run deploy`.
2. Comando de build: `npx opennextjs-cloudflare build`.
3. Variable secreta obligatoria: `CJ_API_KEY`. No subas `.env.local`.
4. Opcional: `CJ_EMAIL`.

## Flujo catálogo

1. Se cargan categorías (`GET /product/getCategory`) en un selector con buscador
2. Eliges categoría → **Traer 500 productos** (`listV2` paginado, máx. 100 por página)
3. Tarjetas: miniatura, nombre, precio, **Ver detalle**
4. Detalle en `/product/[pid]` con `product/query`: galería, variantes/tallas, precios, descripción

Arquitectura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

Documentación producto (tienda tipo Temu + AWS):

- **[Plan comercial único (MD)](docs/PLAN_COMERCIAL_TIENDA_CJ.md)** · **[DOCX](docs/PLAN_COMERCIAL_TIENDA_CJ.docx)** — `npm run docs:plan` *(AWS, Apify, DeepL, CJ, 1 y 5 000 productos)*

Anexos técnicos: [Diagrama](docs/DIAGRAMA_ALTO_NIVEL.md) · [Endpoints CJ](docs/CJ_ENDPOINTS_TIENDA.md) · [Facturación](docs/FACTURACION_CJ_ESCALABLE.md) · [Pipeline scrape](docs/COSTOS_PIPELINE_SCRAPING_TRADUCCION.md)
