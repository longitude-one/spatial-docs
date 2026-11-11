---
title: What Spatial Types checks
description: Distinguish structural checks in Spatial Types from explicit geometric validation in Spatial Validator.
---

Spatial Types stores and edits spatial representations. Construction success does not establish geometric validity.
Geometric evaluation belongs to explicit consumer validation through [Spatial Validator](../../spatial-validator/v1/index.md).
Spatial Types does not depend on that package or Symfony Validator and does not invoke their constraints.

## Structural checks protect the object model

Constructors and edits check required component interfaces, tuple indices and mutable/immutable ownership, including descendants.
Mutable composites also require all supplied components and descendants to match their layout, even when EMPTY; XYZ and XYM remain distinct.
Immutable aggregates retain their permissive supplied-member layout contract. Indexed operations require valid addresses.
Mutable collections reject containment cycles while allowing repeated members and shared descendants in an acyclic graph.

These checks do not repair geometry, convert supplied objects or synchronize their declared family and reference.
See [composite construction](./spatial-factories/composite-objects.md) and [mutable editing](./mutability-and-immutability/mutability.md).

## Accepted representation does not mean valid geometry

A triangle constructor can store three positions without the closing return to the first. Composer's autoloader must already be loaded:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\TriangleImmutable;

$triangle = new TriangleImmutable([[[0, 0], [4, 0], [0, 3]]]);
assert([[[0, 0], [4, 0], [0, 3]]] === $triangle->toArray());
```

Construction preserves the positions rather than closing the boundary or checking triangle cardinality.
Coordinate completeness, numeric geographic ranges, family/reference compatibility, closure, simplicity, continuity and topology require explicit validation.
Partial-null points, disconnected compound curves and incompatible declared references remain representable.
Coordinate strings still pass through the coordinate parser and may fail there; numeric coordinates bypass that parser.

## Recognize technical input errors

| Failure | Exception |
| --- | --- |
| Incompatible spatial component kind or mutable/immutable representation | `InvalidValueException` |
| Mismatching supplied component layout in a mutable composite | `InvalidDimensionException` |
| Missing or invalid indexed position | `OutOfBoundsException` |
| Non-spatial argument to a spatially typed single-component operation | PHP `TypeError` |

Library exceptions implement `SpatialTypeExceptionInterface`. Parsing failures and exceptions raised by custom implementations retain their own contracts.
Rejected technical membership edits preserve the receiver and supplied components; this protection is separate from geometric validity.

## Validate explicitly when needed

Use a Spatial Validator version compatible with the Spatial Types interfaces in your application.
Its constraints live under `LongitudeOne\SpatialValidator\Validator\Constraints`.
See the [setup guide](../../spatial-validator/v1/index.md) and [geometry type validators](../../spatial-validator/v1/geometric-types.md)
for supported checks and validation calls. Available checks depend on type, layout and family.

Use Spatial Validator to evaluate emptiness, closure and simplicity; these evaluations are not operations on the spatial value itself.
Revalidate mutable objects after edits whenever the consuming application requires valid geometry.
