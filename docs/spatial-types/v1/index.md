---
title: Spatial Types 1.x
description: >-
  Get started with LongitudeOne Spatial Types: represent positions and paths, create your first objects and choose a construction approach.
sidebar_label: Overview
pagination_label: Spatial Types 1.x
sidebar_position: 1
---

Spatial Types represents spatial data as PHP objects: a location as a Point, a runner's track as a LineString, or an area as a Polygon.
Use these objects to keep coordinates, ordered components and their declared spatial reference together in your application.
Both Cartesian coordinates (Geometry) and longitude/latitude coordinates (Geography) are supported.

## Installation

```bash
composer require longitude-one/spatial-types:^1.0
```

## Record a runner's track

A LineString stores positions in order. This example records three positions in an illustrative local Cartesian frame,
where X and Y are measured in metres. The default SRID 0 leaves the reference unnamed.
Load Composer's autoloader before creating spatial objects.

```php
require_once 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\LineStringFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;

SpatialFactory::immutable();
$track = LineStringFactory::create([
    [0, 0],
    [150, 80],
    [300, 160],
]);

$start = $track->getPoint(0);
echo $start->getX(); // 0
echo $start->getY(); // 0
$track->toArray();  // [[0, 0], [150, 80], [300, 160]]
```

The factory creates the line and its points. Immutable objects retain their values; an update returns a new object.
This example stores a path without calculating distance or speed.

## Choose how to create objects

| Approach | Use it when… | Start here |
| --- | --- | --- |
| Factories | You know the type, layout and family, and want a shared mutable/immutable selection | [Spatial Factories](./spatial-factories/index.md) |
| Builder | You want a reusable local configuration or need to assemble components progressively | [Spatial builder](./spatial-builder.md) |
| Direct constructors | You want to choose a concrete mutable or immutable class explicitly | [Spatial type catalogue](./instantiable-spatial-types.md) |

Factories share their representation setting within the same PHP execution. A builder's configuration is local; direct constructors follow the chosen class.

## Continue with your use case

- **Choose a shape:** browse the illustrated [type guides](./instantiable-spatial-types.md#type-guides) for points, curves, surfaces and collections.
- **Choose an editing strategy:** use [immutable values or mutable objects](./mutability-and-immutability/index.md) according to how you share and update data.
- **Declare a coordinate reference:** learn how [spatial reference systems](./spatial-reference-systems.md) are retained and changed without reprojection.
- **Check geometry:** understand [what Spatial Types checks](./validators.md). Construction success does not establish geometric validity; validation is explicit.
- **Persist with Doctrine:** see [Doctrine Spatial](../../doctrine-spatial/index.md).

For planned evolution and support information, see the [library roadmap](../index.md).
