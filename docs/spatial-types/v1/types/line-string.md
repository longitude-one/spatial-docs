---
title: LineString
description: Definition, illustrated examples and supported representations of LineString in Spatial Types 1.x.
sidebar_position: 3
---

## What is a LineString?

A LineString is an ordered sequence of points joined by straight segments. Each consecutive pair of points defines one segment.

![A two-point segment and a four-point open line with three straight segments.](../../../assets/images/spatial-types/types/line-string.svg)

## LineString — Supported representations

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

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(6.5, 8);
$b = new PointImmutable(27.5, 18.5);
$c = new PointImmutable(43, 8);
$d = new PointImmutable(50.5, 19);
$e = new PointImmutable(59, 10);
$f = new PointImmutable(68.5, 19.5);

$segment = new LineStringImmutable([$a, $b]);
$line = new LineStringImmutable([$c, $d, $e, $f]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;

$a = new Point(6.5, 8);
$b = new Point(27.5, 18.5);
$c = new Point(43, 8);
$d = new Point(50.5, 19);
$e = new Point(59, 10);
$f = new Point(68.5, 19.5);

// Using the constructor.
$segment = new LineString([$a, $b]);

// Starting empty and adding points with methods.
$line = new LineString([])
    ->addPoint($c)
    ->addPoint($d)
    ->addPoint($e)
    ->addPoint($f);
```
