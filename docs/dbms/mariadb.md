---
title: MariaDB spatial support
description: Describes MariaDB Server geometry, SRID metadata and formats with explicit evidence limits and scoped Doctrine Spatial integration.
---

## Platform and version scope

**DBMS behavior:** this page uses the **unversioned MariaDB Server reference**,
checked on 2026-10-11. Those pages do not establish one release range for every
feature. No MySQL behavior is imported as MariaDB evidence. Integration records
are pinned to **Doctrine Spatial 6.0.0**; no live server compatibility matrix
was verified for this documentation.

## Spatial behavior

| Subject | MariaDB behavior and evidence scope |
| --- | --- |
| Types/geometries | `GEOMETRY`, Point, LineString, Polygon, their three multi-types and GeometryCollection are listed in [Geometry Types][types]. A separate native geography type is not listed there. |
| Dimensions | XY is evidenced by the documented WKB Point layout. XYZ, XYM and XYZM are **not assessed**: [POINT][point-vendor] mentions optional Z/M in its summary but documents `Point(x,y)` syntax; the [WKB reference][wkb] describes type codes 1–7 and X/Y. |
| CRS/SRID | `ST_SRID` reads an associated integer; the reference says calculations assume Euclidean planar geometry. Assigning 4326 does not establish geodetic distance semantics. [ST_SRID][srid] |
| Formats | [ST_GeomFromText][wkt-constructor] accepts WKT and optional SRID; [ST_GeomFromWKB][wkb-constructor] accepts WKB and optional SRID. The latter's example exports through `ST_AsBinary`. |
| Empty values | [Geometry Types][types] demonstrates empty GeometryCollection text. A complete per-type EMPTY matrix is not assessed. |
| Restrictions | The [GIS overview][gis] distinguishes legacy bounding-rectangle predicates from the newer `ST_` shape predicates. Do not treat them as interchangeable. |

The source discrepancy around Z/M is a **vendor documentation evidence limit**,
not a normative interpretation or an authorization to change LongitudeOne.
Use a version-specific server check before relying on additional ordinates.
Internal binary-layout equivalence with MySQL and universal EWKT/EWKB support
are not established by these sources.

## Differences from standards

**Vendor subset:** the listed geometry inventory and WKB description are narrower
than the OGC 06-103r4 dimensional/type representation inventory (7.2.2–7.2.5;
8.2.8). This is an evidence-scoped comparison, not a certification of MariaDB
conformance or a blanket claim that every unlisted feature is rejected. See the
[OGC representation reference](../standards/ogc/ogc-06-103r4.md#geometry-representations).

**Vendor behavior:** SRID metadata with planar calculation and legacy
bounding-rectangle predicates remain MariaDB implementation choices. They do
not redefine [CRS concepts](../concepts/crs.md) or the
[OGC predicate requirements](../standards/ogc/ogc-06-103r4.md#dimensions-and-spatial-operations).

## LongitudeOne integration and support

Every row concerns **Doctrine Spatial 6.0.0**, MariaDB adapter. Source inspection
establishes the SQL adaptation below; vendor version constraints beyond these
records and complete function-by-function integration are not assessed.

| Feature | Implementation scope | Status | Limitations | Implementation decision | Extensions | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| XY linear geometry persistence | Doctrine Spatial 6.0.0, MariaDB | Supported | PHP Point, LineString, Polygon and their three multi-types; not all native families. | Write WKT with `ST_GeomFromText`; read WKB with `ST_AsBinary`. | None documented. | [MariaDB adapter][adapter], [PHP types][php-types] |
| Geography model | Doctrine Spatial 6.0.0, MariaDB | Partially supported | The mapping does not create a distinct geography column or geodetic calculations. | Map the generic geography type to `GEOMETRY`. | None documented. | [Adapter][adapter] |
| Preserving supplied SRID in ordinary persistence | Doctrine Spatial 6.0.0, MariaDB | Unsupported | WKT omits the object's SRID; the generated constructor supplies no SRID, and the declaration ignores the SRID parameter. | An explicit SQL constructor can supply metadata; ordinary persistence does not. | None documented. | [Adapter][adapter] |
| XYZ, XYM, XYZM and GeometryCollection PHP values | Doctrine Spatial 6.0.0, MariaDB | Unsupported | Point exposes only X/Y; no GeometryCollection PHP class. Vendor dimensional ambiguity does not alter this library limit. | Retain released PHP type scope. | None documented. | [PHP types][php-types], [Point][point] |
| Complete EMPTY round trips and raw column binary decoding | Doctrine Spatial 6.0.0, MariaDB | Not assessed | SQL selection uses `ST_AsBinary`; no universal internal storage layout or EMPTY guarantee follows. | No new compatibility behavior defined. | None documented. | [Adapter][adapter], [PHP types][php-types] |

## Related references

[DBMS overview](./index.md), [MySQL differences](./mysql.md),
[geometry families](../concepts/geometries.md),
[dimensions](../concepts/dimensions.md), [formats](../concepts/formats.md),
[SQL/MM Spatial](../standards/iso/iso-iec-13249-3.md) and
[Doctrine Spatial 6.x usage](../doctrine-spatial/v6/index.md).

[types]: https://mariadb.com/docs/server/reference/sql-structure/geometry/geometry-types
[point-vendor]: https://mariadb.com/docs/server/reference/sql-statements/geometry-constructors/geometry-constructors/point
[wkb]: https://mariadb.com/docs/server/reference/sql-statements/geometry-constructors/wkb/well-known-binary-wkb-format
[srid]: https://mariadb.com/docs/server/reference/sql-statements/geometry-constructors/geometry-properties/st_srid
[wkt-constructor]: https://mariadb.com/docs/server/reference/sql-statements/geometry-constructors/wkt/st_geomfromtext
[wkb-constructor]: https://mariadb.com/docs/server/reference/sql-statements/geometry-constructors/wkb/st_geomfromwkb
[gis]: https://mariadb.com/docs/server/reference/sql-structure/geometry/gis-features-in-533
[adapter]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/DBAL/Platform/MariaDB.php
[php-types]: https://github.com/longitude-one/doctrine-spatial/tree/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types
[point]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types/Geometry/Point.php
