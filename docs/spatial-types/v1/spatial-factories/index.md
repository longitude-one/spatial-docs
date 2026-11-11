---
title: Spatial factories
description: Create spatial objects through type-specific factories, with examples of three-dimensional points and two trail runners' tracks.
sidebar_label: Overview
sidebar_position: 1
---

## Purpose

Spatial factories create points, lines and other spatial objects through a type-specific `create()` method.
Choose a factory for the required coordinate layout, Geometry or Geography family, and spatial type;
the shared factory mode determines whether the result is mutable or immutable.
This is useful when application code needs to create spatial objects without choosing their concrete mutable or immutable classes at every call.

## The Factory design pattern

The Factory design pattern delegates object creation to a dedicated entry point.
Here, `PointFactory::create()` or `LineStringFactory::create()` selects and constructs the concrete spatial object for you.
The factory namespace fixes the layout and family: for example, `Factory\Dimension3z\Geometry\PointFactory` creates XYZ Geometry points.
`SpatialFactory::immutable()` and `SpatialFactory::mutable()` select the representation for subsequent calls to all public type-specific factories.
Direct constructors remain available and do not consult that setting.

## Advantages

The same factory and creation arguments work with either representation, so callers can keep their construction code when the application selects another mode.
The mode defaults to immutable and is shared across consumers within the same PHP execution; changing it leaves previously created objects unchanged.
Coordinate arrays supplied to an aggregate factory create descendants in the selected representation and the factory's layout, family and reference.
For local configuration and progressive assembly, use the [spatial builder](../spatial-builder.md).
Factories construct representations without transforming coordinates or establishing [geometric validity](../validators.md).

## Examples

Composer's autoloader must already be loaded. These examples use an illustrative local Cartesian frame:
X is east, Y is north, and Z is elevation, all in metres. The omitted SRID defaults to 0, leaving the reference unnamed.
Each example explicitly selects immutable output so its result does not depend on an earlier mode selection.

### Three-dimensional points

Use the XYZ Geometry point factory to create a start position and a checkpoint, each with three ordinates.

```php
use LongitudeOne\SpatialTypes\Factory\Dimension3z\Geometry\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;

SpatialFactory::immutable();

$start = PointFactory::create(0, 0, 120);
$checkpoint = PointFactory::create(150, 80, 145);

assert([0, 0, 120] === $start->toArray());
assert([150, 80, 145] === $checkpoint->toArray());
assert($start->hasZ());
assert(!$start->hasM());
```

Both results are immutable XYZ Geometry points. Selecting `SpatialFactory::mutable()` before creation would instead produce mutable points through the same calls.

### Two trail runners' tracks

Alice and Leila start at the same location and follow different paths.
A `LineString` stores each runner's recorded positions in order. Pass each complete sequence to the XYZ Geometry line-string factory.

```php
use LongitudeOne\SpatialTypes\Factory\Dimension3z\Geometry\LineStringFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;

SpatialFactory::immutable();

$aliceTrack = LineStringFactory::create([
    [0, 0, 120],
    [150, 80, 145],
    [300, 160, 170],
]);

$leilaTrack = LineStringFactory::create([
    [0, 0, 120],
    [100, 140, 138],
    [240, 260, 165],
]);

assert([[0, 0, 120], [150, 80, 145], [300, 160, 170]] === $aliceTrack->toArray());
assert([[0, 0, 120], [100, 140, 138], [240, 260, 165]] === $leilaTrack->toArray());
assert($aliceTrack->getPoint(0) !== $leilaTrack->getPoint(0));
```

The factories create two immutable XYZ line strings and their immutable points from the supplied arrays.
The starting coordinates match, but each track owns a distinct start point created from its own tuple.
These lines record paths, without timestamps or speed calculations.

## Next steps

- [Choosing a factory](./choosing-a-factory.md): select a type, layout and family, then supply its creation arguments.
- [Mutable and immutable objects](./mutable-and-immutable.md): select the shared mode and understand its scope.
- [Creating composite objects](./composite-objects.md): combine coordinate arrays or existing components safely.
