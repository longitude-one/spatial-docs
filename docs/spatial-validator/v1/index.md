---
title: Getting started with Spatial Validator
description: Install Spatial Validator and validate any supported spatial object with one generic workflow.
sidebar_position: 1
sidebar_label: Overview
pagination_label: Getting started
---

Spatial Validator checks the geometric rules applicable to an object implementing `SpatialInterface`.
Use it before accepting a position, route or parcel boundary in your application.
Creating an object with Spatial Types establishes its representation; it does not establish its geometric validity.

The `Spatial` constraint selects the checks for the object's declared type, including its components.
The same validation workflow handles mutable and immutable objects, Geometry and Geography, and the available coordinate variants.
Available checks depend on the type and spatial model: an unavailable check produces a warning.

## Install

The library requires PHP 8.4 or later within PHP 8.
Symfony Validator 5.4, 6, 7 and 8 are supported. Composer installs the required dependencies:

```sh
composer require longitude-one/spatial-validator:^1@RC
```

## Validate a spatial object

Use `Spatial` without choosing a constraint for each concrete type.
This complete example validates a Point at (10, 20) and handles the possible results.
The function accepts any supported `SpatialInterface` object; replace the Point with your own object without changing the function.

![Point P at (10, 20) has two finite coordinates.](../../assets/images/spatial-validator/point-valid.svg)

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Interfaces\SpatialInterface;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialValidator\Validator\Constraints\Spatial;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

function validateSpatial(
    SpatialInterface $object,
    ValidatorInterface $validator,
): void {
    $violations = $validator->validate($object, new Spatial());
    $errors = [];
    $warnings = [];

    foreach ($violations as $violation) {
        $payload = $violation->getConstraint()?->payload;
        $severity = is_array($payload)
            ? ($payload['severity'] ?? 'error')
            : 'error';
        $message = sprintf(
            '%s: %s',
            $violation->getPropertyPath() ?: '[root]',
            $violation->getMessage(),
        );

        if ('warning' === $severity) {
            $warnings[] = $message;
        } else {
            $errors[] = $message;
        }
    }

    foreach ($errors as $message) {
        echo 'Error — ' . $message . PHP_EOL;
    }
    foreach ($warnings as $message) {
        echo 'Warning — ' . $message . PHP_EOL;
    }

    if ($errors !== []) {
        echo 'Rejected: geometric errors were found.' . PHP_EOL;
    } elseif ($warnings !== []) {
        echo 'Review required: validation returned warnings.' . PHP_EOL;
    } else {
        echo 'Accepted: no issues were found by the applied checks.' . PHP_EOL;
    }
}

$validator = Validation::createValidator();
validateSpatial(new PointImmutable(10, 20), $validator);
```

```text
Accepted: no issues were found by the applied checks.
```

## Understand the result

Symfony returns a list of diagnostics, called constraint violations. This list can contain both errors and warnings:

| Result | Meaning | Policy used in the example |
| --- | --- | --- |
| Errors | An applied validation rule failed. | Reject the object. |
| Warnings without errors | A check is unavailable or another condition needs attention. | Request review. |
| No diagnostics | The applied checks found no issues. | Accept the object. |

An unavailable check establishes neither invalidity nor complete validity.
A non-zero violation count alone cannot distinguish errors from warnings; your application decides its warning policy.
Validation does not repair the object, move coordinates or transform its coordinate reference system.

## Continue with your application's needs

| Your task | Read |
| --- | --- |
| Store or display diagnostics and locate an invalid component | [Handle validation results](./handling-results.md) |
| Understand what is checked for your spatial type | [Validate geometric types](./geometric-types.md) |
| Require a value or handle EMPTY objects and members | [Missing and EMPTY values](./input-and-empty.md) |
| Require a particular type, simplicity or closure | [Add validation requirements](./additional-checks.md) |
| Validate object properties and use groups | [Integrate with Symfony Validator](./symfony-integration.md) |

You can also download the [executable examples](../../assets/examples/spatial-validator/validation-examples.php)
and run them against a project containing the library:

```sh
php validation-examples.php vendor/autoload.php
```
