---
title: CompoundCurve
description: Definition, illustrated examples and supported representations of CompoundCurve in Spatial Types 1.x.
sidebar_position: 5
---

## What is a CompoundCurve?

A CompoundCurve is an ordered sequence of curve components joined at their endpoints. In Spatial Types, its direct components are LineString or
CircularString objects.

![One compound curve made of a straight segment followed by a semicircular arc. The components share an endpoint.](../../../assets/images/spatial-types/types/compound-curve.svg)

## CompoundCurve — Supported representations

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
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CompoundCurveImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(7.5, 8);
$b = new PointImmutable(28.5, 8);
$c = new PointImmutable(40.5, 20);
$d = new PointImmutable(52.5, 8);

$line = new LineStringImmutable([$a, $b]);
$arc = new CircularStringImmutable([$b, $c, $d]);
$curve = new CompoundCurveImmutable([$line, $arc]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\CircularString;
use LongitudeOne\SpatialTypes\Types\Dimension2\CompoundCurve;

$a = new Point(7.5, 8);
$b = new Point(28.5, 8);
$c = new Point(40.5, 20);
$d = new Point(52.5, 8);

$line = new LineString([$a, $b]);
$arc = new CircularString([$b, $c, $d]);
// Using the constructor.
$curve = new CompoundCurve([$line, $arc]);

// Alternatively, adding components with methods.
$curve = new CompoundCurve()
    ->addCurve($line)
    ->addCurve($arc);
```
