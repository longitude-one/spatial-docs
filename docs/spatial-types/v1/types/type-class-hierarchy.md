---
title: Type class hierarchy
description: Find public mutable and immutable spatial classes and choose the interfaces needed to read or edit them.
sidebar_position: 1
---

Spatial Types provides two groups of concrete classes: immutable values and mutable objects.
Their namespaces help you find the right class; their interfaces describe the operations you can use.
The trees below show namespace organization, not PHP inheritance.

## Immutable classes

Choose a dimension, then Geometry or Geography, then the spatial type with an `Immutable` suffix.
For example, an immutable XY Geometry point is `LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable`.

```text
LongitudeOne\SpatialTypes\Types
└── <dimension>
    ├── Geometry
    │   ├── PointImmutable
    │   ├── LineStringImmutable
    │   ├── CircularStringImmutable
    │   ├── CompoundCurveImmutable
    │   ├── PolygonImmutable
    │   ├── TriangleImmutable
    │   ├── PolyhedralSurfaceImmutable  (XYZ and XYZM only)
    │   ├── MultiPointImmutable
    │   ├── MultiLineStringImmutable
    │   ├── MultiPolygonImmutable
    │   └── GeometryCollectionImmutable
    └── Geography
        ├── Same spatial types as Geometry
        └── GeographyCollectionImmutable instead of GeometryCollectionImmutable
```

Immutable objects return new values through their applicable `with…` operations.
Their family and coordinate layout are fixed by the concrete class.
See [Immutability](../mutability-and-immutability/immutability.md) for an example of correcting one track without changing another.

## Mutable classes

Mutable classes live directly under the dimension namespace and have no `Immutable` suffix.
For example, `LongitudeOne\SpatialTypes\Types\Dimension2\Point` represents an editable XY point.
Its constructor selects Geometry or Geography, defaulting to Geometry.

```text
LongitudeOne\SpatialTypes\Types
└── <dimension>
    ├── Point
    ├── LineString
    ├── CircularString
    ├── CompoundCurve
    ├── Polygon
    ├── Triangle
    ├── PolyhedralSurface  (XYZ and XYZM only)
    ├── MultiPoint
    ├── MultiLineString
    ├── MultiPolygon
    └── SpatialCollection
```

The same mutable class supports either family. `SpatialCollection` is the mutable counterpart of both immutable heterogeneous collection classes.
Setters edit the receiver; supplied mutable components remain shared by reference. See [Mutability](../mutability-and-immutability/mutability.md).

## Dimension namespaces

| Coordinate layout | Replace `<dimension>` with | Ordinates |
| --- | --- | --- |
| XY | `Dimension2` | X, Y |
| XYZ | `Dimension3z` | X, Y, Z |
| XYM | `Dimension3m` | X, Y, M |
| XYZM | `Dimension4zm` | X, Y, Z, M |

Both groups support these layouts, except PolyhedralSurface, which requires a layout containing Z.
To select a type by its use case, see the [spatial type catalogue](../instantiable-spatial-types.md).

## Use interfaces for application code

Interfaces live under `LongitudeOne\SpatialTypes\Interfaces`.
Use a common interface when your code only reads a value, and a representation-specific interface when it needs to edit or replace it.

| Your code needs to… | Example interface |
| --- | --- |
| Read any spatial object's type, family or reference | `SpatialInterface` |
| Read point coordinates, regardless of mutability | `PointInterface` |
| Read ordered points from a line string | `LineStringInterface` |
| Read a curve's start and end points | `CurveInterface` |
| Copy an immutable value or replace its reference | `ImmutableSpatialInterface` |
| Replace an immutable point's coordinates | `ImmutablePointInterface` |
| Edit a point in place | `MutablePointInterface` |

For example, a function reading a point's position can accept either representation without depending on a concrete class:

```php
use LongitudeOne\SpatialTypes\Interfaces\PointInterface;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

function position(PointInterface $point): array
{
    return $point->toArray();
}

assert([1, 2] === position(new PointImmutable(1, 2)));
assert([3, 4] === position(new Point(3, 4)));
```

Composer's autoloader must already be loaded. The objects implement the same read interface while retaining their own editing contracts.
Internal abstract bases and traits are implementation details; application code can use public concrete classes and interfaces directly.

If you prefer not to select concrete classes yourself, use [spatial factories](../spatial-factories/index.md)
or the [spatial builder](../spatial-builder.md).
