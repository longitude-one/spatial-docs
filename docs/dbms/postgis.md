---
title: PostGIS spatial support
description: Describes PostGIS geometry, geography, dimensions, reference systems and formats with scoped Doctrine Spatial integration evidence.
---

## Platform and version scope

**DBMS behavior:** this reference uses the [PostGIS 3.5 manual, chapter 4][manual],
checked on 2026-10-11. PostgreSQL hosts the extension; the statements below concern
PostGIS spatial types rather than PostgreSQL's unrelated built-in geometric types.
No PostgreSQL server-version compatibility range or live test result is inferred.
Integration evidence is pinned to Doctrine Spatial 6.0.0.

## Spatial behavior

The vendor documents the following in chapter 4, sections 4.1–4.5:

| Subject | PostGIS behavior |
| --- | --- |
| Types | `geometry` uses a planar model; `geography` supports geodetic calculations with a smaller function/type subset. |
| Geometries | Point, LineString, Polygon, their multi-types and GeometryCollection; also curves, Triangle, TIN and PolyhedralSurface. Not every operation accepts every type. |
| Dimensions | Geometry coordinates can be XY, XYZ, XYM or XYZM. Storing Z/M does not mean every operation uses them. |
| CRS/SRID | SRIDs identify reference systems through `spatial_ref_sys`. `ST_SetSRID` labels coordinates; `ST_Transform` changes them between reference systems. |
| Formats | WKT/WKB and extended EWKT/EWKB; extended forms can carry SRID metadata. Geometry's canonical textual output is hexadecimal EWKB. |
| Empty/validity | Empty geometries exist. Storage also permits invalid geometry; validity checking remains an explicit operation. |

See the [vendor data model and reference-system documentation][manual] for the
per-type and per-function restrictions. Geography is not interchangeable with
geometry solely because both can contain a Point.

## Differences from standards

**Vendor extension:** EWKT's `SRID=...;` prefix and EWKB's embedded SRID are
PostGIS extensions, described in [section 4.2.1][extended]. They must not be
identified as the OGC geometry WKT/WKB layouts. Compare OGC 06-103r4 clauses
7.2.2–7.2.5 and 8.2.8 through the
[geometry representation reference](../standards/ogc/ogc-06-103r4.md#geometry-representations).

**Scope distinction:** the vendor's planar/geodetic models and additional
operations do not establish conformance of every supported feature to every
[SQL/MM edition](../standards/iso/iso-iec-13249-3.md#normative-source).
Curved types should not all be classified as proprietary: the separate SQL/MM
reference owns their normative assessment.

## LongitudeOne integration and support

**Implementation scope:** every row applies to Doctrine Spatial **6.0.0** on its
PostgreSQL/PostGIS adapter. Server versions and features beyond the rows are
not assessed. These records describe inspected code, not a deployment certification.

| Feature | Implementation scope | Status | Limitations | Implementation decision | Extensions | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Geometry persistence | Doctrine Spatial 6.0.0, PostGIS | Supported | Limited to the library's PHP types; no universal DBMS type coverage. | Write through `ST_GeomFromEWKT`; read through `ST_AsEWKB`. | None documented as LongitudeOne-specific; uses PostGIS formats. | [PostgreSql adapter][adapter] |
| Geography persistence | Doctrine Spatial 6.0.0, PostGIS | Partially supported | PHP geography types are Point, LineString and Polygon; no claim for every native geography type. | Use `ST_GeographyFromText` and `ST_AsEWKT`; missing SRID becomes 4326. | None documented. | [Adapter][adapter], [PHP types][types] |
| SRID propagation | Doctrine Spatial 6.0.0, PostGIS | Supported | Labels are transmitted; this does not transform coordinates or verify SRS validity. | Include a supplied SRID in EWKT; use subtype/SRID declarations when provided. | None documented. | [Adapter][adapter] |
| XYZ, XYM, XYZM PHP persistence | Doctrine Spatial 6.0.0, PostGIS | Unsupported | The PHP Point model exposes X/Y, not Z/M. Native dimensional support does not extend this model. | Keep the released PHP model's two ordinates. | None documented. | [Point][point], [AbstractPoint][abstract-point] |
| Curves, Triangle, TIN, PolyhedralSurface and GeometryCollection PHP values | Doctrine Spatial 6.0.0, PostGIS | Unsupported | No corresponding PHP classes in this release. | Supported classes are the six linear geometry families. | None documented. | [PHP type inventory][types] |
| Complete EMPTY round trips | Doctrine Spatial 6.0.0, PostGIS | Not assessed | Do not infer PHP empty support from native PostGIS constructors. | No new compatibility decision made. | None documented. | [PHP type inventory][types] |

## Related references

[DBMS overview](./index.md), [geometry families](../concepts/geometries/index.md),
[dimensions](../concepts/dimensions/index.md), [CRS/SRID](../concepts/crs/index.md),
[formats](../concepts/formats/index.md) and
[Doctrine Spatial 6.x usage](../doctrine-spatial/v6/index.md).

[manual]: https://postgis.net/docs/manual-3.5/using_postgis_dbmanagement.html
[extended]: https://postgis.net/docs/manual-3.5/using_postgis_dbmanagement.html#EWKB_EWKT
[adapter]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/DBAL/Platform/PostgreSql.php
[types]: https://github.com/longitude-one/doctrine-spatial/tree/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types
[point]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types/Geometry/Point.php
[abstract-point]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types/AbstractPoint.php
