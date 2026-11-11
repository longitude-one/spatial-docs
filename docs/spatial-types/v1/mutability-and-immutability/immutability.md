---
title: Immutability
description: Keep shared spatial values unchanged and create explicit replacements for points, paths and declared references.
sidebar_position: 2
---

Imagine two trail runners whose tracks share the same starting point. Correcting one runner's recorded start should not silently change the other's track.
Immutable objects make that possible: an existing value stays unchanged, and an update produces another value that you choose where to use.
Their class names end in `Immutable`; mutable objects have a [separate editing API](./mutability.md).

## Replace a point without changing the original

An immutable point has no coordinate setters. Use `withCoordinates()` and keep its return value to represent another position.
`Coordinates::xy()` describes a pair of numeric or null ordinates in X/Y order.

Composer's autoloader must already be loaded. The examples use illustrative local Cartesian coordinates in metres, with the default unnamed reference (SRID 0).

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$recordedStart = new PointImmutable(0, 0);
$correctedStart = $recordedStart->withCoordinates(Coordinates::xy(5, 2));

assert([0, 0] === $recordedStart->toArray());
assert([5, 2] === $correctedStart->toArray());
assert($recordedStart !== $correctedStart);
```

Both positions remain available. Calling `withCoordinates()` without using its return value leaves you with the original point.
You may assign the result back to the same variable when you no longer need the earlier value; this replaces the variable's reference rather than editing the old object.

## Correct one track while keeping the other unchanged

A line string contains ordered points. Two immutable lines can safely share a point because neither line can change that point in place.
Use `withPoint()` to produce a corrected line, selecting the point by its index. Index 0 identifies the first point.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$start = new PointImmutable(0, 0);
$alice = new LineStringImmutable([$start, [150, 80]]);
$leila = new LineStringImmutable([$start, [100, 140]]);

$correctedAlice = $alice->withPoint(0, Coordinates::xy(5, 2));

assert([[0, 0], [150, 80]] === $alice->toArray());
assert([[0, 0], [100, 140]] === $leila->toArray());
assert([[5, 2], [150, 80]] === $correctedAlice->toArray());
assert([0, 0] === $start->toArray());
```

The original tracks and shared start remain unchanged. The corrected line is a deep copy: its spatial descendants are distinct objects too.
This makes the change explicit instead of letting an edit propagate through shared references.
Immutable aggregates accept immutable spatial components or supported coordinate arrays, which create immutable descendants; mutable components are rejected.

## Match the coordinate layout

Choose the coordinate value matching the receiver's axes:

| Point layout | Coordinate value | Ordinate order |
| --- | --- | --- |
| XY | `Coordinates::xy()` | X, Y |
| XYZ | `Coordinates::xyz()` | X, Y, Z |
| XYM | `Coordinates::xym()` | X, Y, M |
| XYZM | `Coordinates::xyzm()` | X, Y, Z, M |

For example, an XYZ point needs `Coordinates::xyz()` even when its Z value is null.
`withCoordinates()` preserves the point's concrete class, family and declared reference; it does not convert its layout.
These coordinate values accept numbers and null. Coordinate-string parsing belongs to point constructors and factories.

## Replace larger components

The same approach applies to rings, lines, polygons and collection members: select what to replace and retain the returned aggregate.

| Change | Immutable replacement |
| --- | --- |
| One point in a line or multi-point | `withPoint($pointIndex, $coordinates)` |
| One point in a polygon or triangle | `withPoint($ringIndex, $pointIndex, $coordinates)` |
| One polygon ring | `withRing($ringIndex, $coordinateTuples)` |
| One line in a multi-line string | `withLineString($lineIndex, $coordinateTuples)` |
| One polygon in a multi-polygon | `withPolygon($polygonIndex, $rings)` |
| One patch in a polyhedral surface | `withPatch($patchIndex, $rings)` |
| One heterogeneous collection member | `withElement($elementIndex, $immutableComponent)` |

For polygons, replacing the first or final point of a ring also replaces the opposite endpoint. This editing convention does not establish ring validity.
To change a compound curve's path, construct another compound from the desired immutable curve components.
Editing the PHP array returned by a plural getter changes only that local array, not the aggregate's membership.

## Copy a value or change its declared reference

Use `copy()` when you need an independent object graph with the same represented values.
It deeply copies spatial descendants while preserving each component's own complete spatial reference, including its authority.
Immutable auxiliary values such as `Coordinates` and `SpatialReference` may be shared.

`withSpatialReference()` has a different purpose: it copies the object and applies the requested reference recursively to its descendants.
`withSrid()` is the integer-reference equivalent. Neither operation recalculates ordinates.

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;

$line = new LineStringImmutable([[0, 0], [150, 80]]);
$copy = $line->copy();
$relabeled = $line->withSpatialReference(SpatialReference::epsg(3857));

assert($copy !== $line);
assert($copy->getPoint(0) !== $line->getPoint(0));
assert($copy->toArray() === $line->toArray());
assert(0 === $line->getSrid());
assert(3857 === $relabeled->getPoint(0)->getSrid());
assert($relabeled->toArray() === $line->toArray());
```

The last operation only relabels the example coordinates; it does not transform them into EPSG:3857.
For a real change of coordinate system, calculate the target ordinates with an external transformer.
See [spatial reference systems](../spatial-reference-systems.md) for reference handling.

Immutability protects against indirect edits, not invalid geometry. Constructors and replacements do not automatically check closure, continuity or topology.
Apply [geometric validation](../validators.md) explicitly when needed.
For additional replacement methods, see the [immutable API reference](../instantiable-spatial-types.md#immutability-contract).
