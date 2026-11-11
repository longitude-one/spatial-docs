---
title: Point
description: Definition, illustrated examples and supported representations of Point in Spatial Types 1.x.
sidebar_position: 2
---

## What is a Point?

A Point represents a single location, described by coordinate ordinates such as X and Y. It has no child spatial objects.

![Two separate Point examples; each dot represents one location.](../../../assets/images/spatial-types/types/point.svg)

## Point — Supported representations

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

// Immutable objects must be fully initialized through their constructors.

$a = new PointImmutable(16, 14.5);
$b = new PointImmutable(54, 9.5);
```

### Mutable objects

```php
<?php

use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

$a = new Point()->setX(16)->setY(14.5); // Using methods.
$b = new Point(54, 9.5); // Using the constructor.
```
