---
title: Instantiable spatial types
description: Choose a supported spatial type, create a first object and find the guide for your use case.
---

Choose the type that matches your data, then use a [factory](./spatial-factories/index.md),
the [builder](./spatial-builder.md) or a direct constructor to create it.

## Type guides

Each guide includes an illustration and construction examples for mutable and immutable objects.

| Your data | Spatial type |
| --- | --- |
| One position | [Point](./types/point.md) |
| An ordered path of straight segments | [LineString](./types/line-string.md) |
| A path defined by circular arcs | [CircularString](./types/circular-string.md) |
| A path combining straight segments and circular arcs | [CompoundCurve](./types/compound-curve.md) |
| An area with an exterior boundary and optional holes | [Polygon](./types/polygon.md) |
| A triangular area | [Triangle](./types/triangle.md) |
| A surface assembled from polygon patches | [PolyhedralSurface](./types/polyhedral-surface.md) |
| Several points | [MultiPoint](./types/multi-point.md) |
| Several line strings | [MultiLineString](./types/multi-line-string.md) |
| Several polygons | [MultiPolygon](./types/multi-polygon.md) |
| Different types or nested collections | [SpatialCollection](./types/spatial-collection.md) |

Both Geometry and Geography support these types with XY, XYZ, XYM and XYZM coordinates,
except PolyhedralSurface, which is available only with XYZ or XYZM.
For a heterogeneous collection, immutable classes are named `GeometryCollectionImmutable` or `GeographyCollectionImmutable`;
the mutable class is `SpatialCollection`.

## Choose coordinates and representation

Geometry uses Cartesian X/Y coordinates; Geography uses longitude/latitude, in that order.
The dimension namespace determines which additional ordinates are stored:

| Layout | Namespace segment | Tuple order |
| --- | --- | --- |
| XY | `Dimension2` | X, Y |
| XYZ | `Dimension3z` | X, Y, Z |
| XYM | `Dimension3m` | X, Y, M |
| XYZM | `Dimension4zm` | X, Y, Z, M |

Immutable classes live under `LongitudeOne\SpatialTypes\Types\<dimension>\<family>` and have an `Immutable` suffix.
Mutable classes live directly under `Types\<dimension>`; their constructor's family argument defaults to Geometry.
See [Mutability and Immutability](./mutability-and-immutability/index.md) to choose an editing strategy,
or [Choosing a factory](./spatial-factories/choosing-a-factory.md) to let a factory select the concrete class.

## Create a point and a line

Composer's autoloader must already be loaded. This example uses local Cartesian X/Y coordinates with the default unnamed reference, SRID 0.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$start = new PointImmutable(0, 0);
$track = new LineStringImmutable([$start, [150, 80], [300, 160]]);

assert(0 === $start->getX());
assert([150, 80] === $track->getPoint(1)->toArray());
assert([[0, 0], [150, 80], [300, 160]] === $track->toArray());
```

The line accepts existing immutable points and coordinate tuples. Tuples create immutable descendants in the line's context;
supplied objects retain their own metadata. Mutable and immutable components cannot be mixed.
For rings, polygons and collections, see [Creating composite objects](./spatial-factories/composite-objects.md).

## Read and update values

Use `getType()`, `getFamily()` and `getSpatialReference()` to read the declared context; `getSrid()` returns its integer identifier.
`hasZ()` and `hasM()` identify the coordinate layout. Points expose their ordinates, and aggregates expose ordered members through typed getters.
`toArray()` returns coordinates without the type, family or reference.

Immutable updates return another value; mutable setters edit the receiver.
See [Immutability](./mutability-and-immutability/immutability.md) and [Mutability](./mutability-and-immutability/mutability.md) for examples.
Reference changes only relabel coordinates unless an external transformer calculates new ordinates;
see [Spatial reference systems](./spatial-reference-systems.md).

## Empty or incomplete data

A point with all ordinates null is EMPTY and returns `[]` from `toArray()`.
Partial-null coordinates retain their positions and declared layout. An aggregate with no members differs from one containing an EMPTY member.

Construction does not guarantee geometric validity: open rings, incomplete paths and incompatible references can be represented.
See [What Spatial Types checks](./validators.md) for structural guarantees and explicit validation.

## GeometryTypeEnum implementation status

If your application chooses types dynamically, query support with `SpatialTypeImplementationStatus::isFullyImplemented()`:

```php
use LongitudeOne\Core\Enum\GeometryTypeEnum;
use LongitudeOne\SpatialTypes\Implementation\SpatialTypeImplementationStatus;

assert(SpatialTypeImplementationStatus::isFullyImplemented(GeometryTypeEnum::POINT));
assert(!SpatialTypeImplementationStatus::isFullyImplemented(GeometryTypeEnum::TIN));
```

The eleven types in the catalogue are implemented for their applicable layouts; this does not certify geometric validity or full standards conformance.
Other instantiable enum types, including CurvePolygon, MultiCurve, MultiSurface and TIN, are not implemented.
Passing a non-instantiable type such as `GeometryTypeEnum::GEOMETRY` raises `InvalidValueException` rather than returning false.
