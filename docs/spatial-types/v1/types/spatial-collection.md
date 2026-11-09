---
title: SpatialCollection
description: Definition, illustrated examples and supported representations of SpatialCollection in Spatial Types 1.x.
---

## What is a SpatialCollection?

A SpatialCollection groups spatial objects, potentially of different types, into one value. It can also contain nested collections. The immutable variants
are named GeometryCollection and GeographyCollection.

![One spatial collection containing a Point, a LineString and a Polygon.](../../../assets/images/spatial-types/types/spatial-collection.svg)

## SpatialCollection — Supported representations

Availability in Spatial Types `1.0.0-RC`:

| Coordinate layout | Geometry Mutable | Geometry Immutable | Geography Mutable | Geography Immutable |
| --- | :---: | :---: | :---: | :---: |
| XY | ✅ | ✅ | ✅ | ✅ |
| XYZ | ✅ | ✅ | ✅ | ✅ |
| XYM | ✅ | ✅ | ✅ | ✅ |
| XYZM | ✅ | ✅ | ✅ | ✅ |

Mutable representations use `SpatialCollection`; immutable representations use
`GeometryCollectionImmutable` or `GeographyCollectionImmutable`.

## Creating the illustrated objects

The examples recreate the labelled objects above using Geometry in XY.
Composer’s autoloader must already be loaded. Variable names match the point letters in the illustration.

### Immutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PolygonImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\GeometryCollectionImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(10, 13);
$b = new PointImmutable(23.5, 7.5);
$c = new PointImmutable(31, 18.5);
$d = new PointImmutable(36.5, 10);
$e = new PointImmutable(47, 7.5);
$f = new PointImmutable(68, 7.5);
$g = new PointImmutable(63.5, 19.5);
$h = new PointImmutable(51, 18);

$line = new LineStringImmutable([$b, $c, $d]);
$ring = new LineStringImmutable([$e, $f, $g, $h, $e]);
$polygon = new PolygonImmutable([$ring]);
$collection = new GeometryCollectionImmutable(elements: [$a, $line, $polygon]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Polygon;
use LongitudeOne\SpatialTypes\Types\Dimension2\SpatialCollection;

$a = new Point(10, 13);
$b = new Point(23.5, 7.5);
$c = new Point(31, 18.5);
$d = new Point(36.5, 10);
$e = new Point(47, 7.5);
$f = new Point(68, 7.5);
$g = new Point(63.5, 19.5);
$h = new Point(51, 18);

$line = new LineString([$b, $c, $d]);
$ring = new LineString([$e, $f, $g, $h, $e]);
$polygon = new Polygon([$ring]);
// Using the constructor.
$collection = new SpatialCollection(elements: [$a, $line, $polygon]);

// Alternatively, adding members with methods.
$collection = new SpatialCollection()
    ->addElement($a)
    ->addElement($line)
    ->addElement($polygon);
```
