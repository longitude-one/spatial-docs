---
title: CircularString
description: Definition, illustrated examples and supported representations of CircularString in Spatial Types 1.x.
sidebar_position: 4
---

## What is a CircularString?

A CircularString is a curve made of circular arcs joined end to end. An arc is described by its start point, a point on the arc and its end point; adjacent
arcs share an endpoint.

![A semicircle through A–B–C and two joined circular arcs through D–E–F–G–H, with a smooth vertical join at F and a vertical tangent at H.](../../../assets/images/spatial-types/types/circular-string.svg)

## CircularString — Supported representations

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
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularStringImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(0, 0);
$b = new PointImmutable(1, 1);
$c = new PointImmutable(2, 0);
$d = new PointImmutable(-1, 0);
$e = new PointImmutable(0, 1);
$f = new PointImmutable(1, 0);
$g = new PointImmutable(1.5, -0.5);
$h = new PointImmutable(2, 0);

$arc = new CircularStringImmutable([$a, $b, $c]);
$joinedArcs = new CircularStringImmutable([$d, $e, $f, $g, $h]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\CircularString;

$a = new Point(0, 0);
$b = new Point(1, 1);
$c = new Point(2, 0);
$d = new Point(-1, 0);
$e = new Point(0, 1);
$f = new Point(1, 0);
$g = new Point(1.5, -0.5);
$h = new Point(2, 0);

// Using the constructor.
$arc = new CircularString([$a, $b, $c]);

// Starting with an origin and appending arcs with methods.
$joinedArcs = new CircularString([])
    ->setOrigin($d)
    ->appendArc($e, $f)
    ->appendArc($g, $h);
```
