# How Lichtbild generates its 3D city model previews

Source examined: https://www.lichtbild.com/citymodel/2-TmDpdyk3LbAoa5JAwLk-FUS2Ss6SgUO42P5o6XIlY
(Frankfurt, 20×20 cm, 1 km²). Observed in a browser on 2026-10-30 by intercepting `fetch` and reading the JS bundles.

## TL;DR

The browser never renders anything 3D. The front end is a **Next.js app on Vercel** with a **Leaflet** map.
When you click **"Open 3D preview"**, it POSTs the full configuration to `/api/createCity`. A backend
**builds the mesh from geodata, renders it photorealistically, composites it into lifestyle mockup photos**
and streams back progress over **Server-Sent Events**. The result is **two 1400×1400 WebP images**
served from `/api/image?id=…`.

```
Leaflet map (Stadia satellite tiles)      ← picking the area only
        │  center lat/lon, size, zoom, colors, marked OSM ids …
        ▼
POST /api/share        → {"id": "<shareId>"}      (URL becomes /citymodel/<shareId>)
POST /api/createCity   → text/event-stream
        data: PROGRESS0 … PROGRESS100
        data: keep-alive
        data: <imgUrl0>;<imgUrl1>            ← final message
GET  /api/image?id=…   → image/webp 1400×1400 (desk scene + wall scene)
POST /api/share        (again, now with images[] stored on the config)
```

## Endpoints seen

| Endpoint | What it does |
|---|---|
| `POST /api/createCity` | Main generator. JSON config in, SSE out (`PROGRESS<n>`, `keep-alive`, `ERROR`, `CANCELLED`, then `url;url`). Client has stall detection, auto-resume and a 5-minute timeout. |
| `GET /api/image?id=<ts>-<uuid>-<index>-<b64>.webp` | Serves the rendered images (Vercel cache HIT). The tail `UklGR…` is base64 of the WebP `RIFF…WEBPVP8` header. |
| `POST /api/share` | Saves the configuration and returns a short id, which is the URL slug. |
| `POST /api/buildings` | `{center, realSideWidth:1000, x, y, zoom, size}` → **GeoJSON FeatureCollection of OSM building footprints** (`id: "way/174501351"`, `relation/…`, plus `addr:*` tags). Used by "Edit markers". |
| `GET /api/elevation?locations=lat,lon\|…` | 3×3 grid of elevations around the tile (`{"results":[{latitude,longitude,elevation}]}`, the Google Elevation / OpenTopoData format). |
| `GET /api/previewHintStats` | Hints and stats for the area. |
| `GET /api/routes`, GPX upload | OSM routes or a GPX track drawn onto the model. |
| `/api/geocode-v3`, `/api/plaque`, `/api/exchange-rates`, `/api/checkout` | Search, plaque text, pricing, checkout. |
| `/api/previewError`, `/api/sendPreview` | Error telemetry, and emailing the preview. |

## The `createCity` payload (trimmed)

```json
{
  "config": {
    "type": "city",
    "center": { "latitude": 50.1099005, "longitude": 8.6745582 },
    "size": 1, "zoom": 1, "cols": 1, "rows": 1, "x": 1, "y": 1,
    "terrain": true,
    "colorscheme": {
      "type": "granite",
      "buildings":       { "ams": "#FFFFFF", "render": "#FFFFFF" },
      "floors":          { "ams": "#9B9EA0", "render": "#9B9EA0" },
      "water":           { "ams": "#A3D8E1", "render": "#A3D8E1" },
      "grass":           { "ams": "#61C680", "render": "#61C680" },
      "snow":            { "ams": "#FFFFFF", "render": "#FFFFFF" },
      "markedBuildings": { "ams": "#A3D8E1", "render": "#A3D8E1" },
      "route":           { "ams": "#A3D8E1", "render": "#A3D8E1" }
    },
    "markedBuildings": ["way/666126950", "way/666124826", "..."],
    "customBuildings": [], "editedBuildings": [], "deletedBuildings": [],
    "frameColor": { "key": "black", "color": "#2b2b2b" },
    "plaque": { "enabled": false }, "gpxRoute": [], "acrylicCover": false
  },
  "cleanView": false,
  "abTest": false,
  "language": "en",
  "requestId": "<uuid>"
}
```

## What this tells us about their pipeline

**Confirmed from traffic and code:**
- Area selection is plain **Leaflet** with **Stadia Maps `alidade_satellite`** tiles. The page says
  "the map is simply a guide".
- Buildings are identified by **OpenStreetMap ids** (`way/…`, `relation/…`). The marker editor draws about 750 OSM
  footprints as Leaflet SVG polygons.
- Terrain is used (`terrain: true`, and an elevation lookup per tile).
- The model is built from map layers: **buildings, floors (ground/streets), water, grass/trees, snow, route, marked buildings**.
- Rendering happens **on the server**. There is no WebGL canvas and no three.js on the page. The output images
  are photoreal renders of the framed model in two staged scenes (on a desk, and on a wall), with a Lichtbild watermark.
- The second render came back in about 4 s. Their UI says "about 30 s", so geometry or renders are probably cached by
  `previewImageSignature` (geometry and area) plus `previewImageVariant` (colours, frame and scene).

**Strong inferences, not verified:**
- **`ams` colours = Bambu Lab AMS** (the multi-filament unit on Bambu printers). Each layer has one colour for
  the printer filament (`ams`) and one for the renderer (`render`). The models are almost certainly **multi-colour
  FDM 3D prints in PLA** ("100 % biodegradable plastic", "fine contour lines" = layer lines).
- The sizes (20, 26, 33 cm, and 52 cm "assembled from 4 plates" = 2×2 of 26 cm) match printer build-plate limits.
- Data: OSM footprints and heights, merged with official **LoD2 3D building data** where it exists (the page
  credits © LGL Baden-Württemberg, and the FAQ says "commercial, official, open and proprietary sources"),
  plus a DEM for terrain.
- The render is probably headless **Blender** (or similar) with a fixed camera, a framed-model asset, and
  backplate or mockup scenes. The engine isn't exposed anywhere.

## How to build something similar

1. **Area picker:** Leaflet or MapLibre with a square overlay. Compute the bbox from center + size (km).
2. **Fetch data:** OSM via Overpass (`building`, `building:levels`, `height`, `water`, `landuse=grass`,
   `leisure=park`, `natural=wood`, trees, `highway`). Use LoD2/CityGML where available. Use DEM tiles
   (Copernicus GLO-30, Mapzen/AWS Terrarium, or an OpenTopoData proxy).
3. **Mesh:** project to a local metric CRS (UTM). Extrude footprints (`height` or levels × ~3 m) onto
   the terrain. Build ground, water and green layers as separate solids, one per filament colour, so the print
   is watertight. Clip to the square and add a base. Export to 3MF with per-object colours for Bambu AMS.
4. **Preview:** a headless Blender worker (`blender -b scene.blend --python build.py`) imports the mesh, applies
   colours and renders 2 cameras into mockup scenes. Write WebP, store it in S3/R2, and stream progress over SSE.
5. **Cache** on a hash of the geometry inputs and the colour/scene variant, so re-renders are cheap.
6. **Optional:** add a live three.js/WebGL viewer of the same mesh (glTF), which Lichtbild doesn't have.

Images captured from this run: `preview-desk.webp`, `preview-wall.webp`.

## Second run: London (Westminster)

- Searched "Westminster, London" with `/api/geocode-v3?q=…&language=en`, which centred on `51.5004439, -0.1265398`
  (Parliament Square). Settings: 20×20 cm (1 km²), Granite colours, black frame.
- Share link: https://www.lichtbild.com/citymodel/AuDac8BXO0G130DxHlmtfrOhczNLJ_tYmfsGyebyFw0
- **This render wasn't cached, and it took about 40 s** (Frankfurt, already cached, took about 4 s). Progress went
  0→5→10→15→20, then several `keep-alive`s, then 25→38→47→63→72→85→90→99→100, then the two image URLs. The long
  wait at about 20 % is probably the data fetch and mesh build. The jumps after that are probably the two renders.
- Visible in the render: the Thames, Westminster Bridge, Houses of Parliament / Elizabeth Tower, the Westminster Abbey area,
  St James's Park with its lake, and the London Eye. The Eye is cut off at the tile edge.
- For London, the buildings most likely come from OSM, or possibly Ordnance Survey / a commercial source. No
  area-specific credit is shown, because the LGL credit on the page belongs to a fixed Stuttgart comparison image.

Images: `london-desk.webp`, `london-wall.webp`.
