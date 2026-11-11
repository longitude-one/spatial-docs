---
title: Mutability
description: Edit mutable spatial objects with coordinate, context and component setters while understanding shared ownership.
sidebar_position: 3
---

Mutable classes live under `LongitudeOne\SpatialTypes\Types\Dimension2`, `Dimension3z`, `Dimension3m` and `Dimension4zm`.
Their successful setters return the same instance as `static`, allowing chained edits. Their spatial type and coordinate layout remain fixed.

## Coordinate setters

| Point setter | Accepted input |
| --- | --- |
| `setX()`, `setY()` | Numbers, coordinate strings handled by the parser, or null |
| `setZ()`, `setM()` | Numbers or null, only when the layout includes that axis |

Calling a setter for an unavailable Z or M axis raises `BadMethodCallException`, even with null.
Supported axes accept null independently. An all-null point is EMPTY; a partially supplied point retains its layout.

Composer's autoloader must already be loaded. Here, XYZ provides X, Y and Z, but no M:

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Point;

$point = new Point(0, 0, 120);
$same = $point->setX(150)->setY(80)->setZ(145);

assert($same === $point);
assert([150, 80, 145] === $point->toArray());
```

## Declared-context setters

| Setter | Effect |
| --- | --- |
| `setSrid(int $srid)` | Change the declared integer reference |
| `setSpatialReference(SpatialReference $reference)` | Change the complete reference, including its authority |
| `setFamily(SpatialModelEnum $family)` | Change the Geometry/Geography declaration |

These operations preserve coordinates; they do not reproject them.
On aggregates, a second boolean `$propagate` argument defaults to `true` and updates descendants in place.
Passing `false` changes only the receiver's declaration. Shared descendants expose propagated changes through their other owners too.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

$shared = new Point(0, 0, 4326);
$line = new LineString([$shared, [1, 2]], 4326);
$shared->setY(3);
assert([0, 3] === $line->getPoint(0)->toArray());

$line->setSrid(2154, false);
assert(4326 === $shared->getSrid());
$line->setSrid(3857);
assert(3857 === $shared->getSrid());
assert([0, 3] === $shared->toArray());
```

The example deliberately relabels metadata; it does not calculate coordinates in another reference system.

## Component setters

| Receiver | Replacement setters |
| --- | --- |
| LineString, CircularString | `setPoint()`, `setArrayOfCoordinates()` |
| CompoundCurve | `setCurve()`, `setCurves()` |
| Polygon, Triangle | `setPoint()`, `setRing()`, `setArrayOfCoordinates()` |
| PolyhedralSurface | `setPoint()`, `setRing()`, `setPatch()`, `setArrayOfCoordinates()` |
| MultiPoint, MultiLineString, MultiPolygon, SpatialCollection | `setElement()`, `setElements()` |

Indexed setters address existing zero-based positions; negative or missing indices raise `OutOfBoundsException`.
Supplied mutable components retain their identity and must match the receiver's layout. Immutable components are rejected rather than converted.
Coordinate-array replacement creates new mutable descendants; technical input rejection leaves the receiver unchanged.
Membership can also be edited through the applicable `add…`, `insert…` and `remove…` operations.

Edits do not repair geometry or establish validity. Apply [geometric validation](../validators.md) after editing when your application requires it.
