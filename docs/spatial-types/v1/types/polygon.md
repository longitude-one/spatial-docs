---
title: Polygon
description: Definition, illustrated examples and supported representations of Polygon in Spatial Types 1.x.
sidebar_position: 6
---

## What is a Polygon?

A Polygon represents an area bounded by one exterior ring and, optionally, interior rings that form holes. Its rings are closed LineString objects.

![A polygon without holes and a polygon with one rectangular hole. The hole is excluded from the filled area.](../../../assets/images/spatial-types/types/polygon.svg)

## Polygon — Supported representations

Availability in the current version of Spatial Types:

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
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PolygonImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(6.5, 7);
$b = new PointImmutable(28.5, 7);
$c = new PointImmutable(25, 20);
$d = new PointImmutable(10.5, 18.5);
$e = new PointImmutable(43, 20);
$f = new PointImmutable(68.5, 20);
$g = new PointImmutable(68.5, 6);
$h = new PointImmutable(43, 6);
$i = new PointImmutable(50, 15.5);
$j = new PointImmutable(61.5, 15.5);
$k = new PointImmutable(61.5, 10);
$l = new PointImmutable(50, 10);

$firstRing = new LineStringImmutable([$a, $b, $c, $d, $a]);
$firstPolygon = new PolygonImmutable([$firstRing]);
$exteriorRing = new LineStringImmutable([$e, $f, $g, $h, $e]);
$interiorRing = new LineStringImmutable([$i, $j, $k, $l, $i]);
$polygonWithHole = new PolygonImmutable([$exteriorRing, $interiorRing]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Polygon;

$a = new Point(6.5, 7);
$b = new Point(28.5, 7);
$c = new Point(25, 20);
$d = new Point(10.5, 18.5);
$e = new Point(43, 20);
$f = new Point(68.5, 20);
$g = new Point(68.5, 6);
$h = new Point(43, 6);
$i = new Point(50, 15.5);
$j = new Point(61.5, 15.5);
$k = new Point(61.5, 10);
$l = new Point(50, 10);

$firstRing = new LineString([$a, $b, $c, $d, $a]);
$firstPolygon = new Polygon([$firstRing]); // Using the constructor.
$exteriorRing = new LineString([$e, $f, $g, $h, $e]);
$interiorRing = new LineString([$i, $j, $k, $l, $i]);
// Starting with the exterior ring and adding the hole with a method.
$polygonWithHole = new Polygon([$exteriorRing])->addRing($interiorRing);
```
