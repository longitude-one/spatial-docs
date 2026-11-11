---
title: Triangle
description: Definition, illustrated examples and supported representations of Triangle in Spatial Types 1.x.
sidebar_position: 7
---

## What is a Triangle?

A Triangle is a Polygon with three distinct vertices and no holes. Its single exterior ring returns to its starting point, so the ring contains four
positions.

![Two triangles with three vertices each. Each exterior ring closes by repeating its first position.](../../../assets/images/spatial-types/types/triangle.svg)

## Triangle — Supported representations

Availability in Spatial Types `1.0.0-RC`:

| Coordinate layout | Geometry Mutable | Geometry Immutable | Geography Mutable | Geography Immutable |
| --- | :---: | :---: | :---: | :---: |
| XY | ✅ | ✅ | ✅ | ✅ |
| XYZ | ✅ | ✅ | ✅ | ✅ |
| XYM | ✅ | ✅ | ✅ | ✅ |
| XYZM | ✅ | ✅ | ✅ | ✅ |

## Creating the illustrated objects

The examples recreate the labelled objects above using Geometry in XY.
Composer’s autoloader must already be loaded. Variable names match the point letters in the illustration.

### Immutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\TriangleImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(7, 6.5);
$b = new PointImmutable(28.5, 6.5);
$c = new PointImmutable(7, 20);
$d = new PointImmutable(43, 6.5);
$e = new PointImmutable(68.5, 9.5);
$f = new PointImmutable(55.5, 20.5);

$firstRing = new LineStringImmutable([$a, $b, $c, $a]);
$firstTriangle = new TriangleImmutable([$firstRing]);
$secondRing = new LineStringImmutable([$d, $e, $f, $d]);
$secondTriangle = new TriangleImmutable([$secondRing]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Triangle;

$a = new Point(7, 6.5);
$b = new Point(28.5, 6.5);
$c = new Point(7, 20);
$d = new Point(43, 6.5);
$e = new Point(68.5, 9.5);
$f = new Point(55.5, 20.5);

$firstRing = new LineString([$a, $b, $c, $a]);
$firstTriangle = new Triangle([$firstRing]); // Using the constructor.
$secondRing = new LineString([$d, $e, $f, $d]);
// Starting empty and adding the exterior ring with a method.
$secondTriangle = new Triangle([])->addRing($secondRing);
```
