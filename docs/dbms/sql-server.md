---
title: SQL Server spatial support
description: Describes SQL Server geometry and geography, Z/M storage, SRID and representation limits with scoped Doctrine Spatial integration evidence.
---

## Platform and version scope

**DBMS behavior:** sources are Microsoft Learn's **SQL Server 17.x**
(`sql-server-ver17`) documentation view, checked on 2026-10-11. A documentation
view identifies the consulted source; it is not a tested compatibility range.
The vendor explicitly distinguishes restrictions at compatibility level 100
and below. LongitudeOne evidence is pinned to **Doctrine Spatial 6.0.0**.

## Spatial behavior

| Subject | SQL Server behavior and vendor source |
| --- | --- |
| Types | `geometry` is planar; `geography` is ellipsoidal. They are column types; Point and other instances are not separate column types. [Spatial overview][overview] |
| Geometries | Point, LineString, Polygon, their three multi-types and GeometryCollection; CircularString, CompoundCurve and CurvePolygon; geography also has FullGlobe. [Spatial overview][overview] |
| Dimensions | Point can store XY, XYZ, XYM and XYZM information through optional Z/M values; those values can also be `NULL`. Storage does not imply 3D computations. [Point][point-vendor] |
| CRS/SRID | Instances carry SRIDs; a column can contain different SRIDs. Binary spatial operations on different SRIDs return `NULL`. [SRID reference][srid] |
| Formats | `STAsText()` returns WKT without Z/M. `STAsBinary()` returns WKB. Internal spatial serialization is a distinct representation. [STAsText][text], [STAsBinary][binary], [JDBC spatial APIs][jdbc] |
| Restrictions | Geography polygon orientation determines the interior. Compatibility level 100 and below has hemisphere restrictions; circular arc calculations ignore Z. [Spatial overview][overview] |

**Informative SQL example:** this explicitly supplies the reference identifier
and uses a planar geometry. It is not a LongitudeOne API example.

```sql
DECLARE @shape geometry = geometry::STGeomFromText('POINT(1 2)', 0);
SELECT @shape.STAsText(), @shape.STSrid;
```

## Differences from standards

**Vendor representation:** Microsoft's [Point examples][point-vendor] accept
additional ordinates without OGC's `Z`, `M` or `ZM` WKT qualifiers, including
`NULL` placeholders. Compare the OGC 06-103r4 dimensional grammars
(7.2.3–7.2.5) through the
[representation reference](../standards/ogc/ogc-06-103r4.md#geometry-representations);
SQL Server syntax is not evidence that those grammars accept the same text.

**Vendor extension and model:** FullGlobe and geography's ellipsoidal interior
rules are SQL Server behavior. Curved types are not all proprietary merely
because they are absent from a particular OGC grammar; consult the separate
[SQL/MM reference](../standards/iso/iso-iec-13249-3.md).
The [format concept](../concepts/formats.md) separates interchange from
internal serialization; JDBC's `serialize()` contract is not the SQL
`STAsBinary()` contract.

## LongitudeOne integration and support

Every row concerns **Doctrine Spatial 6.0.0**, SQL Server adapter. Source evidence
identifies the generated SQL and model scope; live server versions, every DQL
function and dimensions beyond the PHP model are not certified by this record.

| Feature | Implementation scope | Status | Limitations | Implementation decision | Extensions | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| XY geometry persistence | Doctrine Spatial 6.0.0, SQL Server | Supported | PHP Point, LineString, Polygon and their three multi-types; not every native instance type. | Declare `GEOMETRY`, write with `geometry::STGeomFromText`, read through `.STAsBinary()`. | None documented. | [SqlServer adapter][adapter], [PHP types][types] |
| Generic geography mapping | Doctrine Spatial 6.0.0, SQL Server, `GeographyType` | Partially supported | Only the generic mapping selects this SQL path; no FullGlobe PHP model. | Declare `GEOGRAPHY`; use `geography::STGeomFromText` with SRID 4326. | None documented. | [Adapter][adapter], [Generic mapping][geography-type] |
| Geography subtype mappings to native geography | Doctrine Spatial 6.0.0, SQL Server, geography `PointType`, `LineStringType`, `PolygonType` | Unsupported | Ordinary subtype persistence selects planar storage, despite the geography PHP classes. | Declare `GEOMETRY`; use `geometry::STGeomFromText` with SRID 0 because the derived SQL type is Point, LineString or Polygon. | None documented. | [Adapter][adapter], [SQL type derivation][sql-type], [Subtype mappings][geography-subtypes] |
| Arbitrary object SRID in ordinary persistence | Doctrine Spatial 6.0.0, SQL Server | Unsupported | The object's SRID is not forwarded by ordinary persistence; a supplied SRID declaration is not enforced. | Use SRID 4326 only for generic `GeographyType`; geometry and geography subtype mappings use SRID 0. | None documented. | [Adapter][adapter] |
| Function/property SQL adaptation | Doctrine Spatial 6.0.0, SQL Server | Supported | Each DQL function still has its own accepted-platform list. | Adapt static constructors, instance methods and properties; translate `STPerimeter` to `STLength`. | None documented. | [Adapter][adapter] |
| XYZ, XYM, XYZM, curved types, GeometryCollection and FullGlobe PHP values | Doctrine Spatial 6.0.0, SQL Server | Unsupported | Point has only X/Y; additional native type classes are absent. | Keep released PHP type inventory. | None documented. | [PHP types][types], [Point][point] |
| Complete EMPTY and Z/M interchange round trips | Doctrine Spatial 6.0.0, SQL Server | Not assessed | Do not infer preservation from a SQL method name or native storage support. | No new compatibility behavior defined. | None documented. | [Adapter][adapter], [PHP types][types] |

The distinction follows the released [SQL type derivation][sql-type]:
`getSQLType()` removes `Type` from the concrete class name. The geography
subclasses do not override it, so their result is `Point`, `LineString` or
`Polygon`, rather than `Geography`. The [SQL Server adapter][adapter] checks
that result when choosing declarations and constructors; PHP geography family
membership alone does not select native geography storage. This record describes
the existing limitation without changing the adapter.

## Related references

[DBMS overview](./index.md), [geometry families](../concepts/geometries.md),
[dimensions](../concepts/dimensions.md), [CRS/SRID](../concepts/crs.md),
[formats](../concepts/formats.md) and
[Doctrine Spatial 6.x usage](../doctrine-spatial/v6/index.md).

[overview]: https://learn.microsoft.com/en-us/sql/relational-databases/spatial/spatial-data-types-overview?view=sql-server-ver17
[point-vendor]: https://learn.microsoft.com/en-us/sql/relational-databases/spatial/point?view=sql-server-ver17
[srid]: https://learn.microsoft.com/en-us/sql/relational-databases/spatial/spatial-reference-identifiers-srids?view=sql-server-ver17
[text]: https://learn.microsoft.com/en-us/sql/t-sql/spatial-geometry/stastext-geometry-data-type?view=sql-server-ver17
[binary]: https://learn.microsoft.com/en-us/sql/t-sql/spatial-geometry/stasbinary-geometry-data-type?view=sql-server-ver17
[jdbc]: https://learn.microsoft.com/en-us/sql/connect/jdbc/use-spatial-datatypes?view=sql-server-ver17
[adapter]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/DBAL/Platform/SqlServer.php
[types]: https://github.com/longitude-one/doctrine-spatial/tree/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types
[point]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/PHP/Types/Geometry/Point.php
[geography-type]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/DBAL/Types/GeographyType.php
[sql-type]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/DBAL/Types/AbstractSpatialType.php
[geography-subtypes]: https://github.com/longitude-one/doctrine-spatial/tree/42387d65d860b10e3a531b6b347c0e4f3025184e/lib/LongitudeOne/Spatial/DBAL/Types/Geography
