---
generated: 2026-05-18T23:21:46Z
query: D-01 simulacion stripSep(codigo) sobre articulos
blocker: true
resolved: 2026-05-18
resolution: Phase 31 D-17 (sobreescribe Phase 29 D-12) — nueva formula codigoToSku produce 0 colisiones
phase: 31
plan_blocked: 31-02
---

# 31-SKU-COLLISIONS — Reporte de colisiones del overwrite D-02

**Status:** ✅ RESUELTO via D-17 (2026-05-18)

> El blocker original aplicaba a la formula `stripSep` (Phase 29 D-12). La nueva
> formula `codigoToSku` (`-` → `_`, espacio → `~`) introducida en Phase 31 D-17
> produce **0 colisiones** sobre los mismos 101.021 codigos. Este archivo se
> conserva como evidencia del analisis que llevo al cambio de formula.

## Resolucion adoptada (cierre 2026-05-18)

- **D-17** en `31-CONTEXT.md`: La transformacion canonica codigo → sku ahora reemplaza
  guion medio por underscore y whitespace por tilde, manteniendo todos los demas
  caracteres sin cambio. Esto evita las 200 colisiones documentadas abajo sin
  perder ningun articulo, sin modificar codigo de negocio, y sin tener que decidir
  caso-por-caso cual articulo es "ganador".
- **Codigo:** `packages/utils/src/composer.ts` exporta `codigoToSku`. `composeSku`
  fue migrado a usar la nueva funcion. `stripSep` queda marcada como deprecated.
- **Tests:** `apps/web/src/lib/composer.test.ts` cubre tanto `codigoToSku` como los
  outputs actualizados de `composeSku`.
- **Plans:** 31-02 y 31-03 fueron actualizados para usar la nueva regex SQL y los
  fixtures de test (`TEST31_001` en lugar de `TEST31001`).
- **Preflight audit re-corrido** con la formula nueva: `sim_collision_groups: 0`,
  `sim_articulos_afectados: 0`. El audit guardado en `31-PREFLIGHT-AUDIT.md`
  confirma la resolucion.

---

## (Historico) Estado original del blocker bajo stripSep

## Resumen ejecutivo

- **200 grupos de colision** detectados al simular `UPDATE articulos SET sku = regexp_replace(codigo, '[-_.[:space:]]+', '', 'g')` (D-02).
- **402 articulos** involucrados (max 3 por grupo, promedio 2.01).
- Si Plan 31-02 ejecuta el overwrite ciego, Plan 31-03 (`ADD PRIMARY KEY (sku)`) fallaria con `duplicate key value violates unique constraint`.
- **Triaje por stock:**
  - 130 grupos (65 %): sin stock (unidades = 0).
  - 68 grupos: stock total 1-5 unidades.
  - 2 grupos: stock total 6-50 unidades.
  - 0 grupos: stock total > 50 unidades.
  - 0 grupos con todos los miembros inactivos (activo = false).
- **Patron predominante:**
  - 167 grupos (83.5 %): coexisten una version "limpia" (sin separadores) + 1 o mas versiones con separadores. Ejemplo: `10216450` vs `10216.450`.
  - 33 grupos (16.5 %): todas las versiones tienen algun separador, pero distinto entre si. Ejemplo: `0734-300-615` vs `0734.300.615`, `2137-RA X` vs `2137-RA-X` vs `2137-RAX`.

## Opciones de resolucion

### Opcion A — Merge defensivo guiado por stock

Para los 130 grupos sin stock + 68 grupos con stock muy bajo (≤ 5), elegir un `codigo` canonico por grupo (preferir version limpia o la que tenga mayor stock), borrar los otros articulos del grupo en una transaccion previa al overwrite. Riesgo: si algun comprobante referencia un codigo borrado y FK ON DELETE NO ACTION, falla. Mitigacion: query previa de uso en order_items/sale_items/purchase_items.

### Opcion B — Reasignar sku canonico distinto del stripSep

Para cada grupo, designar a uno de los codigos como "canonico" (sku = stripSep) y a los demas asignar un sku derivado (sku = stripSep || '-V2', '-V3', etc.). Mantiene los datos historicos intactos pero hace que sku ≠ stripSep(codigo) para ~200 articulos, violando la regla D-12 de Phase 29.

### Opcion C — Cambiar la formula sku

Reformular la transformacion para que mantenga unicidad. Por ejemplo: `sku = regexp_replace(codigo, '\s', '', 'g')` (solo remover whitespace, mantener -, \_, .). Esto resuelve los grupos donde la diferencia es solo whitespace pero no resuelve los que mezclan - vs . o variantes con guiones intermedios.

### Opcion D — Revisar uno por uno

Plan separado de "cleanup pre-Phase-31" que dedique tiempo a auditar las 200 colisiones, decidir caso por caso (merge, mantener separado, eliminar, renombrar). Mas seguro pero mas costoso en tiempo.

## Detalle completo: 200 grupos de colision

Ordenado por unidades totales del grupo descendente.

| sku_sim      | dup_count | codigos                           | unidades_total | algun_activo |
| ------------ | --------- | --------------------------------- | -------------- | ------------ |
| BD3011       | 2         | BD-3011, BD3011                   | 10             | t            |
| AC/30RAC18   | 2         | AC/30-RA C18, AC/30-RAC18         | 6              | t            |
| 2137RAXX     | 3         | 2137-RA XX, 2137-RA-XX, 2137-RAXX | 5              | t            |
| FD/83X       | 2         | FD/83 X, FD/83X                   | 5              | t            |
| M570         | 2         | M-570, M570                       | 5              | t            |
| FD/85X       | 2         | FD/85 X, FD/85X                   | 4              | t            |
| HC252        | 2         | HC-252, HC252                     | 4              | t            |
| 2137RAX      | 3         | 2137-RA X, 2137-RA-X, 2137-RAX    | 3              | t            |
| AC/18XX      | 2         | AC/18 XX, AC/18XX                 | 3              | t            |
| CA/33XX      | 2         | CA/33 XX, CA/33XX                 | 3              | t            |
| MB/145X      | 2         | MB/145 X, MB/145X                 | 3              | t            |
| MB/146X      | 2         | MB/146 X, MB/146X                 | 3              | t            |
| 2137RAXXX    | 2         | 2137-RA XXX, 2137-RAXXX           | 2              | t            |
| 9244XX       | 2         | 9244 XX, 9244XX                   | 2              | t            |
| 9245XX       | 2         | 9245 XX, 9245XX                   | 2              | t            |
| AC/10X       | 2         | AC/10 X, AC/10X                   | 2              | t            |
| AC/11X       | 2         | AC/11 X, AC/11X                   | 2              | t            |
| CA/33X       | 2         | CA/33 X, CA/33X                   | 2              | t            |
| EM8110       | 2         | EM-8110, EM8110                   | 2              | t            |
| FD/72XXX     | 2         | FD/72 XXX, FD/72XXX               | 2              | t            |
| FD/77X       | 2         | FD/77 X, FD/77X                   | 2              | t            |
| FD/85XX      | 2         | FD/85 XX, FD/85XX                 | 2              | t            |
| HC153        | 2         | HC-153, HC153                     | 2              | t            |
| MB/161XX     | 2         | MB/161 XX, MB/161XX               | 2              | t            |
| MB/182XX     | 2         | MB/182 XX, MB/182XX               | 2              | t            |
| MB/183RAX    | 2         | MB/183-RA X, MB/183-RAX           | 2              | t            |
| MB/184RAXX   | 2         | MB/184-RA XX, MB/184-RAXX         | 2              | t            |
| MB/186RAX    | 2         | MB/186-RA X, MB/186-RAX           | 2              | t            |
| MB/193X      | 2         | MB/193 X, MB/193X                 | 2              | t            |
| SV/229XX     | 2         | SV/229 XX, SV/229XX               | 2              | t            |
| SV/230XX     | 2         | SV/230 XX, SV/230XX               | 2              | t            |
| 2034FNC      | 2         | 2034-FNC, 2034FNC                 | 1              | t            |
| 2047FNC      | 2         | 2047-FNC, 2047FNC                 | 1              | t            |
| 4515GRA      | 2         | 4515-G RA, 4515-GRA               | 1              | t            |
| 4564AX       | 2         | 4564-A X, 4564-AX                 | 1              | t            |
| 4564AXX      | 2         | 4564-A XX, 4564-AXX               | 1              | t            |
| 4644AXX      | 2         | 4644-A XX, 4644-AXX               | 1              | t            |
| 46K083       | 2         | 46-K083, 46K083                   | 1              | t            |
| 46K169       | 2         | 46-K169, 46K169                   | 1              | t            |
| 46K177       | 2         | 46-K177, 46K177                   | 1              | t            |
| 5854DVTH     | 2         | 5854-DVTH, 5854DVTH               | 1              | t            |
| 9220XX       | 2         | 9220 XX, 9220XX                   | 1              | t            |
| 9233X        | 2         | 9233 X, 9233X                     | 1              | t            |
| 9244X        | 2         | 9244 X, 9244X                     | 1              | t            |
| AC/30RAX     | 2         | AC/30-RA X, AC/30-RAX             | 1              | t            |
| AC/30XX      | 2         | AC/30 XX, AC/30XX                 | 1              | t            |
| FD/72XX      | 2         | FD/72 XX, FD/72XX                 | 1              | t            |
| FD/77XX      | 2         | FD/77 XX, FD/77XX                 | 1              | t            |
| FD/84X       | 2         | FD/84 X, FD/84X                   | 1              | t            |
| FD/86XX      | 2         | FD/86 XX, FD/86XX                 | 1              | t            |
| KG19013741   | 2         | KG190137.4.1, KG19013741          | 1              | t            |
| MB/145C/17   | 2         | MB/145 C/17, MB/145C/17           | 1              | t            |
| MB/145XX     | 2         | MB/145 XX, MB/145XX               | 1              | t            |
| MB/180X      | 2         | MB/180 X, MB/180X                 | 1              | t            |
| MB/183RAXX   | 2         | MB/183-RA XX, MB/183-RAXX         | 1              | t            |
| MB/185XX     | 2         | MB/185 XX, MB/185XX               | 1              | t            |
| MB/188X      | 2         | MB/188 X, MB/188X                 | 1              | t            |
| MB/188XX     | 2         | MB/188 XX, MB/188XX               | 1              | t            |
| MB/191X      | 2         | MB/191 X, MB/191X                 | 1              | t            |
| MB/191XX     | 2         | MB/191 XX, MB/191XX               | 1              | t            |
| SV/223RAX    | 2         | SV/223-RA X, SV/223-RAX           | 1              | t            |
| SV/223RAXX   | 2         | SV/223-RA XX, SV/223-RAXX         | 1              | t            |
| SV/223X      | 2         | SV/223 X, SV/223X                 | 1              | t            |
| SV/224XX     | 2         | SV/224 XX, SV/224XX               | 1              | t            |
| SV/226XX     | 2         | SV/226 XX, SV/226XX               | 1              | t            |
| SV/227X      | 2         | SV/227 X, SV/227X                 | 1              | t            |
| SV/230X      | 2         | SV/230 X, SV/230X                 | 1              | t            |
| VV/288X      | 2         | VV/288 X, VV/288X                 | 1              | t            |
| VV/288XX     | 2         | VV/288 XX, VV/288XX               | 1              | t            |
| VV/289XX     | 2         | VV/289 XX, VV/289XX               | 1              | t            |
| 0091304120   | 2         | 0091-304-120, 0091304120          | 0              | t            |
| 0734300615   | 2         | 0734-300-615, 0734.300.615        | 0              | t            |
| 1            | 2         | 1, 1-                             | 0              | t            |
| 10053MWM     | 2         | 10.053MWM, 10053MWM               | 0              | t            |
| 10216450     | 2         | 10216.450, 10216450               | 0              | t            |
| 1071RU       | 2         | 10.71RU, 1071RU                   | 0              | t            |
| 1117094RNYC  | 2         | 1117094R-NYC, 1117094RNYC         | 0              | t            |
| 11590/20NTN  | 2         | 11590/20-NTN, 11590/20NTN         | 0              | t            |
| 1323A        | 2         | 1323 A, 1323A                     | 0              | t            |
| 2            | 2         | 2, 2-                             | 0              | t            |
| 202232AE     | 2         | 202232 AE, 202232-AE              | 0              | t            |
| 21387450     | 2         | 21387.450, 21387450               | 0              | t            |
| 21904157     | 2         | 21904.157, 21904157               | 0              | t            |
| 22329        | 2         | 2-2-329, 22329                    | 0              | t            |
| 227824       | 2         | 22.7824, 227824                   | 0              | t            |
| 230274       | 2         | 23.0274, 230274                   | 0              | t            |
| 23038A       | 2         | 23038 A, 23038A                   | 0              | t            |
| 30206ZWZ     | 2         | 30206-ZWZ, 30206ZWZ               | 0              | t            |
| 32006XATL    | 2         | 32006X-ATL, 32006XATL             | 0              | t            |
| 32U016209    | 2         | 32U01-6209, 32U016209             | 0              | t            |
| 46K010       | 2         | 46-K010, 46K010                   | 0              | t            |
| 46K153       | 2         | 46-K153, 46K153                   | 0              | t            |
| 46K167       | 2         | 46-K167, 46K167                   | 0              | t            |
| 46K175T      | 2         | 46-K175T, 46K175T                 | 0              | t            |
| 46K549       | 2         | 46-K549, 46K549                   | 0              | t            |
| 5012C1054SB  | 2         | 5012-C1054SB, 5012C1054SB         | 0              | t            |
| 50150        | 2         | 50-150, 50150                     | 0              | t            |
| 509043R      | 2         | 509043-R, 509043R                 | 0              | t            |
| 510A         | 2         | 5-10A, 510 A                      | 0              | t            |
| 5202         | 2         | 5-202, 5202                       | 0              | t            |
| 5352VTH      | 2         | 5352-VTH, 5352VTH                 | 0              | t            |
| 5556AVTH     | 2         | 5556-AVTH, 5556AVTH               | 0              | t            |
| 63032RSATL   | 2         | 63032RS-ATL, 6303-2RS-ATL         | 0              | t            |
| 63032RSNSK   | 2         | 63032RSNSK, 6303-2RS-NSK          | 0              | t            |
| 63032RSNTN   | 2         | 63032RS-NTN, 6303-2RS-NTN         | 0              | t            |
| 63032RSZKL   | 2         | 63032RS-ZKL, 6303-2RS-ZKL         | 0              | t            |
| 739620VTH    | 2         | 7396-20VTH, 739620VTH             | 0              | t            |
| 88107MBS     | 2         | 88107-MBS, 88107MBS               | 0              | t            |
| 91230006RI   | 2         | 91-23-0006RI, 91230006RI          | 0              | t            |
| 922903290446 | 2         | 9229-03290-446, 922903290446      | 0              | t            |
| B47GATES     | 2         | B-47GATES, B47-GATES              | 0              | t            |
| BA402062X    | 2         | BA402062-X, BA402062X             | 0              | t            |
| BA402067X    | 2         | BA402067-X, BA402067X             | 0              | t            |
| BA402069X    | 2         | BA402069-X, BA402069X             | 0              | t            |
| C1502/IR1502 | 2         | C1502/IR1502, C1502/IR1502-       | 0              | t            |
| CI137/7      | 2         | CI-137/7, CI137/7                 | 0              | t            |
| CT373/2VE    | 2         | CT-373/2VE, CT373/2VE             | 0              | t            |
| CT373/3VE    | 2         | CT-373/3VE, CT373/3VE             | 0              | t            |
| CT373/4VE    | 2         | CT-373/4VE, CT373/4VE             | 0              | t            |
| CT373/5VE    | 2         | CT-373/5VE, CT373/5VE             | 0              | t            |
| CT373/6VE    | 2         | CT-373/6VE, CT373/6VE             | 0              | t            |
| D101         | 2         | D-101, D101                       | 0              | t            |
| D102         | 2         | D-102, D102                       | 0              | t            |
| D103         | 2         | D-103, D103                       | 0              | t            |
| D104         | 2         | D-104, D104                       | 0              | t            |
| D105         | 2         | D-105, D105                       | 0              | t            |
| D109         | 2         | D-109, D109                       | 0              | t            |
| EG414        | 2         | EG-414, EG414                     | 0              | t            |
| F008MMVE     | 2         | F0.08MMVE, F008MMVE               | 0              | t            |
| F110370INA   | 2         | F-110370INA, F110370-INA          | 0              | t            |
| F1212711CRD  | 2         | F-121271.1-CRD, F121271.1-CRD     | 0              | t            |
| F1215861CRD  | 2         | F-121586.1-CRD, F121586.1-CRD     | 0              | t            |
| F1215861FAG  | 2         | F-121586.1-FAG, F1215861-FAG      | 0              | t            |
| F122662CRD   | 2         | F-122662-CRD, F122662-CRD         | 0              | t            |
| F122662NSK   | 2         | F-122662-NSK, F122662-NSK         | 0              | t            |
| F81Z5K483AA  | 2         | F81Z-5K483-AA, F81Z5K483AA        | 0              | t            |
| F90611INA    | 2         | F-90611INA, F90611-INA            | 0              | t            |
| F94297INA    | 2         | F-94297INA, F94297-INA            | 0              | t            |
| FD1453VE     | 2         | FD-1453VE, FD1453VE               | 0              | t            |
| FZ07TEP      | 2         | FZ-07TEP, FZ07TEP                 | 0              | t            |
| H048/7       | 2         | H-048/7, H048/7                   | 0              | t            |
| H712/7       | 2         | H-712/7, H712/7                   | 0              | t            |
| HC110        | 2         | HC-110, HC110                     | 0              | t            |
| HC112        | 2         | HC-112, HC112                     | 0              | t            |
| HC217        | 2         | HC-217, HC217                     | 0              | t            |
| IR36/38      | 2         | IR-36/38, IR36/38                 | 0              | t            |
| IR5014       | 2         | IR-5014, IR5014                   | 0              | t            |
| IR5015       | 2         | IR-5015, IR5015                   | 0              | t            |
| IR60A        | 2         | IR-60A, IR60A                     | 0              | t            |
| IR60B        | 2         | IR-60B, IR60B                     | 0              | t            |
| IRM205       | 2         | IR-M-205, IR-M205                 | 0              | t            |
| JV145        | 2         | JV-145, JV145                     | 0              | t            |
| KD8004TRI    | 2         | KD-8004TRI, KD8004TRI             | 0              | t            |
| LIMITEDAAR1  | 2         | LIMITEDAAR-1, LIMITEDAAR1         | 0              | t            |
| LS0010       | 2         | LS-0010, LS0010                   | 0              | t            |
| MC1202       | 2         | MC-1202, MC1202                   | 0              | t            |
| MMACA45      | 2         | MMACA4.5, MMACA45                 | 0              | t            |
| MMJ147F      | 2         | MMJ147-F, MMJ147F                 | 0              | t            |
| MY0155802M   | 2         | MY0155802M, MY015580-2M           | 0              | t            |
| MY703600RM   | 2         | MY703600-RM, MY703600RM           | 0              | t            |
| OSE27        | 2         | OSE-27, OSE27                     | 0              | t            |
| P110         | 2         | P-110, P110                       | 0              | t            |
| PO45442      | 2         | PO-45442, PO45442                 | 0              | t            |
| RDL1305      | 2         | RDL-1305, RDL1305                 | 0              | t            |
| RWF34R       | 2         | RW-F-34R, RWF34R                  | 0              | t            |
| S15BAH       | 2         | S-15BAH, S15BAH                   | 0              | t            |
| S18BAH       | 2         | S-18BAH, S18BAH                   | 0              | t            |
| S19BAH       | 2         | S-19BAH, S19BAH                   | 0              | t            |
| S3/4BAH      | 2         | S-3/4BAH, S3/4BAH                 | 0              | t            |
| S9/16BAH     | 2         | S-9/16BAH, S9/16BAH               | 0              | t            |
| SATURNONAZ1  | 2         | SATURNONAZ-1, SATURNONAZ1         | 0              | t            |
| SKF440682A   | 2         | SKF440682-A, SKF440682A           | 0              | t            |
| SX18BAH      | 2         | SX-18BAH, SX18BAH                 | 0              | t            |
| SX24BAH      | 2         | SX-24BAH, SX24BAH                 | 0              | t            |
| SX7/8BAH     | 2         | SX-7/8BAH, SX7/8BAH               | 0              | t            |
| T22106       | 2         | T-22106, T22106                   | 0              | t            |
| T3248072M    | 2         | T-324807-2M, T324807-2M           | 0              | t            |
| T40000F      | 2         | T40000-F, T40000F                 | 0              | t            |
| TFW925A      | 2         | TFW925-A, TFW925A                 | 0              | t            |
| TKL68149     | 2         | TKL-68149, TKL68149               | 0              | t            |
| TKM88010     | 2         | TKM-88010, TKM88010               | 0              | t            |
| TKM88048     | 2         | TKM-88048, TKM88048               | 0              | t            |
| TTD3TZ7C316A | 2         | TTD3TZ-7C316A, TTD3TZ7C316A       | 0              | t            |
| TTK35140     | 2         | TTK351-40, TTK35140               | 0              | t            |
| TTK39150     | 2         | TTK391-50, TTK39150               | 0              | t            |
| TTRTVHC11    | 2         | TTRTVHC-11, TTRTVHC11             | 0              | t            |
| VAL221/18    | 2         | VAL-221/18, VAL221/18             | 0              | t            |
| VK11401      | 2         | VK-11401, VK11401                 | 0              | t            |
| VK11453AU    | 2         | VK-11453AU, VK11453AU             | 0              | t            |
| VK5047       | 2         | VK-5047, VK5047                   | 0              | t            |
| VK5052       | 2         | VK-5052, VK5052                   | 0              | t            |
| W920/34MA    | 2         | W-920/34MA, W920/34MA             | 0              | t            |
| WK714/1MA    | 2         | WK-714/1MA, WK714/1MA             | 0              | t            |
| WP11/16      | 2         | WP1-1/16, WP11/16                 | 0              | t            |
| X11010       | 2         | X-11-010, X11-010                 | 0              | t            |
| X12208       | 2         | X-12-208, X12208                  | 0              | t            |
| X31000       | 2         | X-3-1000, X31000                  | 0              | t            |
| X81011       | 2         | X-8-1011, X81011                  | 0              | t            |
| XS4U9F715DB  | 2         | XS4U-9F715-DB, XS4U9F715DB        | 0              | t            |
| Y4410667     | 2         | Y44-10667, Y4410667               | 0              | t            |
