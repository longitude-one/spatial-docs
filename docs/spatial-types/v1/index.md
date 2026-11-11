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
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$point = new PointImmutable(1, 2);
echo $point->getX(); // 1
echo $point->getY(); // 2

$lineString = new LineStringImmutable([
    new PointImmutable(1, 2, 4326),
    new PointImmutable(3, 4, 4326),
    new PointImmutable(5, 6, 4326),
], 4326);
$lineString->getSrid(); // 4326
```

For the complete catalogue of concrete types, constructors, accessors, and
mutability rules, see [Instantiable spatial types](./instantiable-spatial-types.md).

## Type class hierarchy

See [Type class hierarchy](./types/type-class-hierarchy.md) for the complete inheritance
of abstract and concrete classes in every dimension and family.

### Types not yet available

`CurvePolygon`, `MultiCurve`,
`MultiSurface` and `TIN` do not yet have
instantiable classes. See [Instantiable spatial types](./instantiable-spatial-types.md)
for the complete coverage matrix.

## Mutability and immutability

Immutable classes have an `Immutable` suffix and return new values through applicable `with…` methods.
Mutable classes support in-place editing through setters and retain shared mutable components by reference.
Neither strategy establishes geometric validity.
See [Mutability and Immutability](./mutability-and-immutability/index.md) for examples and a comparison.

## Spatial reference system (SRS)

Every spatial object has a `Reference\SpatialReference`. Its legacy integer
projection remains available through `getSrid()`, while `getSpatialReference()`
preserves the optional authority (for example `EPSG:4326`). Constructors and
factories accept either a legacy integer or a `SpatialReference` instance.

Supplied components retain their own references; coordinate arrays create descendants in the receiving aggregate's context.
Spatial-reference compatibility requires explicit consumer validation. Identifier 0 is an unnamed reference, not a wildcard.
Immutable reference replacements recursively relabel copies; mutable context setters propagate by default. Neither operation reprojects coordinates.

See [Spatial reference systems](./spatial-reference-systems.md) for examples.

## Further reference

- [Spatial Factories](./spatial-factories/index.md)
- [Spatial builder](./spatial-builder.md)
- [What Spatial Types checks](./validators.md)
- [Library roadmap](../index.md)
