---
title: Validate with Symfony
description: Set up Spatial Validator, select generic or specialized constraints, and use Symfony validation groups.
sidebar_position: 2
---

Use the generic `Spatial` constraint when your application accepts several spatial types.
Use a specialized constraint when a field must contain a particular declared type, such as Point or Polygon.
Both return ordinary Symfony violation lists.

## Install and run

For the 1.0 series, use the following Composer requirement when a matching release is available.
It requires PHP `^8.4`, `spatial-core ^1.3`, `spatial-types ^1.0@beta` and Symfony Validator `^5.4 || ^6.0 || ^7.0 || ^8.0`.
Composer resolves the package dependencies; PCOV and the library's quality tools are not consumer requirements.

```bash
composer require 'longitude-one/spatial-validator:~1.0.0'
```

In a project with the package installed, run this PHP code:

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$position = new Point(10, 20);
$violations = $validator->validate($position, new SpatialAssert\Spatial());
echo count($violations); // 0
```

`Spatial` is the delivered generic constraint name. References to `ValidSpatial` in earlier design discussions do not name another public entry point.
All library constraints and their matching `<Name>Validator` classes use the namespace `LongitudeOne\SpatialValidator\Validator\Constraints`.

## Select a specialized contract

Continue with the validator and position above:

```php
$violations = $validator->validate($position, new SpatialAssert\Point());
echo count($violations); // 0
```

A specialized constraint checks its required spatial interface and declared geometry type.
`Triangle` requires `TriangleInterface`; it does not accept a Polygon merely because its coordinates form a triangle.
Generic dispatch follows the declared type, independently of the concrete dimension-specific model class.
See [the Triangle example](./curves-and-surfaces.md#triangle-is-a-declared-contract).

Public specialized type constraints accept Symfony `groups` and `payload` without additional library-specific options.
Elementary rules can have their own parameters, such as `MinimumPointCount(limit: 4)`.

## Use validation groups

Select the same group in the constraint and in Symfony's `validate()` call:

```php
$constraint = new SpatialAssert\Spatial(groups: ['Import']);
$violations = $validator->validate($position, $constraint, ['Import']);
echo count($violations); // 0
```

Delegation and component recursion preserve the active group, validation root and property path.
`Spatial` creates the specialized constraint with the selected groups, retaining the specialized defaults for diagnostic payloads.
Its own payload is not copied to every delegated diagnostic.
For custom metadata on a particular rule, apply that constraint explicitly and inspect the constraint associated with each violation.

## Verify the examples

Download [validation-examples.php](../../assets/examples/spatial-validator/validation-examples.php).
In a project containing the target package, run:

```bash
php validation-examples.php vendor/autoload.php
```

The script fails if an expected result changes and prints `Spatial validation examples passed.` on success.
It exercises generic and specialized constraints, groups, direct input exceptions, presence composition, EMPTY members, curves, Polygon, Triangle and surface closure.

Continue with [input and EMPTY values](./input-and-empty.md) before applying an application presence policy.
