---
title: Handle validation results
description: Distinguish errors and warnings, locate invalid components and use diagnostic codes in your application.
sidebar_position: 2
---

A validation result tells you what needs attention and where it occurred.
Start with the error and warning handling in the [overview](./index.md); this page explains how to use each diagnostic in your application.

## Read a diagnostic

Each Symfony violation exposes:

| Method | Use |
| --- | --- |
| `getMessage()` | Display an explanation; Symfony can translate it. |
| `getPropertyPath()` | Locate the affected object or component. An empty path means the validated root. |
| `getCode()` | Identify the rule without depending on the message's language. |
| `getConstraint()` | Inspect the associated constraint, including its severity metadata in `payload`. |

For example, a Polygon can contain an individually valid ring which lies outside its exterior boundary.
Validation identifies that hole rather than reporting only that the whole parcel failed.

![A triangular hole lies outside the square exterior, so containment fails at the second ring.](../../assets/images/spatial-validator/polygon-hole-outside.svg)

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\GeometryCollectionImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PolygonImmutable;
use LongitudeOne\SpatialValidator\Validator\Constraints\Spatial;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$polygon = new PolygonImmutable([
    [[0, 0], [12, 0], [12, 12], [0, 12], [0, 0]],
    [[20, 2], [20, 4], [22, 2], [20, 2]],
]);
$violations = $validator->validate($polygon, new Spatial());

foreach ($violations as $violation) {
    printf(
        "%s | %s: %s\n",
        $violation->getPropertyPath() ?: '[root]',
        $violation->getCode(),
        $violation->getMessage(),
    );
}
```

```text
rings[1] | polygon-outside: Every hole must lie inside the exterior boundary.
```

Indexes start at zero: `rings[1]` is the second ring, the first hole.
The exterior is `rings[0]`. Surface relationship errors can identify a whole ring or patch rather than a single Point.

## Locate a nested component

Validation follows collection members and retains the original rule's code.
Continue with the Polygon above:

```php
$collection = new GeometryCollectionImmutable(elements: [$polygon]);
$violations = $validator->validate($collection, new Spatial());

foreach ($violations as $violation) {
    printf("%s | %s\n", $violation->getPropertyPath(), $violation->getCode());
}
```

```text
geometries[0].rings[1] | polygon-outside
```

Here the first collection member contains the invalid hole.
An enclosing Symfony property adds its prefix, for example `shape.geometries[0].rings[1]`.

| Container | Component path |
| --- | --- |
| GeometryCollection | `geometries[index]` |
| LineString, CircularString, MultiPoint | `points[index]` |
| Polygon, Triangle | `rings[index]` |
| CompoundCurve | `curves[index]` |
| MultiLineString | `lineStrings[index]` |
| MultiPolygon | `polygons[index]` |
| PolyhedralSurface | `patches[index]` |

## Distinguish warnings from errors

Warnings are also Symfony violations. Their associated constraint normally has `['severity' => 'warning']` as its payload.
Absent severity metadata is treated as an error in the overview's example.

For example, the library warns when a Polygon's hole follows the same direction as its exterior.
This warning does not mean that the library has reversed the hole or repaired the object.

![The exterior and hole follow the same direction, producing an orientation warning.](../../assets/images/spatial-validator/polygon-orientation-warning.svg)

```php
$sameDirection = new PolygonImmutable([
    [[0, 0], [12, 0], [12, 12], [0, 12], [0, 0]],
    [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
]);
$violations = $validator->validate($sameDirection, new Spatial());

foreach ($violations as $violation) {
    $payload = $violation->getConstraint()?->payload;
    $severity = is_array($payload) ? ($payload['severity'] ?? 'error') : 'error';
    printf("%s | %s\n", $severity, $violation->getCode());
}
```

```text
warning | polygon-orientation
```

A warning can also mean that a calculation is unavailable, particularly for Geography.
Choose whether to reject, log or request review for warnings; do not silently interpret them as proof of validity.
Errors and warnings may coexist in the same result, so inspect the entire list.

## Use codes and payloads deliberately

Branch on codes such as `polygon-outside`, rather than matching English message text.
Keep both the code and path when recording a diagnostic: the same rule can fail in several members.
For example, `components-reference` identifies incompatible spatial references and `components-cycle` identifies a cyclic component reference.

The `payload` is application metadata; Symfony does not use it to filter the result.
An explicit payload on a specialized constraint is preserved and can override default severity metadata.
The generic `Spatial` constraint does not copy its payload to every delegated diagnostic.
Inspect the constraint attached to each violation rather than assuming that every member shares one payload.

See [geometric type checks](./geometric-types.md) and [additional requirements](./additional-checks.md)
for the diagnostic codes used in the examples.
For adding constraints and groups, continue with [Symfony integration](./symfony-integration.md).
