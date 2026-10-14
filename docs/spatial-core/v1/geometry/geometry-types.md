---
title: Geometry type capabilities
description: Spatial Core GeometryTypeEnum classification, instantiability, component types and the boundary with concrete classes and serialization.
---

Spatial Core classifies geometry types for other LongitudeOne libraries.
A recognized enum case, an instantiable model type, a concrete PHP class and
a representation supported by a decoder are separate capabilities.

## GeometryTypeEnum

`GeometryTypeEnum` identifies geometry types and exposes their homogeneous component and topological
dimension. Its `isInstantiable()` method returns `false` for `GEOMETRY`, `CURVE`, `SOLID`, and `SURFACE`,
and `true` for every other case, including `MULTICURVE` and `MULTISURFACE`.

The additional types `BREPSOLID`, `CIRCLE`, `CLOTHOID`, `COMPOUNDSURFACE`, `ELLIPTICALCURVE`,
`GEODESICSTRING`, `NURBSCURVE`, and `SPIRALCURVE` are instantiable. `BREPSOLID` has volume dimension,
`COMPOUNDSURFACE` has surface dimension, and the remaining types have curve dimension. None is a
multi-geometry or a geometry collection. `CIRCLE` and `GEODESICSTRING` have `POINT` components.
The other additions have no single concrete component type exposed by this enum: compound surfaces
and solid shells can use different surface subtypes, while NURBS curves use weighted control points
and knots, and the other curves use constructive parameters.

These additions follow ISO/IEC DIS 13249-3, fifth-edition ballot text N2593 dated 2015-01-25,
clauses 4.2.7–4.2.12, 4.2.20, 4.2.22, 7.4.1–7.9.1, 8.7.1, and 9.2.1. Enum membership does not imply concrete geometry classes or support for encoding or decoding these types.

```php
use LongitudeOne\Core\Enum\GeometryTypeEnum;
use LongitudeOne\Core\Enum\TopologicalDimensionEnum;

$type = GeometryTypeEnum::MULTIPOLYGON;

assert($type->isMulti());
assert($type->isInstantiable());
assert(GeometryTypeEnum::POLYGON === $type->componentType());
assert(TopologicalDimensionEnum::SURFACE === $type->topologicalDimension());
```

## Classification is separate from implementation

| Question | Owning capability |
| --- | --- |
| Which geometry types can callers identify? | `GeometryTypeEnum` cases |
| Is the model type instantiable? | `GeometryTypeEnum::isInstantiable()` |
| Is a concrete spatial value implemented? | [Spatial Types implementation status](../../../spatial-types/v1/instantiable-spatial-types.md#geometrytypeenum-implementation-status) |
| Can a representation be read or written? | The selected decoder or writer strategy |

For example, `GEOMETRY` and `SURFACE` identify non-instantiable model types.
`MULTICURVE` and `MULTISURFACE` return `true` from this enum's
`isInstantiable()` method; that result does not promise concrete classes or
standalone WKT support in another package.

## Line and ring representations

The [geometry concepts](../../../concepts/geometries.md) and
[OGC SFA reference](../../../standards/ogc/ogc-06-103r4.md) distinguish
constrained line strings from standalone representation types. A line with
two positions uses a line-string representation:

```text
LINESTRING (0 0, 10 5)
```

A ring used as a polygon boundary appears inside the polygon representation:

```text
POLYGON ((0 0, 10 0, 10 10, 0 0))
```

These examples do not introduce standalone `LINE` or `LINEARRING` decoder
support. The enum's implementation classification does not select a decoder
grammar. In particular, codes reserved by a specification and geometry types
defined by its model are different evidence; support must be checked against
the exact representation and strategy.

For the normative model, editions and representation scope, consult the
[OGC SFA reference](../../../standards/ogc/ogc-06-103r4.md) and
[SQL/MM Spatial reference](../../../standards/iso/iso-iec-13249-3.md).
