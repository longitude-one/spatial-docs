---
title: DBMS spatial support
description: Compares PostGIS, MySQL, MariaDB and SQL Server spatial behavior and links to evidenced LongitudeOne integration records.
---

Use these references to distinguish a database's native spatial capabilities
from the subset exposed by LongitudeOne. PostgreSQL spatial integration is
covered through PostGIS; there is no separate PostgreSQL spatial reference.

## Platforms

| Platform | Spatial model | Reference scope | Integration details |
| --- | --- | --- | --- |
| PostGIS | Planar `geometry` and geodetic `geography` | PostGIS 3.5 manual | [PostGIS](./postgis.md) |
| MySQL | Geometry with Cartesian or geographic SRS | MySQL 8.4 manual | [MySQL](./mysql.md) |
| MariaDB | Geometry; SRID metadata with planar calculations | Unversioned MariaDB Server reference | [MariaDB](./mariadb.md) |
| SQL Server | Planar `geometry` and ellipsoidal `geography` | Microsoft SQL Server 17.x documentation view | [SQL Server](./sql-server.md) |

The linked pages attribute and qualify each platform claim. Documentation
scope is not a tested compatibility range. Sources were checked on 2026-10-11;
no live database interoperability tests were run for this reference.

## Reading support records

Each platform page records **Feature**, **Implementation scope**, **Status**,
**Limitations**, **Implementation decision**, **Extensions** and **Evidence**.
The [common support contract](../shared/spatial-reference-documentation-architecture.md#common-support-record)
defines `Supported`, `Partially supported`, `Unsupported` and `Not assessed`.
An unassessed feature is neither a support promise nor evidence of rejection.

Integration records are pinned to **Doctrine Spatial 6.0.0**, a released version
whose platform adapters were inspected. They do not claim that every 6.x release,
older major, future 7.x integration or standalone parser behaves identically.
[Doctrine Spatial 6.x](../doctrine-spatial/v6/index.md) owns library usage details.
Native DBMS support for a type, dimension or format does not imply PHP round-trip
support, and an adapter mapping does not establish whole-standard conformance.

## Related references

- [Geometry families](../concepts/geometries/index.md)
- [Coordinate dimensions](../concepts/dimensions/index.md)
- [CRS and SRID](../concepts/crs/index.md)
- [Spatial formats](../concepts/formats/index.md)
- [OGC Simple Feature Access 1.2.1](../standards/ogc/ogc-06-103r4.md)
- [SQL/MM Spatial source and support scope](../standards/iso/iso-iec-13249-3.md)

These standards pages own normative analysis. Platform restrictions and vendor
extensions in this domain remain DBMS behavior, even when their SQL names use
an `ST_` prefix.
