---
title: Creating composite objects
description: Assemble lines, polygons and collections from coordinate arrays or existing components while preserving ownership and declared references.
sidebar_position: 4
---

A composite object contains other spatial objects: a line contains points, a polygon contains rings, and a collection contains spatial members.
Factories accept coordinate arrays where the component type is known, or compatible existing objects.
Composer's autoloader must already be loaded for the examples below.

## Create descendants from coordinate arrays

The factory's namespace supplies the layout and family. Its reference argument supplies the declared reference of descendants created from arrays.
The shared mode applies to the aggregate and all those descendants.

```php
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\LineStringFactory;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\PolygonFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;

SpatialFactory::immutable();
$reference = SpatialReference::epsg(3857);
$line = LineStringFactory::create([[0, 0], [10, 5]], $reference);
$polygon = PolygonFactory::create([
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
], $reference);

assert([[0, 0], [10, 5]] === $line->toArray());
assert('EPSG' === $line->getPoint(0)->getSpatialReference()->authority);
assert(3857 === $polygon->getRing(0)->getPoint(0)->getSrid());
```

The polygon input has one extra nesting level: an array of rings, each containing point tuples. Its first ring is the exterior boundary; subsequent rings represent holes.
Multi-line strings accept arrays of lines, multi-polygons accept arrays of polygons, and polyhedral surfaces accept arrays of polygon patches.
Selecting mutable mode would construct mutable descendants from the same arrays.

## Retain existing components

Supplied component objects retain their identity and declared metadata; the aggregate's reference does not overwrite theirs.
In mutable mode, sharing a component means sharing its edits.

```php
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\LineStringFactory;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;

SpatialFactory::mutable();
$start = PointFactory::create(0, 0, 4326);
$alice = LineStringFactory::create([$start, [1, 2]], 4326);
$leila = LineStringFactory::create([$start, [2, 1]], 4326);

$start->setX(3);

assert($alice->getPoint(0) === $start);
assert($leila->getPoint(0) === $start);
assert([3, 0] === $alice->getPoint(0)->toArray());
assert([3, 0] === $leila->getPoint(0)->toArray());

SpatialFactory::immutable();
```

Immutable aggregates also retain supplied compatible immutable components, whose values cannot be edited in place.
Mutable aggregate components and descendants must match the receiver's coordinate layout, even when EMPTY; incompatible layouts raise `InvalidDimensionException`.
Family/reference compatibility and geometric validity require explicit consumer checks. Immutable aggregates retain their permissive member-layout contract.

## Assemble heterogeneous collections

A heterogeneous collection can combine points, lines and nested collections.
Supply explicit spatial objects: untyped coordinate arrays cannot identify whether a member is a point, a line or another type.
Use named arguments to make the collection's reference-first signature clear.

```php
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\GeometryCollectionFactory;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\LineStringFactory;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;

SpatialFactory::immutable();
$point = PointFactory::create(1, 2, 4326);
$line = LineStringFactory::create([[1, 2], [3, 4]], 4326);
$nested = GeometryCollectionFactory::create(srid: 4326, elements: [$line]);
$collection = GeometryCollectionFactory::create(srid: 4326, elements: [$point, $nested]);

assert([$point, $nested] === $collection->getElements());
assert($line === $nested->getElements()[0]);
```

For Geography, use `GeographyCollectionFactory`. Compound curves also need explicit curve components rather than untyped coordinate arrays.
Mutable collections reject containment cycles while allowing repeated members and shared descendants in an acyclic graph.

## Reject incompatible representations

Factories do not implicitly convert mutable components into immutable components, or vice versa, including descendants of nested aggregates.
Incompatible component kinds or representations raise `InvalidValueException`, implementing `SpatialTypeExceptionInterface`.

```php
use LongitudeOne\SpatialTypes\Exception\InvalidValueException;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\LineStringFactory;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;

SpatialFactory::immutable();
$point = PointFactory::create(1, 2);
SpatialFactory::mutable();
$rejected = false;

try {
    LineStringFactory::create([$point]);
} catch (InvalidValueException $exception) {
    $rejected = true;
}

assert($rejected);
assert([1, 2] === $point->toArray());
SpatialFactory::immutable();
```

The failed construction leaves the supplied point unchanged. Resetting the mode affects future creations only.

## Preserve empty members and incomplete coordinates

An aggregate with no members differs from an aggregate containing an EMPTY member.
For example, `MultiLineStringFactory::create([])` stores zero lines, while `MultiLineStringFactory::create([[]])` stores one empty line.
Order, nesting and null ordinates are preserved; a partial-null point remains a stored position.

Factories do not close rings, repair shapes, transform coordinates or certify validity.
Use explicit [geometric validation](../validators.md) when your application requires valid geometries.
