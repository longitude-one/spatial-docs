---
title: Geometry families and relationships
description: Explains points, curves, surfaces, collections and their relationships independently of library APIs and database implementations.
---

## Meaning and scope

A geometry describes a spatial object through its locations, shape and structure.
Points describe locations, curves describe paths, surfaces describe areas, and
collections group geometries. The geometry model separates these meanings from
storage formats and from the classes offered by a particular library.

This page provides an **informative explanation** based on the verified Simple
Features and SQL/MM sources identified below. It does not present either model
as the complete ISO 19107:2019 schema or define LongitudeOne implementation policy.

## Informative explanation

### Families and specialization

The following diagram summarizes the Simple Features family relationships
(OGC 06-103r4, 6.1.1, Figure 1). Indentation means specialization, not containment:
a Triangle is a kind of Polygon; it is not a collection containing a Polygon.

```text
Geometry
├── Point
├── Curve
│   └── LineString
│       ├── Line
│       └── LinearRing
├── Surface
│   ├── Polygon
│   │   └── Triangle
│   └── PolyhedralSurface
│       └── TIN
└── GeometryCollection
    ├── MultiPoint
    ├── MultiCurve
    │   └── MultiLineString
    └── MultiSurface
        └── MultiPolygon
```

| Concept | Meaning in this model | OGC 06-103r4 foundation |
| --- | --- | --- |
| Point | A single location; its intrinsic dimension is zero. | 6.1.4.1 |
| Curve | A one-dimensional path whose subtype determines interpolation. | 6.1.6.1 |
| LineString | A curve joining successive points by straight segments. | 6.1.7.1 |
| Line | A LineString with exactly two points. | 6.1.7.1 |
| LinearRing | A LineString that is both closed and simple. | 6.1.7.1 |
| Surface | A two-dimensional object, represented by one or more patches. | 6.1.10.1 |
| Polygon | A planar surface with an exterior ring and optional interior rings defining holes. | 6.1.11.1 |
| Triangle | A Polygon with three distinct, non-collinear vertices and no holes. | 6.1.11.1 |
| PolyhedralSurface | Connected Polygon patches joined along shared boundary segments. | 6.1.12.1 |
| TIN | A PolyhedralSurface whose patches are all Triangles. | 6.1.12.1 |

A PolyhedralSurface need not be planar as a whole. A closed polyhedral surface
can bound a solid, but the surface and the enclosed volume describe different
objects (6.1.10.1 and 6.1.12.1). The Simple Features hierarchy above contains
zero-, one- and two-dimensional objects, not a standalone solid family.

**Informative examples:** a survey marker can be modeled as a Point, a road path
as a LineString, and a parcel with a courtyard as a Polygon with a hole. A terrain
mesh can use Triangle patches in a TIN. These choices illustrate the model;
they do not imply library support or prescribe how every application models them.

### Curved and compound objects

The verified SQL/MM Committee Draft also describes curved geometry concepts:

| Concept | Meaning in the draft | Draft foundation |
| --- | --- | --- |
| CircularString | A curve interpolated by circular arc segments joined end to end. | 4.2.6, `ST_CircularString` |
| CompoundCurve | A sequence of curves joined at their endpoints. | 4.2.7, `ST_CompoundCurve` |
| CurvePolygon | A planar surface bounded by an exterior ring and optional interior rings; boundaries can be curved. | 4.2.9, `ST_CurvePolygon` |
| Polygon | A specialization of CurvePolygon whose boundary rings are linear. | 4.2.10, `ST_Polygon` |

A CompoundCurve is one continuous curve built from connected components.
It differs from a MultiCurve, which groups curves without requiring an end-to-end
chain. The draft requires each component's endpoint to equal the next component's
start point (4.2.7). This is a geometric connection, not merely list order.

These are source-specific definitions. Simple Features 1.2.1 defines LineString
as its only Curve subclass in 6.1.6.1; its reserved representation codes do not
establish the complete curved SQL/MM model. Similar names across specifications
are not evidence that every constraint or operation is equivalent.

### Collections and composition

Composition means that an object contains other objects. A Polygon contains
boundary rings; a PolyhedralSurface contains patches; a collection contains
member geometries. These relationships differ from specialization.

| Collection | Members in the Simple Features model | Foundation |
| --- | --- | --- |
| GeometryCollection | Geometries, potentially of different families. | 6.1.3.1 |
| MultiPoint | Points. | 6.1.5 |
| MultiCurve / MultiLineString | Curves / specifically LineStrings. | 6.1.8–6.1.9 |
| MultiSurface / MultiPolygon | Surfaces / specifically Polygons. | 6.1.13–6.1.14 |

A MultiPolygon's components are separate Polygon members, not the rings of one
Polygon. A hole belongs to a Polygon's boundary structure; another Polygon in a
collection is a separate member. For example, two islands can be represented by
two Polygon members, while a lake inside one island can be an interior ring of
that island's Polygon.

Collections inherit their own constraints. In Simple Features, members share the
collection's spatial reference system (6.1.3.1), and MultiPolygon interiors may
not overlap (6.1.14). A generic collection does not impose all restrictions of its
specialized subclasses.

### Dimension, boundaries and geometric properties

A geometry's intrinsic dimension describes its shape, rather than how many
coordinate components are stored. A Point with an elevation remains a point;
a surface embedded in three-dimensional space remains a surface. For a
non-homogeneous collection, Simple Features uses the greatest intrinsic dimension
among its members (6.1.2.2). The [Dimensions section](../dimensions/index.md)
owns the separate coordinate-dimensionality topic.

Boundary, emptiness, closure and simplicity answer different questions:

| Property | Informative explanation | Simple Features foundation |
| --- | --- | --- |
| Boundary | A Point has no boundary; an open curve has endpoints; a Polygon has boundary rings. | 6.1.4.1, 6.1.6.1, 6.1.11.1 |
| Empty | The geometry represents an empty point set, rather than a location at zero. | 6.1.2.2 |
| Closed curve | The curve's starting and ending locations coincide. | 6.1.6.1 |
| Simple curve | The curve does not revisit a location, except for permitted coincident endpoints. | 6.1.6.1 |
| Valid Polygon | The object satisfies Polygon constraints, including ring and interior rules. | 6.1.11.1 |

Repeating the first coordinate closes a LineString but does not by itself make it
a LinearRing: a self-crossing closed path is not simple. Likewise, recording ring
coordinates does not prove Polygon validity. Validation is distinct from storing
an object or recognizing its family.

Spatial relationships compare geometric objects. Simple Features' DE-9IM examines
intersections of their interiors, boundaries and exteriors (6.1.15.2); named
predicates such as Disjoint and Touches have precise conditions (6.1.15.3).
Coordinate-list equality and ordinary-language guesses do not define those
predicates. The [Simple Features reference](../../standards/ogc/ogc-06-103r4.md)
records their normative scope and implementation-assessment limits.

## Normative foundations

- **OGC 06-103r4, Simple Feature Access 1.2.1:** the hierarchy and concepts above
  use 6.1.1–6.1.14; spatial relationships use 6.1.15. See the
  [source and requirement record](../../standards/ogc/ogc-06-103r4.md) and its
  [official specification](https://docs.ogc.org/is/06-103r4/06-103r4.pdf).
- **ISO/IEC CD 13249-3:201x(E), 2009-01-16 Committee Draft:** curved objects use
  4.2.6–4.2.10. These citations identify the project-held draft, not a final ISO
  edition. Its [SQL/MM reference](../../standards/iso/iso-iec-13249-3.md)
  owns the source provenance and implementation comparisons.
- **ISO 19107:2019, identified by OGC 19-092:** this is the selected broader
  spatial-schema reference. Its complete normative clauses remain unavailable;
  this page does not infer their contents from older profiles. See the
  [edition and evidence limits](../../standards/iso/iso-19107.md).

## Related implementations

The geometric meanings above do not imply that every class, validity check,
spatial operation or representation is available in a particular implementation.
LongitudeOne's release-scoped [SQL/MM support record](../../standards/iso/iso-iec-13249-3.md#longitudeone-support)
and [Simple Features support record](../../standards/ogc/ogc-06-103r4.md#longitudeone-support)
identify evidenced capabilities and limitations. The
[Spatial Core geometry guide](../../spatial-core/v1/geometry/index.md) explains
library primitives. Class availability is not complete normative conformance.

Database behavior belongs in platform-specific references when available; it
cannot redefine the concepts here. Formats and spatial referencing belong in the
[Formats](../formats/index.md) and [CRS](../crs/index.md) sections.

Return to the [Geometries overview](index.md).
