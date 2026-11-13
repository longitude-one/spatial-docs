---
title: Missing and EMPTY values
description: Require spatial input and distinguish null, EMPTY geometries and collections containing EMPTY members.
sidebar_position: 4
---

A missing PHP value and an EMPTY spatial object mean different things.
`null` can mean that no location was supplied. An EMPTY Point is an object representing no position.
Spatial validation ignores `null`, but checks EMPTY objects using the rules for their declared type.

## Require a value

Use Symfony's `NotNull` when an application requires a spatial object.
`Sequentially` stops after a failed presence check; it runs spatial validation when presence succeeds.

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry as Geometry;
use LongitudeOne\SpatialValidator\Validator\Constraints\Spatial;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$required = new Assert\Sequentially([new Assert\NotNull(), new Spatial()]);

echo count($validator->validate(null, new Spatial())) . PHP_EOL; // 0
echo count($validator->validate(null, $required)) . PHP_EOL; // 1
echo count($validator->validate(new Geometry\PointImmutable(), $required)) . PHP_EOL; // 0
```

The EMPTY Point passes `NotNull` because it is an object. Requiring a value is different from requiring a non-empty shape.
`NotBlank` can apply your application's blank-input policy, but it does not establish that a spatial object is non-EMPTY.

## Supply an object, not serialized text

`Spatial` does not parse WKT or other serialized formats.
Every string is rejected, including an empty string, whitespace, numeric text and WKT.

```php
foreach (['', '   ', '42', 'POINT (10 20)'] as $input) {
    echo count($validator->validate($input, new Spatial())) . PHP_EOL;
}
// 1 for each string: a Symfony type violation.
```

Integers, booleans, arrays and unrelated objects are also rejected.
Parse serialized input into a spatial object before validating it.
With the Symfony Validator service, unsupported inputs produce a type violation.
Calling a constraint-validator directly instead raises Symfony's `UnexpectedValueException`; use the service in application code.

## Validate EMPTY objects

For implemented types, an EMPTY object still goes through the corresponding validation rules.
For example, these objects pass ordinary `Spatial` validation:

```php
foreach ([
    new Geometry\PointImmutable(),
    new Geometry\LineStringImmutable([]),
    new Geometry\PolygonImmutable([]),
] as $object) {
    echo count($validator->validate($object, new Spatial())) . PHP_EOL;
}
// 0 for each object.
```

An EMPTY Point has no declared coordinate values; a partially populated Point is not a valid EMPTY Point.
A line with no Points is EMPTY, whereas a line containing an EMPTY Point is an invalid position sequence.
Types whose validation is unavailable still produce a warning even when EMPTY; see [coverage](./geometric-types.md#coverage-and-limitations).

## Preserve EMPTY collection members

GeometryCollection, MultiPoint, MultiLineString and MultiPolygon allow valid EMPTY members under the library's validation profile.
An empty member list and a list containing only valid EMPTY members both represent the empty set for these checks.
Validation preserves the stored members and still checks their metadata.

```php
$empty = new Geometry\PointImmutable();
$allEmpty = new Geometry\MultiPointImmutable([$empty, $empty]);
$mixed = new Geometry\MultiPointImmutable([$empty, new Geometry\PointImmutable(10, 20)]);

foreach ([$allEmpty, $mixed] as $collection) {
    echo count($validator->validate($collection, new Spatial())) . PHP_EOL; // 0
    echo count($collection->getPoints()) . PHP_EOL; // 2
}
```

The first member remains in the mixed collection. It has no location and is not converted to (0, 0).
Repeated non-empty positions remain an [optional simplicity requirement](./additional-checks.md#typed-collections).

## Distinguish members from required shape components

Allowing EMPTY collection members does not allow missing positions or boundaries inside every spatial object.

![An EMPTY Point supplies no position between (0, 0) and (2, 0); the gap is schematic.](../../assets/images/spatial-validator/line-empty-member.svg)

```php
$line = new Geometry\LineStringImmutable([
    new Geometry\PointImmutable(0, 0),
    new Geometry\PointImmutable(),
    new Geometry\PointImmutable(2, 0),
]);
foreach ($validator->validate($line, new Spatial()) as $violation) {
    printf("%s | %s\n", $violation->getPropertyPath(), $violation->getCode());
}
```

```text
points[1] | nonemptypoints-invalid
points[1] | noconsecutiveduplicatepoints-input
```

The second diagnostic reports that the missing position also prevents consecutive-position comparison.

| Object | EMPTY object with no components | EMPTY components inside a non-empty object |
| --- | --- | --- |
| LineString | Allowed | EMPTY Points rejected |
| CircularString | Allowed | EMPTY defining Points rejected |
| CompoundCurve | Allowed | EMPTY contributing curves rejected |
| Polygon | Allowed | EMPTY exterior or interior rings rejected |
| Triangle | Allowed | EMPTY exterior rejected; holes always forbidden |
| XYZ/XYZM PolyhedralSurface | Allowed | EMPTY patches rejected |

[Additional requirements](./additional-checks.md) can be stricter: an EMPTY LineString fails `Ring`, and an EMPTY MultiLineString fails explicit closure.
These rules describe the library's object-validation profile, rather than the acceptance rules of particular SQL constructors or mutation methods.
