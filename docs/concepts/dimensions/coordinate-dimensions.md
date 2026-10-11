---
title: Coordinate layouts and dimensions
description: Explains XY, XYZ, XYM and XYZM and distinguishes coordinate count, spatial ordinates, measures and topological dimension.
---

## Meaning and scope

A coordinate layout identifies the components, or **ordinates**, attached to a
location. XY, XYZ, XYM and XYZM distinguish spatial ordinates from an optional
measure. Knowing the number of components alone is insufficient: a three-value
coordinate can describe either XYZ or XYM.

This page gives an **informative explanation** of the Simple Features and SQL/MM
models cited below. It describes concepts independently of library APIs,
database storage and serialization support.

## Informative explanation

### Coordinate layouts

| Layout | Ordered ordinates | Coordinate dimension | Spatial ordinates | Measure ordinates |
| --- | --- | ---: | ---: | ---: |
| XY | x, y | 2 | 2 | 0 |
| XYZ | x, y, z | 3 | 3 | 0 |
| XYM | x, y, m | 3 | 2 | 1 |
| XYZM | x, y, z, m | 4 | 3 | 1 |

**Coordinate dimension** here counts all ordinates in the layout, including M.
**Spatial dimension**, when used to describe the coordinate space, counts the
spatial ordinates: X and Y, plus Z when present. The measure column counts M
separately. Thus XYZM has four coordinate components, not four spatial axes.
These counts explain the layouts; they are not a statement of support by every
format, geometry type or implementation.

X and Y locate a point in its reference system. Z is an additional spatial
ordinate, often elevation or altitude, but its meaning depends on that reference
system. The letters alone do not establish axis direction, order or units; see
the [CRS section](../crs/index.md).

M associates a measurement with a location. For example, a road survey might
attach distance along a route to each sampled point. The application defines
what that measure means and its units; M is neither an elevation nor necessarily
time. Its values need not increase along a path. The conceptual distinction
between Z and M follows OGC 06-103r4, 6.1.2.1 and 6.1.2.5, and the SQL/MM draft,
4.2.1.

### Coordinate dimension and topological dimension

**Topological dimension** describes the geometry's intrinsic shape rather than
its coordinate layout: a Point is zero-dimensional, a Curve one-dimensional,
and a Surface two-dimensional in the models considered here. Adding Z or M
does not turn a point into a curve or a surface into a solid.

| Informative example | Layout | Coordinate dimension | Spatial ordinates | Topological dimension |
| --- | --- | ---: | ---: | ---: |
| Survey marker with elevation | XYZ | 3 | 3 | 0 |
| Road path with route distances | XYM | 3 | 2 | 1 |
| Terrain surface with measurements | XYZM | 4 | 3 | 2 |

The phrase “three-dimensional geometry” can therefore be ambiguous. Specify
whether it means a Z-bearing coordinate layout, an intrinsic dimension, or an
operation that actually uses Z. The [geometry model](../geometries/geometry-model.md#dimension-boundaries-and-geometric-properties)
explains intrinsic dimensions and collection behavior.

### Reading and using a layout

The tuples below are **informative examples**, not format syntax or CRS
declarations. Identical values in the third position have different meanings
depending on the declared layout.

```text
XY:   (10, 20)        x=10, y=20
XYZ:  (10, 20, 30)    x=10, y=20, z=30
XYM:  (10, 20, 30)    x=10, y=20, m=30
XYZM: (10, 20, 30, 5) x=10, y=20, z=30, m=5
```

Retain the layout when interpreting or exchanging coordinates. Counting three
values cannot distinguish a spatial height from a measure. Format declarations
and dimensional markers belong to the [Formats section](../formats/index.md)
and the [verified representation reference](../../standards/ogc/ogc-06-103r4.md#geometry-representations).

Storage and calculation are separate capabilities. In Simple Features 1.2.1,
map-geometry operations use the horizontal projection and ignore Z and M
(6.1.2.5). The SQL/MM draft separately identifies ordinary and `ST_3D*`
operations (4.2.1.1). Neither storing Z nor accepting four ordinates guarantees
that a particular operation calculates in three-dimensional space or uses M.
Check the operation's specification and implementation scope.

## Normative foundations

- **OGC 06-103r4, Simple Feature Access 1.2.1:** 6.1.2.1 identifies the four
  coordinate layouts and the meanings of Z and M; 6.1.2.2 distinguishes intrinsic
  geometry dimension; 6.1.2.5 explains measures and map-geometry operations.
  See the [dimensions requirement record](../../standards/ogc/ogc-06-103r4.md#dimensions-and-spatial-operations)
  and [official specification](https://docs.ogc.org/is/06-103r4/06-103r4.pdf).
- **ISO/IEC CD 13249-3:201x(E), 2009-01-16 Committee Draft:** 4.2.1 defines
  coordinate layouts and Z/M meanings; 4.2.1.1 distinguishes dimension,
  coordinate dimension, Z presence, measured state and ordinary/3D operations.
  See the [SQL/MM dimensions reference](../../standards/iso/iso-iec-13249-3.md#geometry-model-and-dimensions).
  These citations identify the project-held draft, not a final ISO edition;
  the standard page records the source and evidence limits.

These foundations are attributed separately. This explanation does not claim
that all operations or representation rules of the two sources are equivalent.

## Related implementations

The release-scoped [Simple Features support record](../../standards/ogc/ogc-06-103r4.md#longitudeone-support)
and [SQL/MM support record](../../standards/iso/iso-iec-13249-3.md#longitudeone-support)
identify verified LongitudeOne capabilities and limitations. The
[Spatial Core 1.x primitives guide](../../spatial-core/v1/geometry/index.md)
owns the corresponding library usage details. Layout metadata alone does not
establish geometry, serializer or spatial-operation conformance.

Database restrictions and extensions require platform-specific evidence; they
do not redefine the coordinate concepts above. No DBMS support is assessed here.

Return to the [Coordinate dimensions overview](index.md).
