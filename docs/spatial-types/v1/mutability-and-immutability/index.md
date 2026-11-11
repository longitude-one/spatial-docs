---
title: Mutability and Immutability
description: Choose between immutable spatial values for safe sharing and mutable objects for controlled in-place editing.
sidebar_label: Overview
sidebar_position: 1
---

Spatial Types provides two editing strategies. Immutable objects return new values when you replace coordinates or components;
mutable objects let you edit the same instance. Choose according to how your application shares and updates spatial data.

## Advantages of immutability

Immutable values are safe to share: code holding a point cannot edit it and indirectly change every geometry containing it.
Replacement operations leave the source unchanged, making before-and-after values explicit and useful for retaining earlier states.
Choose this strategy when stable values and predictable sharing matter more than in-place editing.
The concrete classes have an `Immutable` suffix; see [Immutability](./immutability.md).

## Advantages of mutability

Mutable objects support successive edits without requiring callers to replace the spatial instance after each operation.
Setters return the receiver, so related edits can be chained. Shared components allow several geometries to reflect the same point update,
which is useful for interactive editing when that sharing is intentional.
Choose this strategy when you control object ownership and want changes to remain visible through existing references.
See [Mutability](./mutability.md) for the setters and their effects.

## Compare the strategies

| Question | Immutable | Mutable |
| --- | --- | --- |
| How do coordinates change? | A `with…` operation returns a new value | A `set…` operation edits the receiver |
| Does the original value remain unchanged? | Yes | No |
| What happens to shared components? | They cannot be edited in place | Their edits are visible through every owner |
| Typical use | Stable values and retained earlier states | Controlled successive or shared edits |

Composer's autoloader must already be loaded. This example contrasts the two coordinate-editing operations:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$fixed = new PointImmutable(1, 2);
$replacement = $fixed->withCoordinates(Coordinates::xy(3, 4));
$editable = new Point(1, 2);
$same = $editable->setX(3)->setY(4);

assert([1, 2] === $fixed->toArray());
assert([3, 4] === $replacement->toArray());
assert($replacement !== $fixed);
assert([3, 4] === $editable->toArray());
assert($same === $editable);
```

Neither strategy guarantees [geometric validity](../validators.md), and mutable and immutable spatial components cannot be mixed inside an aggregate.
Select factory output through the [shared factory mode](../spatial-factories/mutable-and-immutable.md),
or configure representation locally with the [spatial builder](../spatial-builder.md).
