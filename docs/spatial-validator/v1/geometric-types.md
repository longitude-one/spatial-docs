---
title: Geometric validations
description: Geometric types and their validation rules in Spatial Validator 1.0.
sidebar_position: 2
---

This page presents the checks performed for each geometric type, with examples of invalid values and the violations they produce.

Use this setup for the examples below; each prints the violation code and its default English message.

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geography\Point as GeographyPoint;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$showViolations = static function ($spatialObject) use ($validator): void {
    $violations = $validator->validate($spatialObject, new SpatialAssert\Spatial());
    foreach ($violations as $violation) {
        echo ($violation->getPropertyPath() ?: '[root]') . ' | '
            . $violation->getCode() . ': ' . $violation->getMessage() . PHP_EOL;
    }
};
```

## Point and coordinate checks

The generic `Spatial` constraint applies three coordinate rules to Points, as listed in the
[coordinate rules reference](https://github.com/longitude-one/spatial-validator/blob/main/docs/validators.md#coordinate-rules).

### Consistent coordinates and EMPTY state

`CoordinateLayout` checks that all declared ordinates are present, or all are absent for an EMPTY Point.
Here X is present but Y is missing. The subclass deliberately simulates malformed input, because the standard Point constructor rejects partially missing coordinates.

```php
$spatialObject = new Point(10, null);

$showViolations($spatialObject);
```

```text
[root] | coordinatelayout-invalid: The declared coordinate layout and EMPTY state must be consistent.
```

### Finite coordinate values

`FiniteCoordinates` rejects infinity and `NAN` on every declared axis, including Z and M when present.
This demonstration Point reports positive infinity for X.

```php
$spatialObject = new Point(INF, 20);

$showViolations($spatialObject);
```

```text
[root] | finitecoordinates-invalid: The X ordinate must be finite.
```

### Geography longitude and latitude bounds

`GeographyBounds` checks Geography Points: X (longitude) must be within [-180, 180] and Y (latitude) within [-90, 90], in degrees.
It does not apply these bounds to Geometry Points. This example reports both an out-of-range longitude and an out-of-range latitude.

```php
$spatialObject = new GeographyPoint (10, 20);

$showViolations($spatialObject);
```

```text
[root] | geographybounds-invalid: The X ordinate must be within [-180, 180] degrees.
[root] | geographybounds-invalid: The Y ordinate must be within [-90, 90] degrees.
```

## LineString checks

For a LineString, `Spatial` validates its component Points and their metadata, then checks the minimum point count,
EMPTY members and consecutive duplicate positions. A line may be open or cross itself; simplicity requires an explicit constraint.
These examples follow the [line rules reference](https://github.com/longitude-one/spatial-validator/blob/main/docs/validators.md#line-rules)
and reuse the setup above. Paths such as `points[1]` identify the second Point; `[root]` identifies the line itself.

### At least two Points

`MinimumPointCount` rejects a line containing only one Point. An empty point list is allowed as an EMPTY LineString.

![A single Point is valid, but the line needs at least two Points.](../../assets/images/spatial-validator/line-minimum-points.svg)

```php
$spatialObject = new LineString([new Point(0, 0)]);
$showViolations($spatialObject);
```

```text
[root] | minimumpointcount-invalid: A line must contain at least 2 points unless EMPTY is allowed.
```

### No EMPTY Point members

A Point without coordinates is valid on its own, but cannot supply a position within a line.
The same missing position also prevents consecutive-position comparison, so this example produces two violations.
The dashed gap in the illustration is schematic: an EMPTY Point has no location to draw.
The subclass simulates malformed input that the standard LineString constructor rejects.

![An EMPTY member leaves no position between the two valid Points.](../../assets/images/spatial-validator/line-empty-member.svg)

```php
$spatialObject = new LineString([new Point(0, 0), new Point(), new Point(2, 0)]);

$showViolations($spatialObject);
```

```text
points[1] | nonemptypoints-invalid: A line must not contain an EMPTY Point.
points[1] | noconsecutiveduplicatepoints-input: Finite, non-empty Point coordinates are required for comparison.
```

### No consecutive duplicate positions

Two successive Points must have different spatial positions. Here the second and third Points both occupy B (2, 0).
The demonstration switches to malformed coordinates after construction, because the standard constructor rejects consecutive duplicates.

![The line visits B twice consecutively, producing a duplicate-position violation.](../../assets/images/spatial-validator/line-duplicate-position.svg)

```php
$spatialObject = new LineString ([new Point(0, 0), new Point(2, 0), new Point(2, 0)]);
$showViolations($spatialObject);
```

```text
points[2] | noconsecutiveduplicatepoints-invalid: Consecutive points must have different spatial positions.
```

### Optional simplicity check

This crossing line passes ordinary `Spatial` validation: its Points and consecutive positions are valid.
Apply `SimpleLineString` explicitly to reject the self-intersection.

![A crossing LineString is valid under ordinary checks but fails explicit simplicity.](../../assets/images/spatial-validator/line-simplicity.svg)

```php
$spatialObject = new LineString([
    new Point(0, 0), new Point(2, 2), new Point(0, 2), new Point(2, 0),
]);
$showViolations($spatialObject); // No violations.

$violations = $validator->validate($spatialObject, new SpatialAssert\SimpleLineString());
foreach ($violations as $violation) {
    echo ($violation->getPropertyPath() ?: '[root]') . ' | '
        . $violation->getCode() . ': ' . $violation->getMessage() . PHP_EOL;
}
```

```text
[root] | simplelinestring-invalid: The line has a forbidden segment intersection or overlap.
```
