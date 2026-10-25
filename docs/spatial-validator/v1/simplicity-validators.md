---
title: Simplicity validators
description: Apply optional simplicity checks to lines, circular and compound curves, MultiPoint and MultiLineString collections.
sidebar_position: 4
---

A geometry can pass ordinary validity while crossing itself, retracing an arc or repeating a position.
Simplicity validators add an explicit contract to an already valid geometry; `Spatial` does not automatically apply these optional checks.
They first validate the corresponding geometry type, preserving its diagnostics when ordinary validity fails.
See [geometry type validators](./geometric-types.md) for those prerequisites.

Each section starts with a passing example, then shows a violation with its path, code and default English message.
Use this setup for all examples:

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CompoundCurve;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiPoint;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiLineString;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$showViolations = static function ($spatialObject, $constraint = null) use ($validator): void {
    $violations = $validator->validate($spatialObject, $constraint ?? new SpatialAssert\Spatial());
    foreach ($violations as $violation) {
        echo ($violation->getPropertyPath() ?: '[root]') . ' | '
            . $violation->getCode() . ': ' . $violation->getMessage() . PHP_EOL;
    }
};
```

## SimpleLineString

### A simple LineString

A LineString joins positions in order with straight segments. A non-empty valid line contains at least two valid non-EMPTY Points,
with matching metadata and no consecutive duplicate positions. It need not be closed or simple; an EMPTY line is also valid.
This open route A → B → C passes ordinary validity and explicit simplicity.

![Three distinct Points form an open, valid and simple LineString A–B–C.](../../assets/images/spatial-validator/line-valid.svg)

```php
$spatialObject = new LineString([new Point(0, 0), new Point(2, 1), new Point(4, 0)]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleLineString()); // No violations.
```

### A non-simple LineString

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

## SimpleCircularString

### A simple CircularString

A CircularString joins circular arcs. A non-empty valid curve has an odd number of at least three valid non-EMPTY defining Points,
matching metadata, and each arc's intermediate position differs from both endpoints. EMPTY is also valid.
This upper semicircle uses A (-1, 0), B (0, 1) and C (1, 0); it is open, valid and simple.

![A circular arc passes through A (-1, 0), B (0, 1) and C (1, 0), forming a valid simple upper semicircle.](../../assets/images/spatial-validator/circular-valid.svg)

```php
$spatialObject = new CircularString([new Point(-1, 0), new Point(0, 1), new Point(1, 0)]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleCircularString()); // No violations.
```

### A non-simple CircularString

`SimpleCircularString` first checks ordinary CircularString validity, then looks for forbidden arc intersections and overlaps.
This example follows the upper semicircle from A through B to C, then retraces the same semicircle through B back to A.
It passes ordinary `Spatial` validation but fails explicit simplicity. The two arrows show opposite travel directions on the same arc.

![The upper semicircle is traversed from A to C and then retraced from C to A; the overlapping arcs fail simplicity.](../../assets/images/spatial-validator/circular-retracing.svg)

```php
$spatialObject = new CircularString([
    new Point(-1, 0), new Point(0, 1), new Point(1, 0), new Point(0, 1), new Point(-1, 0),
]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleCircularString());
```

```text
arcs[1] | simplecircularstring-invalid: Circular arcs have a forbidden intersection or overlap.
```

`arcs[1]` identifies the second arc. EMPTY passes ordinary validity and simplicity.
Collinear defining Points represent the segment between the endpoints, rather than two chords.
Spatial checks use XYZ when Z exists and otherwise XY; M is ignored spatially but must remain finite.
Non-empty Geography simplicity is unavailable. A single XYZ full circle encoded A → B → A is simple,
but comparisons with other arcs cannot determine its plane and report an unavailable-check warning.
The warning code is `simplecircularstring-unavailable`, with the message
`Circular simplicity is unavailable for this spatial model or arc plane.` and default payload `['severity' => 'warning']`.

## SimpleCompoundCurve

### A simple CompoundCurve

A valid non-empty CompoundCurve is an ordered chain of valid non-EMPTY line or circular components with matching metadata and consecutive endpoints.
It may be open; simplicity is checked separately. This road follows an upper semicircle from A (-1, 0) through B (0, 1) to C (1, 0), then a straight section to D (2, 0).
Both components meet at C, so the compound curve is valid. It also passes explicit simplicity.

![An upper semicircle joins a straight segment at C, forming a valid simple compound curve.](../../assets/images/spatial-validator/compound-connected.svg)

```php
$spatialObject = new CompoundCurve([
    new CircularString([new Point(-1, 0), new Point(0, 1), new Point(1, 0)]),
    new LineString([new Point(1, 0), new Point(2, 0)]),
]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleCompoundCurve()); // No violations.
```

### A non-simple CompoundCurve

Two individually simple components can cross when joined.
This example joins the same semicircle to a straight segment from C (1, 0) to D (-1, 1).
The join at C is allowed, but the segment also crosses the arc at (-0.6, 0.8).
Ordinary validity passes; explicit simplicity rejects that additional intersection.

![A segment joins the semicircle at C but also crosses its interior; whole-curve simplicity fails at the straight segment.](../../assets/images/spatial-validator/compound-intersection.svg)

```php
$spatialObject = new CompoundCurve([
    new CircularString([new Point(-1, 0), new Point(0, 1), new Point(1, 0)]),
    new LineString([new Point(1, 0), new Point(-1, 1)]),
]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleCompoundCurve());
```

```text
curves[1].segments[0] | simplecompoundcurve-invalid: Compound-curve parts have a forbidden intersection or overlap.
```

`curves[1].segments[0]` identifies the first segment of the second component.
Simplicity checks line/line, line/arc and arc/arc interactions, allowing neighbouring endpoint joins and one global closure.
Ordinary validity requires neither closure nor simplicity. Geometry joins compare XYZ when Z exists and otherwise XY, ignoring M.

For non-empty Geography, component and Point checks still run, but joins report `compoundcurve-unavailable`
with `Geography compound-curve continuity is unavailable.` Explicit simplicity reports `simplecompoundcurve-unavailable`
with `Compound-curve simplicity is unavailable for this model or arc plane.`
These warnings default to payload `['severity' => 'warning']`.
The indeterminate plane of an XYZ full circle encoded A → B → A also prevents simplicity comparisons with other parts;
the validator reports a warning rather than choosing a plane.

## SimpleMultiPoint

### A simple MultiPoint

A MultiPoint groups independent Points. It is valid when its members are valid and their metadata match the collection;
valid EMPTY members are allowed. This example also passes explicit simplicity because its non-empty positions are distinct.

![Two independent distinct Points form a valid and simple MultiPoint.](../../assets/images/spatial-validator/multipoint-valid.svg)

```php
$spatialObject = new MultiPoint([new Point(0, 0), new Point(2, 0)]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleMultiPoint()); // No violations.
```

### A non-simple MultiPoint

Ordinary `MultiPoint` validity checks the Points, without requiring distinct positions.
`SimpleMultiPoint` adds that requirement, ignoring valid EMPTY members because they have no spatial position.
Here `points[1]` and `points[3]` both occupy A (0, 0); `points[0]` is EMPTY and remains in the collection.

![The first member is EMPTY; the second and fourth members coincide at A, which fails explicit MultiPoint simplicity.](../../assets/images/spatial-validator/collection-duplicate-points.svg)

```php
$spatialObject = new MultiPoint([
    new Point(), new Point(0, 0), new Point(2, 0), new Point(0, 0),
]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleMultiPoint());
```

```text
points[3] | simplemultipoint-invalid: The point repeats a spatial position.
```

## SimpleMultiLineString

### A simple MultiLineString

A MultiLineString groups LineStrings. It is valid when every member is valid and its metadata match the collection;
valid EMPTY members are allowed. These two separate routes also pass explicit simplicity: neither crosses itself or the other route.

![Two separate simple LineStrings form a valid MultiLineString and pass explicit simplicity.](../../assets/images/spatial-validator/multilinestring-valid.svg)

```php
$spatialObject = new MultiLineString([
    new LineString([new Point(0, 0), new Point(2, 1)]),
    new LineString([new Point(0, 2), new Point(2, 3)]),
]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleMultiLineString()); // No violations.
```

### A non-simple MultiLineString

Two crossing routes can form a valid MultiLineString. `SimpleMultiLineString` additionally requires each member to be simple
and restricts contacts between different lines to their shared boundaries.
These two simple segments meet at their interiors, so the explicit simplicity check reports the second line.

![Two individually simple segments cross at (1, 1); the MultiLineString is valid but fails explicit simplicity.](../../assets/images/spatial-validator/collection-crossing-lines.svg)

```php
$spatialObject = new MultiLineString([
    new LineString([new Point(0, 0), new Point(2, 2)]),
    new LineString([new Point(0, 2), new Point(2, 0)]),
]);
$showViolations($spatialObject); // No violations.
$showViolations($spatialObject, new SpatialAssert\SimpleMultiLineString());
```

```text
lineStrings[1] | simplemultilinestring-invalid: The lines intersect outside their shared boundaries or overlap.
```

A contact at the actual endpoints of both open lines is allowed. Crossings, overlaps and an endpoint lying inside another line fail.
A closed line has an empty boundary, so another line cannot touch it even at its repeated starting position.
A member's own simplicity failure retains its `simplelinestring-invalid` code at `lineStrings[index]`.

## EMPTY values, dimensions and warnings

Valid EMPTY curves and collections pass simplicity. EMPTY members' absent positions are skipped for spatial comparisons;
ordinary metadata and component checks still apply. This does not admit EMPTY Points inside a non-empty line or arc.
Geometry calculations use XYZ when Z exists and otherwise XY; M must be finite but never participates spatially.
For the shared coordinate equality policy and exact topology predicates, see [numerical comparisons](./diagnostics-and-composition.md#numerical-comparisons).

Non-empty Geography simplicity is unavailable. Warnings remain Symfony violations and default to payload `['severity' => 'warning']`;
explicit constraint payloads are preserved. Entirely EMPTY collections need no geodetic simplicity calculation.

| Constraint | Warning code | Default message |
| --- | --- | --- |
| `SimpleLineString` | `simplelinestring-unavailable` | Geography LineString simplicity is not implemented yet. |
| `SimpleCircularString` | `simplecircularstring-unavailable` | Circular simplicity is unavailable for this spatial model or arc plane. |
| `SimpleCompoundCurve` | `simplecompoundcurve-unavailable` | Compound-curve simplicity is unavailable for this model or arc plane. |
| `SimpleMultiPoint` | `simplemultipoint-unavailable` | Geography SimpleMultiPoint validation is not implemented yet. |
| `SimpleMultiLineString` | `simplemultilinestring-unavailable` | Geography SimpleMultiLineString validation is not implemented yet. |

Closure is a separate property: a closed geometry need not be simple, and a simple geometry need not be closed.
`Ring` and surface constraints still compose the simplicity rules required by their own validity contracts;
those required boundary checks are explained with [geometry type validators](./geometric-types.md#linear-ring-checks).
See [warning payloads](./diagnostics-and-composition.md#warning-payloads) to distinguish warnings from errors.
