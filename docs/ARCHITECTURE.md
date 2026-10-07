# Arquitectura — Dashboard CJ

Stack: **Next.js 15 (App Router)** + **React 19** + **Tailwind CSS 4**.

## Capas

```
src/
  app/                    # Routing, layouts, Route Handlers (BFF)
  features/               # UI por dominio (catalog, explorer)
  core/                   # Dominio: tipos, servicios, contratos de repositorio
  infrastructure/         # Implementaciones (cliente HTTP hacia /api)
  server/                 # Solo servidor: cliente HTTP hacia CJ (server-only)
  components/             # UI compartida (layout, ui primitives)
  providers/              # Context (token)
  lib/                    # Utilidades (cn)
```

## Patrones

| Patrón | Uso |
|--------|-----|
| **BFF (Backend for Frontend)** | `app/api/cj/[...path]` proxya a CJ; evita CORS y centraliza headers. |
| **Repository** | `IProductRepository` abstrae acceso a productos; `BffProductRepository` llama al BFF. |
| **Service** | `CatalogService` orquesta paginación (hasta 500) y reglas de negocio. |
| **Provider** | `TokenProvider` guarda `CJ-Access-Token` en cliente (localStorage). |
| **Feature modules** | `features/catalog`, `features/explorer` — pantallas autocontenidas. |

## Extender

- **shadcn/ui**: `npx shadcn@latest init` (compatible con App Router + Tailwind).
- **React Query / SWR**: envolver llamadas en hooks dentro de `features/*/hooks`.
- **Zustand**: estado global de catálogo si crece la app.
- **Auth**: más adelante, mover token a sesión server-side en Route Handlers.

## Comandos

```bash
npm install
npm run dev    # http://localhost:3000 — live reload incluido
```
