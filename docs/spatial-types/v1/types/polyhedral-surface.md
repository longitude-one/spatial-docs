---
title: PolyhedralSurface
description: Definition, illustrated examples and supported representations of PolyhedralSurface in Spatial Types 1.x.
sidebar_position: 8
---

## What is a PolyhedralSurface?

A PolyhedralSurface is a surface assembled from flat Polygon patches joined along shared edges in three-dimensional space. It may be open; it does not by
itself represent a solid.

Flatness and adjacency describe the intended surface geometry. Spatial Types stores patches without checking planarity, connectivity or surface topology.
Construction does not certify a valid surface; use explicit [geometric validation](../validators.md) for the checks supported by your validator.

![An open surface with two rectangular patches, above a closed square-based pyramid with four triangular sides and a square base. Dashed edges are hidden.](../../../assets/images/spatial-types/types/polyhedral-surface.svg)

## PolyhedralSurface — Supported representations

Availability in the current version of Spatial Types:

| Coordinate layout | Geometry Mutable | Geometry Immutable | Geography Mutable | Geography Immutable |
| --- | :---: | :---: | :---: | :---: |
| XY | ❌ | ❌ | ❌ | ❌ |
| XYZ | ✅ | ✅ | ✅ | ✅ |
| XYM | ❌ | ❌ | ❌ | ❌ |
| XYZM | ✅ | ✅ | ✅ | ✅ |

In the current version, PolyhedralSurface is implemented only for layouts containing Z: XYZ and XYZM.

## Creating the illustrated objects

The examples recreate the labelled objects above using Geometry in XYZ.
Composer’s autoloader must already be loaded. Variable names match the point letters in the illustration.

### Immutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolygonImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolyhedralSurfaceImmutable;

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(-4, 0, 2);
$b = new PointImmutable(0, 0, 0);
$c = new PointImmutable(0, 6, 0);
$d = new PointImmutable(-4, 6, 2);
$e = new PointImmutable(4, 0, 2);
$f = new PointImmutable(4, 6, 2);
$g = new PointImmutable(0, 0, 0);
$h = new PointImmutable(4, 0, 0);
$i = new PointImmutable(4, 4, 0);
$j = new PointImmutable(0, 4, 0);
$k = new PointImmutable(2, 2, 3);

$leftRing = new LineStringImmutable([$a, $b, $c, $d, $a]);
$leftPatch = new PolygonImmutable([$leftRing]);
$rightRing = new LineStringImmutable([$b, $e, $f, $c, $b]);
$rightPatch = new PolygonImmutable([$rightRing]);
$openSurface = new PolyhedralSurfaceImmutable([$leftPatch, $rightPatch]);

$baseRing = new LineStringImmutable([$g, $j, $i, $h, $g]);
$basePatch = new PolygonImmutable([$baseRing]);
$sideRing1 = new LineStringImmutable([$g, $h, $k, $g]);
$sidePatch1 = new PolygonImmutable([$sideRing1]);
$sideRing2 = new LineStringImmutable([$h, $i, $k, $h]);
$sidePatch2 = new PolygonImmutable([$sideRing2]);
$sideRing3 = new LineStringImmutable([$i, $j, $k, $i]);
$sidePatch3 = new PolygonImmutable([$sideRing3]);
$sideRing4 = new LineStringImmutable([$j, $g, $k, $j]);
$sidePatch4 = new PolygonImmutable([$sideRing4]);
$pyramid = new PolyhedralSurfaceImmutable([
    $basePatch,
    $sidePatch1,
    $sidePatch2,
    $sidePatch3,
    $sidePatch4,
]);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension3z\Point;
use LongitudeOne\SpatialTypes\Types\Dimension3z\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Polygon;
use LongitudeOne\SpatialTypes\Types\Dimension3z\PolyhedralSurface;

$a = new Point(-4, 0, 2);
$b = new Point(0, 0, 0);
$c = new Point(0, 6, 0);
$d = new Point(-4, 6, 2);
$e = new Point(4, 0, 2);
$f = new Point(4, 6, 2);
$g = new Point(0, 0, 0);
$h = new Point(4, 0, 0);
$i = new Point(4, 4, 0);
$j = new Point(0, 4, 0);
$k = new Point(2, 2, 3);

$leftRing = new LineString([$a, $b, $c, $d, $a]);
$leftPatch = new Polygon([$leftRing]);
$rightRing = new LineString([$b, $e, $f, $c, $b]);
$rightPatch = new Polygon([$rightRing]);
$openSurface = new PolyhedralSurface([$leftPatch, $rightPatch]); // Using the constructor.

$baseRing = new LineString([$g, $j, $i, $h, $g]);
$basePatch = new Polygon([$baseRing]);
$sideRing1 = new LineString([$g, $h, $k, $g]);
$sidePatch1 = new Polygon([$sideRing1]);
$sideRing2 = new LineString([$h, $i, $k, $h]);
$sidePatch2 = new Polygon([$sideRing2]);
$sideRing3 = new LineString([$i, $j, $k, $i]);
$sidePatch3 = new Polygon([$sideRing3]);
$sideRing4 = new LineString([$j, $g, $k, $j]);
$sidePatch4 = new Polygon([$sideRing4]);
// Starting empty and adding patches with methods.
$pyramid = new PolyhedralSurface()
    ->addPatch($basePatch)
    ->addPatch($sidePatch1)
    ->addPatch($sidePatch2)
    ->addPatch($sidePatch3)
    ->addPatch($sidePatch4);
```
