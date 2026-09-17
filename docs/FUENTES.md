# Catálogo de fuentes — Bolivia Pulse

Cadencias son del **poller al endpoint**. La UI refresca cada 15–30s vía SSE aunque el dato subyacente sea más lento. Cada widget/fuente reporta frescura real en **Salud de fuentes**.

## Tier A — casi tiempo real

| Fuente | Endpoint | Cadencia poll | Notas |
|--------|----------|---------------|-------|
| paralelo.bo | `https://paralelo.bo/api/v1/rate` | 25–30s | Dólar paralelo P2P, sin API key |
| BCB vía CUCU | `https://apibcb.cucu.bo/api/v1/tc/oficial` | 5 min | Oficial; dato nativo diario |
| USGS FDSN | `earthquake.usgs.gov/fdsnws/event/1/query` bbox BO | 20–30s | GeoJSON sismos |
| OpenSky | `/api/states/all` bbox BO | 25s | Requiere cortesía / OAuth en prod |
| Open-Meteo | forecast + air-quality | 2 min | Clima y AQI ciudades |
| GDACS RSS | `https://www.gdacs.org/xml/rss.xml` | 30s | Alertas desastres |
| GDELT DOC | `api.gdeltproject.org/api/v2/doc/doc` | 30s | Menciones Bolivia |
| ReliefWeb | `api.reliefweb.int/v1/reports` | 30s | Humanitario |
| NASA FIRMS | area CSV API | 60s | Requiere `FIRMS_MAP_KEY` |

## Tier B — RSS / noticias

| Medio | URL |
|-------|-----|
| Los Tiempos (últimas/portada/actualidad/deportes) | lostiempos.com/rss/* |
| Google News temáticos | Bolivia, dólar, bloqueos, combustibles, huelgas, protestas, seguridad, política, clima, salud, coronación, La Paz, Santa Cruz, Cochabamba |
| ReliefWeb | reports Bolivia |
| GDELT | ArtList Bolivia |

### Indicadores temáticos (derivados)

Conteo de menciones 12h: bloqueos, huelgas, asesinatos, protestas, coronaciones, combustibles, dólar, sismos, incendios, inundaciones, narco, salud, elecciones, apagones.

## Tier C — oficiales lentos

- BCB SOAP WSDL: `https://indicadores.bcb.gob.bo/ServiciosBCB/indicadores?wsdl`
- INE ANDA: `https://anda.ine.gob.bo`
- ANH resoluciones PDF (precios)
- ANH Abastecimiento: app sin API pública documentada

## Tier D — experimental

`ENABLE_SOCIAL_SCRAPERS=true` activa stub en `apps/ingest/src/pollers/social-experimental.ts`. Por defecto **off**. Preferir APIs oficiales / embeds.

## Variables de entorno

Ver `.env.example`.
