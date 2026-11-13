---
title: Add validation requirements
description: Require a specific spatial type or add simplicity, boundary and surface-closure checks to ordinary validation.
sidebar_position: 5
---

Start with `Spatial` for ordinary geometric validation.
Add explicit constraints when your application needs a particular declared type or a property that ordinary validity does not require.
For example, a route can be a valid LineString while crossing itself; a parcel boundary needs stricter checks.

## Set up the examples

The examples below continue from this setup. The helper prints diagnostic codes; see the
[overview](./index.md) for a complete error and warning policy.

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Interfaces\SpatialInterface;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry as Geometry;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geography\LineStringImmutable as GeographyLine;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolygonImmutable as PolygonZ;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolyhedralSurfaceImmutable;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$show = static function (SpatialInterface $object, Constraint $constraint) use ($validator): void {
    $violations = $validator->validate($object, $constraint);
    if (count($violations) === 0) {
        echo 'No diagnostics.' . PHP_EOL;
    }
    foreach ($violations as $violation) {
        printf("%s | %s\n", $violation->getPropertyPath() ?: '[root]', $violation->getCode());
    }
};
```

## Require a particular type

A specialized type constraint both requires that declared type and applies its geometric rules.
It does not convert an object or infer another type from its coordinates.

```php
$point = new Geometry\PointImmutable(10, 20);
$show($point, new SpatialAssert\Point()); // No diagnostics.

$triangleShapedPolygon = new Geometry\PolygonImmutable([
    [[0, 0], [4, 0], [0, 4], [0, 0]],
]);
echo count($validator->validate($triangleShapedPolygon, new SpatialAssert\Spatial())) . PHP_EOL; // 0
echo count($validator->validate($triangleShapedPolygon, new SpatialAssert\Triangle())) . PHP_EOL; // 1: type violation
```

Use `Spatial` when any supported spatial type is acceptable; use `Triangle` when the object must actually declare Triangle.

## Lines that must not cross themselves

`SimpleLineString` first validates the line, then checks for forbidden intersections and overlaps.
This crossing route passes ordinary validity but fails explicit simplicity:

![A LineString crosses itself at (1, 1); ordinary validity passes, while simplicity fails.](../../assets/images/spatial-validator/line-simplicity.svg)

```php
$crossing = new Geometry\LineStringImmutable([[0, 0], [2, 2], [0, 2], [2, 0]]);
$show($crossing, new SpatialAssert\Spatial()); // No diagnostics.
$show($crossing, new SpatialAssert\SimpleLineString());
// [root] | simplelinestring-invalid
```

Adjacent segments may share their joining endpoint, including the closing endpoint of an otherwise simple closed line.
Crossings, self-tangencies and overlapping intervals fail.

## Closed lines and complete boundaries

A closed line returns to its starting position. `FirstPointEqualsLastPoint` checks only its endpoints;
it does not establish complete line validity or simplicity.

![The open sequence (0, 0), (2, 0), (1, 2) stops before returning to its starting position.](../../assets/images/spatial-validator/ring-closure.svg)

```php
$open = new Geometry\LineStringImmutable([[0, 0], [2, 0], [1, 2]]);
$show($open, new SpatialAssert\FirstPointEqualsLastPoint());
// [root] | firstpointequalslastpoint-invalid
```

For a complete linear boundary, use `Ring`: it requires a non-empty, valid, simple, closed LineString with at least four positions,
including the repeated starting position.

![A triangular boundary returns to its start and forms a valid simple linear ring.](../../assets/images/spatial-validator/ring-valid.svg)

```php
$boundary = new Geometry\LineStringImmutable([[0, 0], [2, 0], [1, 2], [0, 0]]);
$show($boundary, new SpatialAssert\Ring()); // No diagnostics.
```

Closure alone permits a bow-tie; complete ring validation rejects it:

![A closed bow-tie returns to its starting Point but crosses itself.](../../assets/images/spatial-validator/ring-self-intersection.svg)

```php
$bowTie = new Geometry\LineStringImmutable([[0, 0], [2, 2], [0, 2], [2, 0], [0, 0]]);
$show($bowTie, new SpatialAssert\FirstPointEqualsLastPoint()); // No diagnostics.
$show($bowTie, new SpatialAssert\Ring());
// [root] | simplelinestring-invalid
```

`Ring` applies to linear boundaries, not CircularString objects.
Polygon and Triangle validation already include the required boundary checks.

## Circular and compound curves

Use `SimpleCircularString` to test the actual arcs, rather than replacing them with straight chords.
Retracing the upper semicircle in reverse passes ordinary validity but fails simplicity:

![The same upper semicircle is traversed forwards and backwards, creating overlapping arcs.](../../assets/images/spatial-validator/circular-retracing.svg)

```php
$retraced = new Geometry\CircularStringImmutable([[-1, 0], [0, 1], [1, 0], [0, 1], [-1, 0]]);
$show($retraced, new SpatialAssert\Spatial()); // No diagnostics.
$show($retraced, new SpatialAssert\SimpleCircularString());
// arcs[1] | simplecircularstring-invalid
```

`SimpleCompoundCurve` checks the whole chain, including interactions between different components.
Individually simple components can still cross one another:

![A straight segment joins the semicircle at (1, 0), then crosses its interior at (-0.6, 0.8).](../../assets/images/spatial-validator/compound-intersection.svg)

```php
$compound = new Geometry\CompoundCurveImmutable([
    new Geometry\CircularStringImmutable([[-1, 0], [0, 1], [1, 0]]),
    new Geometry\LineStringImmutable([[1, 0], [-1, 1]]),
]);
$show($compound, new SpatialAssert\Spatial()); // No diagnostics.
$show($compound, new SpatialAssert\SimpleCompoundCurve());
// curves[1].segments[0] | simplecompoundcurve-invalid
```

For XYZ full circles encoded A → B → A, comparisons with other arcs can lack a determined circle plane.
The result then includes an unavailable-check warning rather than an invented plane.

## Typed collections

Ordinary MultiPoint validity permits repeated positions. `SimpleMultiPoint` requires distinct non-empty positions and ignores valid EMPTY positions.

![The first member is EMPTY; the second and fourth members share (0, 0), failing explicit simplicity.](../../assets/images/spatial-validator/collection-duplicate-points.svg)

```php
$points = new Geometry\MultiPointImmutable([
    new Geometry\PointImmutable(),
    new Geometry\PointImmutable(0, 0),
    new Geometry\PointImmutable(2, 0),
    new Geometry\PointImmutable(0, 0),
]);
$show($points, new SpatialAssert\Spatial()); // No diagnostics.
$show($points, new SpatialAssert\SimpleMultiPoint());
// points[3] | simplemultipoint-invalid
```

`SimpleMultiLineString` checks each line's simplicity and permits contacts between different members only at both members' boundaries.
Two individually simple lines can therefore form a non-simple collection:

![Two simple lines cross at their interiors, failing MultiLineString simplicity.](../../assets/images/spatial-validator/collection-crossing-lines.svg)

```php
$lines = new Geometry\MultiLineStringImmutable([
    new Geometry\LineStringImmutable([[0, 0], [2, 2]]),
    new Geometry\LineStringImmutable([[0, 2], [2, 0]]),
]);
$show($lines, new SpatialAssert\Spatial()); // No diagnostics.
$show($lines, new SpatialAssert\SimpleMultiLineString());
// lineStrings[1] | simplemultilinestring-invalid
```

`ClosedMultiLineString` instead requires a non-empty aggregate with every member closed.
Two open members that together trace a loop do not satisfy this requirement:

![Two open lines together draw a square, but neither member closes individually.](../../assets/images/spatial-validator/collection-open-members.svg)

```php
$loop = new Geometry\MultiLineStringImmutable([
    new Geometry\LineStringImmutable([[0, 0], [2, 0], [2, 2]]),
    new Geometry\LineStringImmutable([[2, 2], [0, 2], [0, 0]]),
]);
$show($loop, new SpatialAssert\ClosedMultiLineString());
// lineStrings[0] | firstpointequalslastpoint-invalid
// lineStrings[1] | firstpointequalslastpoint-invalid
```

A closed line has no boundary endpoints for contacts with other lines under the simplicity rule.
Closure and simplicity are independent requirements.

## Closed polyhedral surfaces

`Spatial` allows open PolyhedralSurfaces. Use `ClosedPolyhedralSurface` when a valid surface must also enclose a volume.
The two panels below form a valid open surface but do not meet that additional requirement:

![Two triangular panels share an edge, leaving the surface open.](../../assets/images/spatial-validator/polyhedral-open-book.svg)

```php
$a = [0, 0, 0];
$b = [2, 0, 0];
$c = [0, 2, 0];
$d = [0, 0, 2];
$surface = new PolyhedralSurfaceImmutable([
    new PolygonZ([[$a, $c, $b, $a]]),
    new PolygonZ([[$a, $b, $d, $a]]),
]);
$show($surface, new SpatialAssert\Spatial()); // No diagnostics.
$show($surface, new SpatialAssert\ClosedPolyhedralSurface());
// [root] | closedpolyhedralsurface-invalid
```

## Combine independent requirements

Symfony accepts a list of constraints. For example, require both complete line simplicity and endpoint closure:

```php
$violations = $validator->validate($boundary, [
    new SpatialAssert\SimpleLineString(),
    new SpatialAssert\FirstPointEqualsLastPoint(),
]);
echo count($violations) . PHP_EOL; // 0
```

Use `Ring` when you need its full boundary contract, including non-EMPTY state and the four-position minimum.
Use [Symfony groups](./symfony-integration.md#select-when-validation-runs) to select when requirements apply.

## Handle unavailable checks and EMPTY

Non-empty Geography simplicity and endpoint-closure calculations are unavailable in this release.
Available component checks still run; the unavailable calculation adds a warning:

```php
$geographyLine = new GeographyLine([[0, 0], [1, 1]]);
$violations = $validator->validate($geographyLine, new SpatialAssert\SimpleLineString());
foreach ($violations as $violation) {
    $payload = $violation->getConstraint()?->payload;
    $severity = is_array($payload) ? ($payload['severity'] ?? 'error') : 'error';
    printf("%s | %s\n", $severity, $violation->getCode());
}
// warning | simplelinestring-unavailable
```

Valid EMPTY curves and collections pass simplicity, but EMPTY fails `Ring` and explicit closure requirements.
An EMPTY member inside a non-empty MultiLineString also fails its endpoint-closure check.
See [Missing and EMPTY values](./input-and-empty.md) and [Handle validation results](./handling-results.md) before defining an acceptance policy.
