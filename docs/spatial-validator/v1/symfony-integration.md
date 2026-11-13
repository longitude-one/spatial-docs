---
title: Integrate with Symfony Validator
description: Apply spatial constraints to object properties, select validation groups and configure constraint metadata.
sidebar_position: 6
---

Spatial Validator provides constraints for Symfony Validator.
You can validate a spatial object directly, as in the [overview](./index.md), or attach the constraint to a property of an application object.
The examples here use the standalone Symfony component; no framework application is required.

## Validate an application object's property

Configure property constraints through Symfony's static metadata loader.
Here an imported record requires a spatial value, followed by ordinary geometric validation:

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Interfaces\SpatialInterface;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialValidator\Validator\Constraints\Spatial;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Mapping\ClassMetadata;
use Symfony\Component\Validator\Validation;

final class LocationInput
{
    public function __construct(public ?SpatialInterface $shape)
    {
    }

    public static function loadValidatorMetadata(ClassMetadata $metadata): void
    {
        $metadata->addPropertyConstraint('shape', new Assert\Sequentially([
            new Assert\NotNull(),
            new Spatial(),
        ]));
    }
}

$validator = Validation::createValidatorBuilder()
    ->addMethodMapping('loadValidatorMetadata')
    ->getValidator();

$input = new LocationInput(new PointImmutable(INF, 20));
$violations = $validator->validate($input);
foreach ($violations as $violation) {
    printf("%s | %s\n", $violation->getPropertyPath(), $violation->getCode());
}
```

```text
shape | finitecoordinates-invalid
```

The `shape` prefix comes from the application property.
For an invalid nested member, the path continues into that member, for example `shape.geometries[0].rings[1]`.
Treat this result with the same [error and warning policy](./handling-results.md) as a directly validated spatial object.
If the value is `null`, `NotNull` fails and `Sequentially` stops before the spatial check.

## Select when validation runs

Groups let your application select requirements for a particular operation, such as importing data.
Set the group on the constraint and select it in Symfony's `validate()` call:

```php
$point = new PointImmutable(INF, 20);
$constraint = new Spatial(groups: ['Import']);

echo count($validator->validate($point, $constraint)) . PHP_EOL; // 0: Default group does not run Import.
echo count($validator->validate($point, $constraint, ['Import'])) . PHP_EOL; // 1: finite-coordinate error.
```

The first result does not mean that the Point passed its coordinate checks: those checks were not selected.
Validation groups control when constraints run; they do not change their geometric rules.
The active group is preserved through specialized constraints and recursive component validation.

For constraints attached to a property, select the relevant group when validating the enclosing object.
Assign presence checks and spatial checks to the groups in which your application needs them.

## Configure diagnostic metadata

Symfony constraints accept a `payload` for application metadata.
On a specialized constraint, explicit payloads are preserved, including for warnings produced by that constraint.
Use the default payload behavior when relying on the documented `severity` convention.

The generic `Spatial` constraint selects specialized constraints with their own diagnostic defaults.
Its payload is not copied to every diagnostic; nested member constraints also retain their own metadata.
For example, setting an import identifier on `Spatial` does not attach that identifier to every coordinate violation.
Store operation metadata alongside your application's result if you need it for all diagnostics.

## Keep validation and application policy separate

Symfony returns violations; it does not reject an HTTP request or prevent persistence on its own.
Your application uses the result to accept, reject or request review, as shown in the [overview](./index.md).

Continue with [geometric type checks](./geometric-types.md) and [additional requirements](./additional-checks.md)
to choose the spatial constraints your application needs.
