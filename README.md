# Bolivia Pulse

Dashboard web de monitoreo casi en tiempo real de Bolivia: economía, política, seguridad, sociedad, clima y media.

## Arranque rápido

```bash
npm install
cp .env.example .env
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

La ingestión corre dentro de Next.js (`ENABLE_INGEST=true`) cada ~60s y persiste en `data/bundle.json`. Worker aparte:

```bash
npm run ingest
```

Con Docker (Redis + Postgres opcionales):

```bash
docker compose up
```

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/IMPLEMENTACION.md](docs/IMPLEMENTACION.md) | Arquitectura, API, UI, ingest y despliegue |
| [docs/FUENTES.md](docs/FUENTES.md) | Catálogo de fuentes y cadencias |

## Variables útiles

| Variable | Uso |
|----------|-----|
| `FIRMS_MAP_KEY` | Incendios NASA FIRMS |
| `REDIS_URL` | Caché compartida |
| `ENABLE_SOCIAL_SCRAPERS` | Fallback RRSS experimental (off) |

## Estructura

```
apps/web         UI + API REST/SSE + instrumentation
apps/ingest      pollers + store + circuit breakers
packages/shared  EventSchema, clasificadores, topics
docs/            Fuentes e implementación técnica
```

## Despliegue (Render)

El archivo `render.yaml` configura un Web Service Node. Conectar el repo en [Render](https://dashboard.render.com), desplegar el Blueprint y añadir secretos (`FIRMS_MAP_KEY`, etc.) en Environment.
