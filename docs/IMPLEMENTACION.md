# Implementación técnica — Bolivia Pulse

Documento de arquitectura, flujo de datos, módulos y despliegue del monorepo.

## 1. Objetivo

Bolivia Pulse es un dashboard web de monitoreo casi en tiempo real centrado en Bolivia. Agrega fuentes públicas (tipos de cambio, noticias RSS, sismos, focos de calor, clima, alertas, aviación, YouTube) y las presenta en una interfaz operativa con mapa, KPIs, cartelero de titulares e indicadores temáticos derivados.

No pretende sustituir cifras oficiales: los conteos de “pulso social” son señales a partir de titulares en una ventana de 12 horas.

## 2. Arquitectura del monorepo

```
apps/web          Next.js 15 (App Router) — UI, API REST, SSE, arranque del ingest
apps/ingest       Pollers HTTP/RSS, store en memoria, persistencia del bundle
packages/shared   Tipos (EventSchema), clasificadores, summarizeTopics, utilidades
data/             Persistencia local (bundle.json); opcional geo
docs/             Catálogo de fuentes e implementación
```

Gestión de paquetes: npm workspaces. Node ≥ 20 (recomendado 22).

Dependencias clave:

| Área | Tecnología |
|------|------------|
| UI | React 19, Tailwind CSS 4 |
| Mapas | MapLibre GL + react-map-gl |
| Gráficos | Apache ECharts |
| Backend UI | Next.js Route Handlers + instrumentation |
| Ingest | `tsx`, `fast-xml-parser`, `ioredis` / `pg` opcionales |

## 3. Modelo de datos

Definido en `packages/shared` y materializado en un **DashboardBundle** único:

- `generatedAt` — marca de generación del snapshot
- `kpis` — oficial / paralelo / brecha + historial para series
- `events` — ítems normalizados (dominio, título, fuente, geo opcional, urgencia)
- `ticker` — titulares rotativos derivados de eventos recientes
- `mapLayers` — puntos por capa (`sismos`, `incendios`, `alertas`, `aviones`, `eventos`)
- `topicIndicators` — menciones temáticas 12h (bloqueos, combustibles, dólar, etc.)
- `domainCounts` — distribución por dominio editorial
- `weather`, `videos`, `sourceHealth`

El clasificador `classifyDomain` y el matcher `matchTopics` operan sobre título + resumen + tags. `summarizeTopics(events)` recalcula indicadores si el bundle llega sin conteos activos.

## 4. Pipeline de ingestión

### 4.1 Ciclo

`runIngestCycle()` en `apps/ingest` ejecuta en paralelo (con aislamiento por error):

1. **economy** — paralelo.bo + tipo de cambio oficial (BCB vía proxy público)
2. **news** — RSS multi-medio + agregadores (Google News temáticos, GDELT, ReliefWeb)
3. **hazards** — USGS, FIRMS, GDACS, OpenSky, capas de mapa
4. **hazards** — USGS, FIRMS, Open-Meteo (clima/AQI), GDACS, OpenSky
5. **social** — stub experimental; solo si `ENABLE_SOCIAL_SCRAPERS=true`

Titulares y feed pasan por `dedupeByHeadline`: misma noticia (título normalizado) conserva una sola entrada según precedencia de fuente (medios locales > agregadores).

Al finalizar: `persistBundle()` escribe `data/bundle.json` y, si existe `REDIS_URL`, también la clave `dashboard:bundle`.

Cadencia por defecto: `INGEST_INTERVAL_MS=60000`. Circuit breakers / `sourceHealth` registran latencia, rachas de error y estado (`ok` | `stale` | `error`).

### 4.2 Arranque dentro de Next.js

Con `ENABLE_INGEST` distinto de `"false"`, `apps/web/src/instrumentation.ts` llama a `startIngestLoop` en runtime Node. Así un solo proceso sirve UI + pollers (adecuado para Render/Docker sin worker extra).

Alternativa: `npm run ingest` (`apps/ingest` CLI) como proceso independiente.

### 4.3 Lectura en la API

`getDashboardBundle()` (`apps/web/src/lib/bundle.ts`):

1. Carga desde disco/Redis (`loadBundle`)
2. Sanea KPIs (coerción numérica de respuestas anidadas del BCB)
3. Recompone `topicIndicators` si no hay activos pero sí eventos
4. Si no hay bundle, dispara un ciclo de ingest y construye uno

## 5. API HTTP

| Ruta | Rol |
|------|-----|
| `GET /api/bundle` | Snapshot JSON completo |
| `GET /api/stream` | Server-Sent Events; empuja bundle ~cada 60s + heartbeats |
| `GET /api/health` | `generatedAt` + `sourceHealth` (health check de despliegue) |

Todas las rutas usan `dynamic = "force-dynamic"` / runtime Node.

## 6. Cliente (UI)

### 6.1 Stream y refresco

`useDashboardStream`:

- Primer fetch a `/api/bundle` + suscripción SSE
- Fallback a polling cada 60s si SSE falla
- Throttle de aplicación en UI: mínimo ~60s entre swaps de datos
- Estados: `loading` | `ready` | `refreshing`
- `ensureTopics`: si el payload trae eventos pero indicadores vacíos, recalcula en cliente

### 6.2 SoftSection

Durante refresh el contenido **permanece visible**; solo aparece un badge con spinner. Evita “parpadeos” y pérdida de mapa WebGL por filtros CSS.

### 6.3 Paneles principales

| Componente | Función |
|------------|---------|
| `HeaderBar` | KPIs de cambio, estado de conexión, reloj BO, modo TV |
| `NewsTicker` | Cartelero dual opcional |
| `TopicIndicators` | Pulso social (grilla CSS; deriva de eventos si hace falta) |
| `MapPanel` | Capas conmutables; altura flexible alineada a economía |
| `EconomyPanel` | Oficial / paralelo / brecha + series ECharts |
| `DomainPie` / `HazardsBars` | Distribución editorial y sismos/fuegos |
| `EventsFeed` | Listado filtrable 12h |
| `WeatherPanel` / `SourceHealthPanel` | Clima/AQI y salud de fuentes |

Layout desktop: fila mapa | economía (misma altura); debajo dominio + hazards a ancho completo; luego feed y paneles secundarios.

### 6.4 Hidratación

Fechas relativas/absolutas (`RelativeTime` / `AbsoluteTime`) solo se formatean tras montaje en cliente para evitar mismatches SSR/`Date.now()`.

## 7. Persistencia y estado

| Capa | Uso |
|------|-----|
| Memoria (`store` en ingest) | Estado caliente del ciclo |
| `data/bundle.json` | Snapshot reiniciable sin Redis |
| Redis (opcional) | Compartir bundle entre instancias |
| Postgres (opcional) | Reservado vía `DATABASE_URL`; no obligatorio |

En hosts con disco efímero (p. ej. Render free), el bundle se regenera al arrancar el ingest.

## 8. Configuración

Variables relevantes (ver `.env.example`):

| Variable | Descripción |
|----------|-------------|
| `ENABLE_INGEST` | Activa loop en instrumentation |
| `INGEST_INTERVAL_MS` | Periodo del ciclo (ms) |
| `FIRMS_MAP_KEY` | Incendios NASA FIRMS |
| `REDIS_URL` / `DATABASE_URL` | Infra opcional |
| `ENABLE_SOCIAL_SCRAPERS` | Adaptadores experimentales (off) |
| `NEXT_PUBLIC_ENABLE_SOCIAL` | Flag de UI para features sociales |

## 9. Despliegue

### Local

```bash
npm install
cp .env.example .env
npm run dev
```

### Docker

`docker compose up` levanta Redis, Postgres y la imagen de `apps/web/Dockerfile` (`output: "standalone"` de Next.js).

### Render

`render.yaml` define un Web Service Node (plan free):

- Build: `npm install && npm run build -w apps/web`
- Start: `npm run start -w apps/web`
- Health: `/api/health`
- Env: ingest activo cada 60s

El plan gratuito puede dormir tras inactividad; el primer request tras el sleep es más lento.

## 10. Convenciones y límites

- Fuentes preferidas: APIs y RSS públicos/legales; scrapers sociales desactivados por defecto.
- Cadencias de poll ≠ frescura percibida en UI (SSE + throttle de 60s).
- El mapa no debe envolverse con efectos que alteren el contenedor WebGL (blur/opacity agresivos).
- Secretos solo por variables de entorno; nunca versionar `.env`.

## 11. Referencias internas

- Catálogo de fuentes y cadencias: [FUENTES.md](./FUENTES.md)
- Arranque rápido: [../README.md](../README.md)
