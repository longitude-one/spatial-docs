---
title: Mutable and immutable objects
description: Select the shared factory mode and understand how it affects new spatial objects and existing components.
sidebar_position: 3
---

Use immutable objects when a spatial value should remain unchanged after creation. Use mutable objects when you need in-place edits.
The type-specific factory stays the same; `SpatialFactory` selects which representation it returns.

## Select the mode

The initial mode in a fresh PHP execution is immutable.
`SpatialFactory::immutable()` and `SpatialFactory::mutable()` return void and select the mode for subsequent factory calls.
`SpatialFactory::isMutable()` reports the current selection.

Composer's autoloader must already be loaded. This example creates both representations with the same XY Geometry factory.

```php
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Value\Coordinates;

SpatialFactory::immutable();
$fixed = PointFactory::create(1, 2);
$moved = $fixed->withCoordinates(Coordinates::xy(3, 4));

SpatialFactory::mutable();
$editable = PointFactory::create(1, 2);
$same = $editable->setX(5);

assert($fixed instanceof PointImmutable);
assert($editable instanceof Point);
assert($same === $editable);
assert([1, 2] === $fixed->toArray());
assert([3, 4] === $moved->toArray());
assert([5, 2] === $editable->toArray());
assert(SpatialFactory::isMutable());

SpatialFactory::immutable();
assert(!SpatialFactory::isMutable());
assert([5, 2] === $editable->toArray());
```

Changing the mode neither freezes nor converts existing objects. Immutable replacements return new objects; mutable setters return the receiver.

## Understand the shared scope

The selection is shared by all public type-specific factories in the same PHP execution, including their callers in other libraries.
It is neither a per-factory option nor a parameter on individual `create()` calls.
If one caller selects mutable output, the next creation by another caller also uses mutable output.
Select the intended mode at an application boundary where its effect on all consumers is understood.

| Creation API | Representation selection |
| --- | --- |
| Type-specific factories | Shared current `SpatialFactory` mode |
| Direct constructors | The concrete class chosen by the caller |
| [Spatial builder](../spatial-builder.md) | Local builder configuration, independent of the shared mode |

## Use the appropriate contract

Both representations expose common read interfaces such as `PointInterface` and `LineStringInterface`.
Read-only consumers can depend on those interfaces without choosing a representation.

| Representation | Concrete classes | Editing API |
| --- | --- | --- |
| Immutable | `Types\<dimension>\<family>\<type>Immutable` | Applicable `with…` methods and `copy()` |
| Mutable | `Types\<dimension>\<type>`; family stored on the instance | Applicable `set…`, `add…` and `remove…` methods |

In mutable mode, both heterogeneous collection factories return the dimension's `SpatialCollection`, with the selected family.
Mutable objects expose no `with…` methods, and immutable objects expose no mutation methods.
Neither representation has a dimension setter. `Coordinates` and `SpatialReference` remain immutable auxiliary values.

## Keep component representations compatible

An aggregate requires components of its own representation, recursively. Switching the shared mode does not convert components created earlier.
For example, a point created in immutable mode cannot be inserted into a line created in mutable mode.
Create compatible components in the intended mode, or let the factory construct descendants from coordinate arrays.
See [creating composite objects](./composite-objects.md) for ownership and rejection examples.
