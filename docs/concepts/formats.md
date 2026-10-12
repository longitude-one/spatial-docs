---
title: Spatial formats
description: Explains WKT, WKB, EWKT, EWKB, GeoJSON and database representations, distinguishing standard interchange from extensions and internal storage.
---

## Meaning and scope

A spatial format represents a geometry for storage or exchange. Encoding turns
a spatial value into that representation; decoding reads the representation
back into a spatial value. A format is distinct from the geometry model and
from the coordinate operation needed to change a reference system.

This page provides an **informative explanation** independent of library APIs.
Normative foundations, vendor extensions and implementation capabilities have
separate authority; accepting a format does not establish complete conformance.

## Informative explanation

### Formats and purposes

| Representation | Kind and authority | Typical purpose | Reference handling |
| --- | --- | --- | --- |
| Geometry WKT | Standard text; OGC / SQL/MM | Readable geometry exchange and inspection. | No embedded SRID in the cited grammars. |
| Geometry WKB | Standard binary; OGC / SQL/MM | Geometry exchange as bytes. | No embedded SRID in the cited layouts. |
| EWKT | PostGIS textual extension | Geometry text carrying additional reference information. | Can include an `SRID=...;` prefix. |
| EWKB | PostGIS binary extension | Binary exchange retaining extended geometry metadata. | Can embed SRID metadata. |
| GeoJSON | JSON interchange; RFC 7946 | Geographic geometries and application features. | Fixed geographic reference; no alternate-CRS declaration. |
| DBMS internal representation | Vendor-defined | Database or driver storage/transport. | Header or metadata depends on the vendor. |

The WKT/WKB rows refer to the editions listed under
[Normative foundations](#normative-foundations). EWKT/EWKB refer to the
[PostGIS documentation](#database-and-extension-references), not additional OGC
requirements. A hexadecimal string is a textual encoding of binary bytes;
hexadecimal WKB and hexadecimal EWKB retain their different binary layouts.

### WKT and WKB

Geometry WKT names the geometry and writes its coordinates using nested text
structures. WKB encodes the geometry type, coordinates and component structure
as bytes, with a byte-order marker. In OGC 06-103r4, 0 means big-endian and 1
little-endian; integers use 32 bits and ordinates use 64-bit IEEE 754 doubles
(8.2.1–8.2.2, 8.2.8).

The cited OGC edition covers XY, XYZ, XYM and XYZM: WKT distinguishes `Z`, `M`
and `ZM`; WKB distinguishes dimensional type codes (7.2.2–7.2.5, 8.2.8).
Z support is therefore not inherently an extension. The
[coordinate dimensions reference](./dimensions.md) explains why XYZ and
XYM are distinct despite both having three components.

**Informative WKT examples:** these illustrate the OGC Point grammars, not a
particular parser's support or a declaration of coordinate units.

```text
POINT (10 20)
POINT Z (10 20 30)
POINT M (10 20 5)
POINT ZM (10 20 30 5)
POINT EMPTY
```

Geometry WKT and CRS WKT describe different objects. The former describes a
geometry; the latter describes a reference system. Neither a geometry's numeric
tuple nor its layout supplies a complete CRS definition. See the
[CRS reference](./crs.md).

### Extended representations

PostGIS EWKT and EWKB add embedded reference information and use their own
dimensional conventions. EWKT is not simply standard WKT with mandatory SRID;
PostGIS also documents different Z/M spellings. EWKB must not be parsed by
assuming the standard WKB dimensional type-code layout.

**Informative PostGIS EWKT example:** the prefix identifies a reference; it
does not calculate new coordinates.

```text
SRID=4326;POINT(2.35 48.86)
```

Choose the agreed representation explicitly at an exchange boundary. A decoder
accepting standard WKB does not automatically accept EWKB, and acceptance by one
database does not establish acceptance by every implementation.

### GeoJSON

RFC 7946 represents geometry as JSON and additionally defines Feature objects
with properties and FeatureCollections. GeometryCollection uses `geometries`
instead of `coordinates` (3.1, 3.1.8, 3.2–3.3).

Positions use longitude then latitude in WGS 84 degrees, with optional third
ordinate for height in metres relative to the WGS 84 ellipsoid (3.1.1, 4).
Extra ordinates SHOULD NOT be used; the RFC defines no M semantics. An XYM
tuple's third value must not be silently treated as height. Adding an SRID
member does not change the RFC's coordinate-reference rules.

**Informative geometry example:** this is a geometry object, without Feature
properties or a reference-system transformation.

```json
{"type":"Point","coordinates":[2.35,48.86,30]}
```

### Exchange boundaries and information preservation

Before exchanging a value, establish the recipient's accepted format edition,
geometry types, dimensions, reference convention and empty-value behavior.
A shared format name alone does not establish an identical supported subset.

An empty geometry is not a location at zero. WKT includes `EMPTY`; GeoJSON has
its own empty-array and null rules (RFC 7946, 3.1–3.2). Binary empty encodings
must be checked against the precise source and geometry type rather than
copied between WKB, EWKB and vendor representations.

Changing format does not itself transform coordinates. Converting a measured
geometry to GeoJSON, or exporting a geometry through an interface that omits
its SRID, requires an explicit decision about preserving missing information.
Successful parsing or an internal round trip alone does not prove that the
exchange preserved Z, M, reference metadata or the geometry's meaning.

## Normative foundations

- **OGC 06-103r4, Simple Feature Access 1.2.1:** geometry WKT is defined by
  7.2.2–7.2.5; WKB by 8.2.1–8.2.8; reference-system WKT is separate in clause 9.
  See the [representation requirement record](../standards/ogc/ogc-06-103r4.md#geometry-representations)
  and [official specification](https://docs.ogc.org/is/06-103r4/06-103r4.pdf).
- **ISO/IEC CD 13249-3:201x(E), 2009-01-16 Committee Draft:** 5.1.57 and 5.1.58
  define SQL/MM geometry WKT and WKB. See the
  [SQL/MM representation reference](../standards/iso/iso-iec-13249-3.md#representations).
  These citations identify the project-held draft, not a final ISO edition;
  SQL/MM and OGC grammars are assessed separately.
- **RFC 7946, August 2016:** 3.1–3.3 define geometries and features; 3.1.1 defines
  positions; 4 defines the reference system; 6–7 cover extensions and type
  semantics. See the [GeoJSON requirement record](../standards/rfc/rfc-7946.md#relevant-requirements)
  and [published RFC](https://www.rfc-editor.org/rfc/rfc7946.html).

## Related implementations

### Database and extension references

These are **vendor behavior**, not general spatial requirements. Sources were
checked on 2026-10-11; they identify their own product or driver scope and do not
establish a LongitudeOne compatibility matrix.

| Source and scope | Representation distinction |
| --- | --- |
| [PostGIS manual, 4.2.1][postgis] (current 3.6.5dev documentation) | EWKT/EWKB are PostGIS extensions, including reference metadata and dimensional conventions. |
| [MySQL 8.4 manual, 13.4.3][mysql] | Internal geometry storage has four SRID bytes before WKB; that complete value is not bare WKB. |
| [MariaDB Server, ST_GeomFromWKB][mariadb] (unversioned reference) | The documented constructor accepts WKB and a separate optional SRID; no MySQL internal-layout equivalence is inferred. |
| [Microsoft JDBC spatial APIs][sqlserver] (support introduced in driver 6.5) | `serialize()` uses internal SQL Server spatial bytes; distinguish this driver representation from standard interchange. |

The Microsoft driver page also records API-specific format caveats. Do not
infer a byte layout from a method name or transfer a driver contract to a SQL
function. See the [DBMS overview](../dbms/index.md) and the scoped
[PostGIS](../dbms/postgis.md), [MySQL](../dbms/mysql.md),
[MariaDB](../dbms/mariadb.md) and [SQL Server](../dbms/sql-server.md)
references for platform behavior and evidenced integration limits.

### LongitudeOne capabilities

The [OGC support record](../standards/ogc/ogc-06-103r4.md#longitudeone-support),
[SQL/MM support record](../standards/iso/iso-iec-13249-3.md#longitudeone-support)
and [GeoJSON support record](../standards/rfc/rfc-7946.md#longitudeone-support)
identify assessed implementations and their limitations. Their scoped evidence
does not imply every format, type or dimension is supported by every library.
The [Spatial Decoder 1.x guide](../spatial-decoder/v1/index.md) owns
release-specific documentation; this page defines no new encoder or decoder
support promise or LongitudeOne extension.

Return to the [Spatial concepts overview](./index.md).

[postgis]: https://postgis.net/docs/using_postgis_dbmanagement.html#EWKB_EWKT
[mysql]: https://dev.mysql.com/doc/refman/8.4/en/gis-data-formats.html
[mariadb]: https://mariadb.com/docs/server/reference/sql-statements/geometry-constructors/wkb/st_geomfromwkb
[sqlserver]: https://learn.microsoft.com/en-us/sql/connect/jdbc/use-spatial-datatypes?view=sql-server-ver17
