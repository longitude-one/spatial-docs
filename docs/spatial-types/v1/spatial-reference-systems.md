---
title: Spatial reference systems
description: Preserve declared component references and distinguish reference propagation from coordinate transformation.
---

Every spatial object has a `Reference\SpatialReference`: an integer identifier with an optional authority.
For example, `SpatialReference::epsg(4326)` declares EPSG:4326. `getSrid()` exposes only the integer;
use `getSpatialReference()` when the authority matters. Identifier 0 is an unnamed reference, not a wildcard.

## Supplied objects keep their reference

Constructors retain supplied components and their references without checking reference compatibility with the parent.
Coordinate arrays behave differently: newly created descendants receive the aggregate's reference.
Composer's autoloader must already be loaded for these examples.

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$point = new PointImmutable(1, 2);
$line = new LineStringImmutable([$point, [3, 4]], SpatialReference::epsg(4326));

assert($point === $line->getPoint(0));
assert(0 === $line->getPoint(0)->getSrid());
assert('EPSG' === $line->getPoint(1)->getSpatialReference()->authority);
assert(4326 === $line->getPoint(1)->getSrid());
```

Construction succeeds despite the mismatch. Applications requiring compatible references must check the complete identity, including authority,
through explicit [validation](./validators.md).

## Copying preserves individual references

Immutable `copy()` preserves every component's own complete reference, even when it differs from the parent's.
Component replacements such as `withPoint()` deeply copy unchanged components through the same contract.
In contrast, `withSpatialReference()` and its integer equivalent `withSrid()` apply the requested reference recursively to copied descendants.

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$point = new PointImmutable(1, 2, SpatialReference::epsg(4326));
$line = new LineStringImmutable([$point, [3, 4]], 0);
$copy = $line->copy();
$edited = $line->withPoint(1, Coordinates::xy(5, 6));
$relabeled = $line->withSpatialReference(SpatialReference::epsg(3857));

assert(0 === $copy->getSrid());
assert('EPSG' === $copy->getPoint(0)->getSpatialReference()->authority);
assert(4326 === $edited->getPoint(0)->getSrid());
assert($edited->getPoint(0) !== $point);
assert(3857 === $relabeled->getPoint(0)->getSrid());
assert($line->toArray() === $relabeled->toArray());
assert(4326 === $point->getSrid());
```

## Mutable context propagation

Mutable objects expose `setSpatialReference()`, `setSrid()` and `setFamily()`, returning the receiver.
Aggregate context setters propagate to descendants by default; passing `false` as the second argument changes only the receiving declaration.
This applies to paths, compound curves, polygons, surfaces, multi-objects and nested collections.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

$shared = new Point(1, 2, 4326);
$first = new LineString([$shared], 4326);
$second = new LineString([$shared], 4326);
$first->setSrid(3857, false);
assert(4326 === $shared->getSrid());
$first->setSrid(2154);
assert(2154 === $second->getPoint(0)->getSrid());
assert(4326 === $second->getSrid());
assert([1, 2] === $shared->toArray());
```

Shared descendants expose propagated changes through all their owners, while those other owners retain their own declarations.

## Relabeling is not reprojection

All these reference operations preserve ordinates. Assigning EPSG:3857 to a position expressed in EPSG:4326 does not calculate projected coordinates.
For a real change of coordinate system, calculate target ordinates with an external transformer, then create or update an object with those ordinates and the target reference.
See [immutable replacement](./mutability-and-immutability/immutability.md) and [mutable setters](./mutability-and-immutability/mutability.md).
