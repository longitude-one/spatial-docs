---
title: Diagnostics and validator composition
description: Follow validation delegation and inspect localized Symfony violations, codes and warning payloads.
sidebar_position: 7
---

Each diagnostic identifies a failed rule or an unavailable check.
Inspect its path, code and associated constraint to decide what the application should reject or present for review.
Counting all Symfony violations treats warnings as failures unless your application deliberately distinguishes their severity.

## From Symfony to elementary rules

![Symfony validation checks input, dispatches by spatial type, composes elementary rules and recursively validates components, preserving localized violations.](../../assets/images/spatial-validator/validation-composition.svg)

Symfony invokes the matching constraint-validator. After the input contract, `Spatial` dispatches by declared type to a specialized validator.
That validator composes reusable rules and recursively validates components through the same Symfony execution context.
Paths, root and active group survive delegation. A rule's original code and constraint remain associated with its violation.

## Complete Polygon composition

![Polygon validation combines structure and planarity, each ring's cardinality, closure, simplicity and Points, then hole placement, contacts and connected interior.](../../assets/images/spatial-validator/polygon-composition.svg)

Structure and ring checks establish the prerequisites for dependent topology calculations.
Errors in those prerequisites prevent unsafe calculations; their diagnostics are preserved.
This internal composition does not expose a second structural-only public Polygon constraint.

## Warning payloads

Warnings use the associated constraint's `payload`, normally `['severity' => 'warning']`.
They remain in the Symfony violation list: `count($violations) > 0` does not distinguish errors from warnings.
An unavailable Geography check establishes neither invalidity nor complete validity.
Hole orientation is another warning and does not imply that coordinates were repaired.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geography\LineString;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$line = new LineString([[0, 0], [1, 1]]);
$violations = Validation::createValidator()->validate($line, new SpatialAssert\SimpleLineString());
$errors = [];
$warnings = [];
foreach ($violations as $violation) {
    $payload = $violation->getConstraint()?->payload;
    $severity = is_array($payload) ? ($payload['severity'] ?? 'error') : 'error';
    if ('warning' === $severity) {
        $warnings[] = $violation;
    } else {
        $errors[] = $violation;
    }
}
echo count($errors); // 0
echo count($warnings); // 1: geodetic simplicity is unavailable
```

Payload is consumer metadata, not a Symfony filtering instruction.
Explicit payloads are preserved, including on cloned constraints used for warnings; overriding severity requires an application policy.
Generic `Spatial` does not overwrite specialized payload defaults with its parent payload.
Member diagnostics likewise retain their own constraint metadata rather than inheriting one uniform aggregate severity.

## Paths and codes

Paths use zero-based member positions, appended to any enclosing Symfony property prefix.
For example, `geometry.geometries[2].rings[1].points[3]` locates the fourth Point of the second ring of the third collection member.
Topological errors can identify a ring or surface rather than a particular Point.

| Composition | Path segment | Example diagnostic |
| --- | --- | --- |
| GeometryCollection | `geometries[index]` | `components-cycle` at a cyclic reference |
| LineString, CircularString, MultiPoint | `points[index]` | `finitecoordinates-invalid` |
| Polygon, Triangle | `rings[index]` | `polygon-outside`, `triangle-position-count` |
| MultiLineString | `lineStrings[index]` | `simplemultilinestring-invalid` |
| MultiPolygon | `polygons[index]` | `multipolygon-intersection` at the later member |
| CompoundCurve | `curves[index]` | `compoundcurve-disconnected` |
| PolyhedralSurface | `patches[index]` | `polyhedralsurface-empty-patch` |

A cyclic reference receives `components-cycle`; independent branches continue to be checked.
Shared objects in independent branches are not automatically cycles.
Compatibility errors use `components-type`, `components-family`, `components-dimension` or `components-reference`.

| Surface diagnostics | Codes |
| --- | --- |
| Polygon topology | `polygon-intersection`, `polygon-outside`, `polygon-nested`, `polygon-disconnected` |
| Polygon warnings | `polygon-orientation`, `polygon-unavailable` |
| Triangle shape | `triangle-position-count`, `triangle-interior`, `triangle-distinct`, `triangle-topology` |
| PolyhedralSurface | `polyhedralsurface-dimension`, `-empty-patch`, `-incidence`, `-orientation`, `-connected`, `-intersection`, `-manifold` |
| PolyhedralSurface warning | `polyhedralsurface-unavailable` |
| Explicit closed surface | `closedpolyhedralsurface-invalid` |

In abbreviated lists, each `-suffix` retains the preceding type prefix.
Shared structure errors retain their own codes, such as `polygonstructure-degenerate` for an absent supporting plane.
Optional rules use separate unavailable codes, such as `simplelinestring-unavailable` and `firstpointequalslastpoint-unavailable`.
Use stable codes for application branching; messages can be localized by Symfony's configured translator and should be presented as text.

For the outside-hole example in [geometry type validators](./geometric-types.md#a-hole-outside-the-exterior), inspect a diagnostic like this:

```php
foreach ($violations as $violation) {
    printf("%s: %s\n", $violation->getPropertyPath(), $violation->getCode());
}
// rings[1]: polygon-outside
```

This last excerpt assumes `$violations` contains that Polygon result, not the Geography warning list above.
The [executable examples](../../assets/examples/spatial-validator/validation-examples.php) also check a nested
`geometries[0].rings[1]` path with its original `polygon-outside` code.

## Numerical comparisons

Finite coordinate equality uses this approved LongitudeOne comparison, separately for each spatial ordinate:

```text
abs(a - b) <= PHP_FLOAT_EPSILON * max(1.0, abs(a), abs(b))
```

It includes Z when present and ignores M. Thus two XYM positions that differ only in M are spatially equal.
This is a floating-point comparison policy, not a configurable business distance tolerance or a general topology predicate.
Orientation, intersection, planarity, arc and volume calculations use robust intermediate predicates adapted to their quantities;
the delivered Geometry algorithms use exact rational/algebraic signs over the supplied finite binary coordinates.

No determinant threshold is obtained by blindly reusing the coordinate epsilon.
There is no extra proximity tolerance, snapping, rounding, merging or coordinate movement.
Nearby disjoint shapes do not become touching merely because the gap is small.
Approximate endpoint equality does not excuse a real interior crossing or replace the original coordinates.
