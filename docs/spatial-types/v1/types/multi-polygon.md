---
title: MultiPolygon
description: Definition, illustrated examples and supported representations of MultiPolygon in Spatial Types 1.x.
sidebar_position: 11
---

## What is a MultiPolygon?

A MultiPolygon groups Polygon objects into one spatial value. Each member has its own exterior ring and may have holes.

![One MultiPolygon containing two separate polygons. The second polygon has a hole.](../../../assets/images/spatial-types/types/multi-polygon.svg)

## MultiPolygon — Supported representations

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
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiPolygonImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(6.5, 7);
$b = new PointImmutable(28.5, 7.5);
$c = new PointImmutable(25, 20);
$d = new PointImmutable(10.5, 18.5);
$e = new PointImmutable(43, 20);
$f = new PointImmutable(68.5, 20);
$g = new PointImmutable(68.5, 6.5);
$h = new PointImmutable(43, 6.5);
$i = new PointImmutable(50.5, 15.5);
$j = new PointImmutable(61, 15.5);
$k = new PointImmutable(61, 10.5);
$l = new PointImmutable(50.5, 10.5);

$firstRing = new LineStringImmutable([$a, $b, $c, $d, $a]);
$firstPolygon = new PolygonImmutable([$firstRing]);
$exteriorRing = new LineStringImmutable([$e, $f, $g, $h, $e]);
$interiorRing = new LineStringImmutable([$i, $j, $k, $l, $i]);
$polygonWithHole = new PolygonImmutable([$exteriorRing, $interiorRing]);
$multiPolygon = new MultiPolygonImmutable([$firstPolygon, $polygonWithHole]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Polygon;
use LongitudeOne\SpatialTypes\Types\Dimension2\MultiPolygon;

$a = new Point(6.5, 7);
$b = new Point(28.5, 7.5);
$c = new Point(25, 20);
$d = new Point(10.5, 18.5);
$e = new Point(43, 20);
$f = new Point(68.5, 20);
$g = new Point(68.5, 6.5);
$h = new Point(43, 6.5);
$i = new Point(50.5, 15.5);
$j = new Point(61, 15.5);
$k = new Point(61, 10.5);
$l = new Point(50.5, 10.5);

$firstRing = new LineString([$a, $b, $c, $d, $a]);
$firstPolygon = new Polygon([$firstRing]);
$exteriorRing = new LineString([$e, $f, $g, $h, $e]);
$interiorRing = new LineString([$i, $j, $k, $l, $i]);
$polygonWithHole = new Polygon([$exteriorRing, $interiorRing]);
// Using the constructor.
$multiPolygon = new MultiPolygon([$firstPolygon, $polygonWithHole]);

// Alternatively, adding members with methods.
$multiPolygon = new MultiPolygon()
    ->addElement($firstPolygon)
    ->addElement($polygonWithHole);
```
