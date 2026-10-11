---
title: Coordinate reference systems
description: Explains coordinate reference systems, axes, reference identifiers and SRIDs, and distinguishes reference assignment from coordinate operations.
---

## Meaning and scope

A coordinate reference system (**CRS**) gives coordinates their spatial meaning.
A spatial reference identifier (**SRID**) identifies a reference; it is not the
reference definition or a calculation that changes coordinates.

This page provides an **informative explanation**, independent of library APIs
and database conventions. The Standards reference owns the verified requirements
and their edition scope.

## Informative explanation

### From numbers to locations

| Concept | Role |
| --- | --- |
| Coordinate tuple | Ordered values describing a location. |
| Coordinate system | Axes, their directions, sequence and units. |
| Datum / reference frame | Relates the coordinate system to the referenced object. |
| CRS | Normally combines a coordinate system and a datum or datum ensemble. |
| Derived CRS | Adds a defining coordinate conversion. |

These relationships follow OGC 18-005r5, 9.1.1 and 10.1. A tuple follows the CRS's
axis sequence; its value count matches the axis count. All tuples in a coordinate
set share a CRS. A dynamic CRS additionally needs a shared coordinate epoch,
identifying when the coordinates apply (7.2–7.3).

**Informative example:** the tuple `(10, 20)` alone leaves its units and axis
meaning unspecified. Interpreting it as metres in a local survey and as angular
coordinates would describe different locations. Before combining coordinate
sets, establish their references rather than comparing bare numbers.

The [coordinate layouts reference](../dimensions/index.md) explains XY, XYZ,
XYM and XYZM. A layout identifies stored components; it does not define a CRS.
An application measure M is not automatically a CRS axis or a coordinate epoch.

### CRS definitions, identifiers and SRIDs

A CRS may be given by a full description or by a register citation plus a record
identifier (OGC 18-005r5, 7.2). For example, `EPSG:4326` uses an authority name and
a code to identify a record; the number alone loses that identifying context.

| Item | What it establishes | What it does not establish |
| --- | --- | --- |
| Full CRS definition | Meaning of the reference and its components. | An implemented coordinate operation. |
| Authority and code | A reference to a registry record. | Locally available definition or transformation software. |
| SRID attached to geometry | Identification within the applicable reference catalogue. | Universal numbering across implementations. |

Simple Features describes SRID as normally a reference-catalogue key
(OGC 06-103r4, 6.1.2.2). SQL/MM separately defines identifier observation and
assignment (the verified draft, 5.1.5). Mapping a database's integer SRID to a
registry code requires that database's documented catalogue conventions.
Do not infer a universal meaning for special values such as zero.

An identifier can lead to an axis definition, but assigning it does not reorder
stored values. Check the source tuple convention, the CRS definition and the
exchange format's rules before interpreting axis order. Platform conventions
require their own evidence.

### Assigning a reference and changing coordinates

| Action | Informative explanation |
| --- | --- |
| Reference assignment | Changes the declaration attached to existing values. |
| Coordinate conversion | Changes coordinates between CRSs based on the same datum. |
| Coordinate transformation | Changes coordinates between CRSs based on different datums. |
| Point motion operation | Changes coordinates between epochs within one CRS. |

The operation distinctions follow OGC 18-005r5, 12.1. SQL/MM's identifier setter
and coordinate transformation are separate contracts (draft 5.1.5–5.1.6).

**Informative example:** correcting a missing reference on already valid survey
coordinates declares what the numbers mean. Expressing those locations in a
different reference requires the appropriate coordinate operation; replacing
the identifier alone would merely reinterpret the existing numbers.

Identify the source and target references and any required epochs before
selecting an operation. A stored identifier does not demonstrate that a library
can perform that operation or that suitable operation data is available.

## Normative foundations

- **ISO 19111:2019 through the adopted OGC 18-005r5 corrigendum, version 5.0.1:**
  7.2 covers identification; 7.3.1–7.3.2 cover coordinate metadata; 9.1.1 covers
  CRS components; 10.1 covers axes and tuples; 12.1 covers coordinate operations.
  See the [source and verified requirement record](../../standards/iso/iso-19111.md#relevant-requirements)
  and [official OGC text](https://docs.ogc.org/as/18-005r5/18-005r5.html).
  The standard page records the adopted corrigendum's provenance and scope;
  this page does not claim direct inspection of the ISO publication.
- **OGC 06-103r4, Simple Feature Access 1.2.1:** 6.1.2.1 associates geometry
  coordinates with a reference system; 6.1.2.2 describes SRID. See the
  [geometry and reference-system requirement record](../../standards/ogc/ogc-06-103r4.md#geometry-model-reference-systems-and-empty-values).
- **ISO/IEC CD 13249-3:201x(E), 2009-01-16 Committee Draft:** 5.1.5 and 5.1.6
  distinguish reference-identifier assignment and transformation. See the
  [SQL/MM reference](../../standards/iso/iso-iec-13249-3.md#spatial-references-and-empty-values).
  These citations identify the project-held draft, not a final ISO edition.

## Related implementations

The [ISO 19111 support record](../../standards/iso/iso-19111.md#longitudeone-support)
identifies LongitudeOne's assessed reference metadata, axis-validation and
coordinate-operation limitations. The
[SQL/MM support record](../../standards/iso/iso-iec-13249-3.md#longitudeone-support)
separately records transformation support. The
[Spatial Core 1.x guide](../../spatial-core/v1/geometry/index.md) owns library
primitive usage. Identifier storage is not complete CRS conformance.

No DBMS behavior is assessed here. Platform-specific catalogue mappings, axis
conventions and SRID restrictions belong in database references. Reference
encoding belongs in the [Formats section](../formats/index.md).

Return to the [Spatial concepts overview](../index.md).
