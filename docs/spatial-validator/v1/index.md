---
title: Getting started with Spatial Validator 1.0
description: Start validating spatial objects with Symfony constraints and understand validation coverage, EMPTY values, errors and warnings in Spatial Validator 1.0.
sidebar_label: Overview
pagination_label: Getting started
sidebar_position: 1
---

Spatial Validator 1.0 checks LongitudeOne spatial objects through Symfony Validator.
Use it to check a position, route or parcel boundary before accepting it in your application.
Creating an object with `spatial-types` establishes its structure; it does not establish its geometric validity.

## Install

```sh
composer require longitude-one/spatial-validator:^1.0
```

## Validate your first objects

After [installing the package](#install), validate an object with the generic `Spatial` constraint:

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$pointA = new Point(5, -1);
$pointB = new Point(7, 3);
$pointC = new Point(3, 1);
$line = new LineString([$pointB, $pointC]);
$validator = Validation::createValidator();

$violationsPoints = $validator->validate($pointA, new SpatialAssert\Spatial());
echo count($violationsPoints); // 0

$violationsLines = $validator->validate($line, new SpatialAssert\Spatial());
echo count($violationsLines); // 0
```

![Points A (5, -1), B (7, 3) and C (3, 1), with a LineString connecting B to C.](../../assets/images/spatial-validator/first-validation.svg)

The example creates three points and a line connecting B to C, then validates point A and the line independently.
You do not need to choose a validator for each spatial type: the generic `Spatial` constraint automatically selects the appropriate validator
from the object's declared spatial type. The same constraint validates both the point and the line above.
Use a specialized constraint such as `Point` or `Polygon` only when your application also needs to require that particular type.
See [geometry type validators](./geometric-types.md) for type-specific contracts and examples.

## Use validation groups

Groups let your application select when a constraint runs, for example during an import.
Select the same group in the constraint and in Symfony's `validate()` call. Reuse `$validator` and `$pointA` from the example above:

```php
$constraint = new SpatialAssert\Spatial(groups: ['Import']);
$violations = $validator->validate($pointA, $constraint, ['Import']);
echo count($violations); // 0
```

Delegation and component recursion preserve the active group, validation root and property path.
`Spatial` creates the specialized constraint with the selected groups, retaining the specialized defaults for diagnostic payloads.
Its own payload is not copied to every delegated diagnostic.
For custom metadata on a particular rule, apply that constraint explicitly and inspect the constraint associated with each violation.

## Understand the result

Validation returns a Symfony violation list. Each diagnostic can identify a rule, a code and a path to the affected component.
The list includes both errors and warnings, so a non-zero count does not by itself tell you whether to reject the object.
Read [diagnostics and warning payloads](./diagnostics-and-composition.md) to define your application's policy.

Keep these boundaries in mind:

- Supported checks depend on the spatial type, coordinate dimension and Geometry or Geography family.
  An unavailable check produces a warning; it does not establish complete validity.
- Optional properties such as line simplicity and closure require explicit constraints.
- `null` and EMPTY spatial objects have different meanings. Use Symfony presence constraints when a value is required.
- Validation inspects objects without repairing shapes, moving coordinates or converting their coordinate reference system.

## Understand differences between a valid structure and a valid geometry

A valid structure contains the expected objects; a valid geometry also satisfies the rules of its declared spatial type.
For example, three points A, B and C can form a valid open LineString, but they do not form a valid triangular boundary:
the sequence must return to its starting point, A → B → C → A, to close it.

![Valid blue points and open LineString A–B–C, with red shading for the invalid triangular boundary and a dashed guide for the missing C–A segment.](../../assets/images/spatial-validator/open-triangle-validation.svg)

The red fill shows the intended triangle; the dashed closing segment is missing from the actual line.

See [geometry type validators](./geometric-types.md) for the checks applied to each geometry type and concrete examples.

## Choose your next step

| Your task                                        | Read                                                            |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Apply type-specific validation rules             | [Geometry type validators](./geometric-types.md)                |
| Select when constraints run                      | [Validation groups](#use-validation-groups)                     |
| Handle null, strings and presence checks         | [Input and EMPTY values](./input-and-empty.md)                  |
| Check optional simplicity properties             | [Simplicity validators](./simplicity-validators.md)             |
| Use collections without discarding EMPTY members | [Collections](./collections.md)                                 |
| Read paths, codes and warning payloads           | [Diagnostics and composition](./diagnostics-and-composition.md) |

## Requirements and example verification

This documentation covers **version 1.0**. Examples use PHP 8.4 or later within PHP 8 and Symfony Validator 5.4, 6, 7 or 8.
The package requires `spatial-core ^1.3` and `spatial-types ^1.0@beta`; Composer resolves these dependencies.

Download [validation-examples.php](../../assets/examples/spatial-validator/validation-examples.php) to verify the documented contracts.
In a project containing the package, run:

```sh
php validation-examples.php vendor/autoload.php
```

The script fails if an expected result changes and prints `Spatial validation examples passed.` on success.
It exercises generic and specialized constraints, groups, input handling, EMPTY members, curves, Polygon, Triangle and surface closure.
