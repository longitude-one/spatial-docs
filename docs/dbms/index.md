---
title: DBMS spatial support
description: Compares PostGIS, MySQL, MariaDB and SQL Server spatial behavior and links to evidenced LongitudeOne integration records.
sidebar_label: Overview
pagination_label: DBMS spatial support
sidebar_position: 1
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
The [6.0.0 dependency manifest][dependencies] requires `geo-parser` ^4.0.0,
`wkt-parser` ^3.0.1 and `wkb-parser` ^3.0.1. It does **not** depend on
`spatial-types`; the PHP geometry and geography classes assessed here belong to
Doctrine Spatial itself. Standalone library capabilities and future integrations
are not evidence of support in this release.

Native DBMS support for a type, dimension or format does not imply PHP round-trip
support, and an adapter mapping does not establish whole-standard conformance.

## Related references

- [Geometry families](../concepts/geometries.md)
- [Coordinate dimensions](../concepts/dimensions.md)
- [CRS and SRID](../concepts/crs.md)
- [Spatial formats](../concepts/formats.md)
- [OGC Simple Feature Access 1.2.1](../standards/ogc/ogc-06-103r4.md)
- [SQL/MM Spatial source and support scope](../standards/iso/iso-iec-13249-3.md)

These standards pages own normative analysis. Platform restrictions and vendor
extensions in this domain remain DBMS behavior, even when their SQL names use
an `ST_` prefix.

[dependencies]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/composer.json
