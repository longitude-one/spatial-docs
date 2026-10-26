---
title: Spatial Types 1.x
description: Installation, usage and reference documentation for the 1.x major of LongitudeOne Spatial Types.
sidebar_label: Overview
pagination_label: Spatial Types 1.x
sidebar_position: 1
---

Spatial Types provides PHP spatial types with geometric and geographic classes.
For database persistence with Doctrine, see [Doctrine Spatial](../../doctrine-spatial/index.md).

## Installation

```bash
composer require longitude-one/spatial-types:^1.0
```

## Usage

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;

$point = new Point(1, 2);
echo $point->getX(); // 1
echo $point->getY(); // 2

$lineString = new LineString([
    new Point(1, 2, 4326),
    new Point(3, 4, 4326),
    new Point(5, 6, 4326),
], 4326);
$lineString->getSrid(); // 4326
```

For the complete catalogue of concrete types, constructors, accessors, and
mutability rules, see [Instantiable spatial types](./instantiable-spatial-types.md).

## Type class hierarchy

See [Type class hierarchy](./type-class-hierarchy.md) for the complete inheritance
of abstract and concrete classes in every dimension and family.

### Types not yet available

`CurvePolygon`, `MultiCurve`,
`MultiSurface` and `TIN` do not yet have
instantiable classes. See [Instantiable spatial types](./instantiable-spatial-types.md)
for the complete coverage matrix.

## Immutability

Spatial values are immutable and safe to share: their coordinates, SRID, and
aggregate membership are set at construction time and never changed through
the public API. Use `withCoordinates()` with an immutable `Value\Coordinates`
value to represent another location, or `withSpatialReference()` to associate
the same coordinates with another declared reference. Both return new objects.

`LineString`, `Polygon`, `Triangle`, and `PolyhedralSurface` also provide
`withArrayOfCoordinates()` to create a new instance with replacement
coordinates. This preserves their family, dimension, and SRID without changing
the source object.

This prevents a value shared by other aggregates from silently changing them.
See [Immutability](./immutability.md) for the rationale, examples, and the
complete contract.

## Spatial reference system (SRS)

Every spatial object has a `Reference\SpatialReference`. Its legacy integer
projection remains available through `getSrid()`, while `getSpatialReference()`
preserves the optional authority (for example `EPSG:4326`). Constructors and
factories accept either a legacy integer or a `SpatialReference` instance.

All members of an aggregate must have exactly the same spatial reference
system, including the unnamed reference represented by identifier `0`. It is
not a wildcard. Use `withSpatialReference()` (or the legacy `withSrid()`) only
to relabel coordinates; neither method performs a reprojection.

See [Spatial reference systems](./spatial-reference-systems.md) for the
strict aggregate rule, its ISO/IEC 13249-3 basis, and the distinction between
declaring a reference and transforming coordinates.

## Further reference

- [Spatial validators](./validators.md)
- [Empty MultiLineString interoperability](./empty-multilinestring-interoperability.md)
- [Library roadmap](../index.md)
