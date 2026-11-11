---
title: Spatial builder
description: Configure a reusable spatial builder, create three-dimensional points, and assemble two trail runners' tracks step by step.
---

## Purpose

`LongitudeOne\SpatialTypes\Builder\SpatialBuilder` creates spatial objects using a shared local configuration:
coordinate layout, Geometry or Geography family, spatial reference, and mutable or immutable representation.
It is useful when several objects need the same configuration or when coordinates arrive progressively, such as positions recorded during a trail run.
Geometry uses Cartesian X/Y coordinates; Geography uses longitude/latitude.

## The Builder design pattern

The Builder design pattern separates the steps used to assemble an object from the finished object.
Here, start with `SpatialBuilder::create()`, configure a context, select an aggregate such as `lineString()`, add its components, then call `build()`.
Configuration methods and aggregate selection return new builders, leaving the source context reusable; additions update the selected aggregate builder.
A point needs no assembly sequence: `point()` returns the finished point directly.

## Advantages

A reusable context avoids repeating configuration and selecting concrete class namespaces for every object.
It starts as immutable XY Geometry with SRID 0; `dimension()`, `family()`, `srid()`, `mutable()` and `immutable()` configure subsequent creations locally,
independently of the global `SpatialFactory` mode. Separate aggregate builders keep their accumulated components independent.
Each `build()` creates a distinct aggregate, and later additions do not change the membership of earlier results.
The builder assembles representations; it does not transform coordinates or establish [geometric validity](./validators.md).

## Examples

Composer's autoloader must already be loaded. These examples use an illustrative local Cartesian frame:
X is east, Y is north, and Z is elevation, all in metres. SRID 0 leaves this reference unnamed; it does not define a geographic reference system.

### Three-dimensional points

Select XYZ to store three ordinates per point. Reuse the same context for a start position and a checkpoint.

```php
use LongitudeOne\Core\Enum\CoordinateDimensionEnum;
use LongitudeOne\SpatialTypes\Builder\SpatialBuilder;

$positions = SpatialBuilder::create()
    ->dimension(CoordinateDimensionEnum::XYZ);

$start = $positions->point(0, 0, 120);
$checkpoint = $positions->point(150, 80, 145);

assert([0, 0, 120] === $start->toArray());
assert([150, 80, 145] === $checkpoint->toArray());
assert($start->hasZ());
assert(!$start->hasM());
```

The results are immutable XYZ Geometry points. Creating the checkpoint leaves the start point unchanged.

### Two trail runners' tracks

Alice and Leila start at the same location and follow different paths. A `LineString` stores each runner's recorded positions in order.
Create a separate line builder for each runner from the same XYZ context, then append their positions as they arrive.

```php
use LongitudeOne\Core\Enum\CoordinateDimensionEnum;
use LongitudeOne\SpatialTypes\Builder\SpatialBuilder;

$positions = SpatialBuilder::create()
    ->dimension(CoordinateDimensionEnum::XYZ);

$alice = $positions->lineString();
$leila = $positions->lineString();

$alice->addPoint(0, 0, 120);
$leila->addPoint(0, 0, 120);
$alice->addPoint(150, 80, 145);
$leila->addPoint(100, 140, 138);

$aliceAtCheckpoint = $alice->build();

$alice->addPoint(300, 160, 170);
$leila->addPoint(240, 260, 165);

$aliceTrack = $alice->build();
$leilaTrack = $leila->build();

assert([[0, 0, 120], [150, 80, 145]] === $aliceAtCheckpoint->toArray());
assert([[0, 0, 120], [150, 80, 145], [300, 160, 170]] === $aliceTrack->toArray());
assert([[0, 0, 120], [100, 140, 138], [240, 260, 165]] === $leilaTrack->toArray());
```

Both results are immutable XYZ line strings. Alice's earlier checkpoint result retains its two positions after another position is added to her builder.
Leila's builder accumulates only her own positions. These lines record paths, without timestamps or speed calculations.
