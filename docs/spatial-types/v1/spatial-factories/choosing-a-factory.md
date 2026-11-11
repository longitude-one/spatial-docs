---
title: Choosing a factory
description: Select a spatial factory by type, coordinate layout and Geometry or Geography family.
sidebar_position: 2
---

Choose a factory by answering three questions: what object do you need, which ordinates describe each position, and which coordinate family do you use?
Mutability is a separate [shared mode selection](./mutable-and-immutable.md).

## Choose the spatial type

Use `PointFactory` for one position, `LineStringFactory` for an ordered path, or `PolygonFactory` for an area represented by rings.
For an introduction to each shape, see the [type guides](../instantiable-spatial-types.md#type-guides).

| Need | Factory |
| --- | --- |
| One position | `PointFactory` |
| A path with straight segments | `LineStringFactory` |
| A path defined by circular arcs | `CircularStringFactory` |
| A sequence of line strings and circular strings | `CompoundCurveFactory` |
| An area with an exterior ring and optional holes | `PolygonFactory` |
| A triangle represented by polygon rings | `TriangleFactory` |
| Several points, lines or polygons | `MultiPointFactory`, `MultiLineStringFactory`, `MultiPolygonFactory` |
| Different spatial types together | `GeometryCollectionFactory` or `GeographyCollectionFactory` |
| A surface assembled from polygon patches | `PolyhedralSurfaceFactory` |

## Choose the coordinate layout

The dimension namespace determines the ordinates and their order. Z is the third spatial ordinate; M is an application-defined measure.
XYZ and XYM both contain three ordinates but describe different layouts.

| Layout | Namespace segment | Tuple order |
| --- | --- | --- |
| XY | `Dimension2` | X, Y |
| XYZ | `Dimension3z` | X, Y, Z |
| XYM | `Dimension3m` | X, Y, M |
| XYZM | `Dimension4zm` | X, Y, Z, M |

All factories listed above support the four layouts except `PolyhedralSurfaceFactory`, which supports only XYZ and XYZM.
Selecting a layout declares the axes; a null ordinate does not remove an axis.

## Choose the coordinate family

`Geometry` uses Cartesian X/Y coordinates. `Geography` uses longitude/latitude, in that order.
Together, the choices form this namespace:

```text
LongitudeOne\SpatialTypes\Factory\<dimension>\<family>\<type>Factory
```

For example, `Factory\Dimension3z\Geometry\PointFactory` creates an XYZ Cartesian point.
`Factory\Dimension2\Geography\PointFactory` creates a longitude/latitude point.
Only the Geometry family provides `GeometryCollectionFactory`; Geography provides `GeographyCollectionFactory` instead.
There are 84 public type-specific factories across the supported combinations.

## Create a point with a declared reference

Composer's autoloader must already be loaded. This example selects an XY Geography point and explicitly declares its reference as EPSG:4326.

```php
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geography\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;

SpatialFactory::immutable();
$paris = PointFactory::create(2.3522, 48.8566, SpatialReference::epsg(4326));

assert([2.3522, 48.8566] === $paris->toArray());
assert(4326 === $paris->getSrid());
assert('EPSG' === $paris->getSpatialReference()->authority);
```

The namespace selects Geography, but does not automatically select an SRID. The optional reference accepts an integer or `SpatialReference` and defaults to 0.
Declaring a reference does not transform coordinates; see [spatial reference systems](../spatial-reference-systems.md).

## Supply the creation arguments

`create()` follows the corresponding immutable constructor's argument order and defaults, in both factory modes.
Point ordinates default to null; for XYM, the third ordinate is M.
X/Y accept numeric values, null, or coordinate strings handled by the coordinate parser. Z/M accept numbers or null.

| Factory | Arguments |
| --- | --- |
| `PointFactory` | Ordinates in layout order, then `$srid = 0` |
| `LineStringFactory`, `CircularStringFactory`, `MultiPointFactory` | `array $points`, then `$srid = 0` |
| `PolygonFactory`, `TriangleFactory` | `array $rings`, then `$srid = 0` |
| `MultiLineStringFactory` | `array $lineStrings`, then `$srid = 0` |
| `MultiPolygonFactory` | `array $polygons`, then `$srid = 0` |
| `CompoundCurveFactory` | `array $curves = []`, then `$srid = 0` |
| `PolyhedralSurfaceFactory` | `array $patches = []`, then `$srid = 0` |
| Both heterogeneous collection factories | `$srid = 0`, then `array $elements = []` |

Collections place the reference before their members. See [creating composite objects](./composite-objects.md) for examples of arrays and existing components.
