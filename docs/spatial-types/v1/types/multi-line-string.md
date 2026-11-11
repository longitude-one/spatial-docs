---
title: MultiLineString
description: Definition, illustrated examples and supported representations of MultiLineString in Spatial Types 1.x.
sidebar_position: 10
---

## What is a MultiLineString?

A MultiLineString groups LineString objects into one spatial value. Each member retains its own ordered sequence of points.

![One MultiLineString containing two disconnected line strings, each composed of straight segments.](../../../assets/images/spatial-types/types/multi-line-string.svg)

## MultiLineString — Supported representations

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
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiLineStringImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(6.5, 7.5);
$b = new PointImmutable(15.5, 19.5);
$c = new PointImmutable(28, 12);
$d = new PointImmutable(42, 19);
$e = new PointImmutable(53, 7.5);
$f = new PointImmutable(68, 15);

$firstLine = new LineStringImmutable([$a, $b, $c]);
$secondLine = new LineStringImmutable([$d, $e, $f]);
$multiLine = new MultiLineStringImmutable([$firstLine, $secondLine]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\MultiLineString;

$a = new Point(6.5, 7.5);
$b = new Point(15.5, 19.5);
$c = new Point(28, 12);
$d = new Point(42, 19);
$e = new Point(53, 7.5);
$f = new Point(68, 15);

$firstLine = new LineString([$a, $b, $c]);
$secondLine = new LineString([$d, $e, $f]);
// Using the constructor.
$multiLine = new MultiLineString([$firstLine, $secondLine]);

// Alternatively, adding members with methods.
$multiLine = new MultiLineString()
    ->addElement($firstLine)
    ->addElement($secondLine);
```
