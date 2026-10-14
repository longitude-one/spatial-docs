---
title: MySQL spatial support
description: Describes MySQL 8.4 spatial types, dimensions, SRS handling and format restrictions with scoped Doctrine Spatial integration evidence.
---

## Platform and version scope

**DBMS behavior:** sources are the MySQL **8.4** Reference Manual, checked on
2026-10-11. They do not establish equivalent behavior in MySQL 5.7, 8.0 or
MariaDB. Integration records describe Doctrine Spatial **6.0.0** source code;
no tested server-version compatibility range is asserted.

## Spatial behavior

| Subject | MySQL 8.4 behavior and vendor source |
| --- | --- |
| Types/geometries | `GEOMETRY`, Point, LineString, Polygon, their three multi-types and GeometryCollection. A subtype column constrains its values; `GEOMETRY` accepts the supported families. [13.4.1][types] |
| Dimensions | The documented model uses X/Y coordinate pairs. XYZ, XYM and XYZM persistence is outside this model; geometric dimension returned by `ST_Dimension` is a separate concept. [13.4.2.2][geometry] |
| CRS/SRID | SRID 0 is an unbounded Cartesian plane. Nonzero SRIDs refer to defined SRSs; multi-geometry operations require matching systems. [13.4.2.2][geometry], [14.16.2][arguments] |
| Axis order | WKT constructors accept an `axis-order` option; default `srid-defined` follows the SRS. Geographic range checks apply. Do not infer longitude-first input merely from SRID 4326. [14.16.3][constructors] |
| Formats | WKT/WKB are interchange formats. Internal binary values add four SRID bytes before the WKB portion; raw column bytes are not bare WKB. [13.4.3][formats] |
| Restrictions | Only GeometryCollection can be empty; `POINT EMPTY` is unsupported. Curve and surface families beyond the listed types are unsupported. [13.4.3][formats], [14.16.7.1][properties] |

**Informative example:** this deliberately uses SRID 0 to avoid an implicit
geographic axis convention. It is SQL, not a LongitudeOne API example.

```sql
SELECT ST_AsText(ST_GeomFromText('POINT(1 2)', 0));
```

## Differences from standards

**Vendor restriction:** MySQL's XY/type/EMPTY subset is narrower than the OGC
06-103r4 WKT grammar in clauses 7.2.2–7.2.5, including its dimensional and empty
productions. The
[OGC representation reference](../standards/ogc/ogc-06-103r4.md#geometry-representations)
owns those requirements; MySQL acceptance is not their definition.

**Vendor representation:** the SRID-prefixed internal binary format is distinct
from OGC WKB structures (8.2.8). MySQL constructor axis-order options remain
[platform behavior][constructors], not a portable serialization rule.

## LongitudeOne integration and support

Every row concerns **Doctrine Spatial 6.0.0**, MySQL adapter; the MySQL 8.4
capability description above is not an assertion that this release was tested
against that server. Per-function DQL acceptance must also be checked in the
library; adapter recognition is not a promise that all spatial functions work.

| Feature | Implementation scope | Status | Limitations | Implementation decision | Extensions | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| XY linear geometry persistence | Doctrine Spatial 6.0.0, MySQL | Supported | PHP Point, LineString, Polygon and three multi-types; no universal native type coverage. | Write WKT with `ST_GeomFromText`; read WKB with `ST_AsBinary`. | None documented. | [MySql adapter][adapter], [PHP types][php-types] |
| Geography model | Doctrine Spatial 6.0.0, MySQL | Partially supported | Mapping to `GEOMETRY` does not provide a separate geography column or automatic geodetic semantics. | Declare the generic geography mapping as `GEOMETRY`. | None documented. | [Adapter][adapter] |
| Preserving supplied SRID in ordinary persistence | Doctrine Spatial 6.0.0, MySQL | Unsupported | WKT omits the object's SRID; generated constructor has one argument, and declaration omits SRID constraints. | Ordinary persistence does not forward SRID; this differs from an explicit SQL constructor. | None documented. | [Adapter][adapter] |
| SRID setter SQL adaptation | Doctrine Spatial 6.0.0, MySQL | Supported | Changing an SRID does not transform coordinates; native version support still matters. | Translate `ST_SetSRID` to MySQL `ST_SRID`. | None documented. | [Adapter][adapter] |
| XYZ, XYM, XYZM and GeometryCollection PHP values | Doctrine Spatial 6.0.0, MySQL | Unsupported | Point has only X/Y; no GeometryCollection PHP class. | Retain released PHP type scope. | None documented. | [PHP types][php-types], [Point][point] |
| Complete EMPTY round trips and geographic axis adaptation | Doctrine Spatial 6.0.0, MySQL | Not assessed | No blanket guarantee for these paths; the adapter supplies no axis-order option. | No new compatibility behavior defined. | None documented. | [Adapter][adapter], [PHP types][php-types] |

## Related references

[DBMS overview](./index.md), [MariaDB differences](./mariadb.md),
[geometry families](../concepts/geometries.md),
[dimensions](../concepts/dimensions.md), [CRS/SRID](../concepts/crs.md),
[formats](../concepts/formats.md),
[SQL/MM Spatial](../standards/iso/iso-iec-13249-3.md) and
[Doctrine Spatial 6.x usage](../doctrine-spatial/v6/index.md).

[types]: https://dev.mysql.com/doc/refman/8.4/en/spatial-type-overview.html
[geometry]: https://dev.mysql.com/doc/refman/8.4/en/gis-class-geometry.html
[arguments]: https://dev.mysql.com/doc/refman/8.4/en/spatial-function-argument-handling.html
[constructors]: https://dev.mysql.com/doc/refman/8.4/en/gis-wkt-functions.html
[formats]: https://dev.mysql.com/doc/refman/8.4/en/gis-data-formats.html
[properties]: https://dev.mysql.com/doc/refman/8.4/en/gis-general-property-functions.html
[adapter]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/DBAL/Platform/MySql.php
[php-types]: https://github.com/longitude-one/doctrine-spatial/tree/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types
[point]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types/Geometry/Point.php
