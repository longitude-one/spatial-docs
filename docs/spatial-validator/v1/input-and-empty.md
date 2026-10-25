---
title: Input and EMPTY values
description: Distinguish missing PHP values, unsupported strings, EMPTY spatial objects, empty lists and EMPTY members.
sidebar_position: 3
---

A missing PHP value and an empty geometry mean different things.
PHP `null` can mean that a location was not supplied. An EMPTY Point is an object that represents no position.
Spatial constraints skip only the first case; they validate the second through the applicable geometric rules.

## Input contract

| Value with the applicable spatial constraint | Direct constraint-validator call | Symfony Validator service |
| --- | --- | --- |
| PHP `null` | Returns without a violation | No violation |
| `''`, `'   '`, `'42'`, `'POINT (10 20)'` | `UnexpectedValueException` | Standard type violation |
| Integer, boolean, array, unrelated object | `UnexpectedValueException` | Standard type violation |
| Wrong specialized interface or declared type | `UnexpectedValueException` | Standard type violation |
| Accepted spatial object, including EMPTY | Applies geometric rules | Returns geometric diagnostics |

The exceptions are Symfony's `UnexpectedValueException` and `UnexpectedTypeException`.
Supplying the wrong constraint to a constraint-validator raises `UnexpectedTypeException` **before** handling the value, even for `null` or `''`.

```php
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Exception\UnexpectedValueException;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$violations = $validator->validate('', new SpatialAssert\Spatial());
echo count($violations); // 1: a type violation

try {
    (new SpatialAssert\SpatialValidator())->validate('', new SpatialAssert\Spatial());
} catch (UnexpectedValueException $exception) {
    echo 'Unsupported spatial input';
}
```

There is no library-specific `NullException`, `InvalidTypeException` or `InvalidClassException` input hierarchy.
Parse serialized input into a spatial object before validation. Presence constraints do not turn strings into accepted spatial input.
The current null-only policy supersedes the historical proposal that exempted the empty string.

## Add application presence checks

Use Symfony `NotNull` when a PHP value is required, or `NotBlank` for an application blank-value policy.
Use `Sequentially` when a failed presence check should stop later spatial validation:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use Symfony\Component\Validator\Constraints as Assert;

$required = new Assert\Sequentially([new Assert\NotBlank(), new SpatialAssert\Spatial()]);
echo count($validator->validate(null, $required)); // 1: NotBlank
echo count($validator->validate('', $required)); // 1: NotBlank; spatial check is not reached
echo count($validator->validate('42', $required)); // 1: spatial type violation
echo count($validator->validate(new Point(), $required)); // 0: an EMPTY Point is present
```

Whitespace-only strings pass the default `NotBlank` check and then fail the spatial type check.
`NotNull` rejects `null`; all strings pass that presence check and then fail spatial validation.
Using a plain list of presence and spatial constraints runs both checks, so an empty string can produce both a presence and a type violation.

## EMPTY is a per-type state

| Example | Ordinary validation | Meaning |
| --- | --- | --- |
| `new Point()` | Valid EMPTY Point | All declared ordinates absent consistently |
| `new LineString([])` | Valid EMPTY LineString | No points |
| `new Polygon([])` | Valid EMPTY Polygon | No rings |
| `new MultiPoint([])` | Valid EMPTY aggregate | No members |
| MultiPoint containing valid EMPTY Points | Valid | Members remain present in the object |
| MultiLineString containing valid EMPTY LineStrings | Valid | Members remain present in the object |
| LineString containing an EMPTY Point | Invalid | An EMPTY member is not a position on a line |
| An EMPTY LineString with `Ring` | Invalid | A ring must be non-empty, simple and closed |
| An EMPTY XYZ PolyhedralSurface | Valid ordinarily; explicit closure fails | No enclosing envelope |

The names in this table are spatial model classes, except `Ring`, which is a validator constraint.
See [collections](./collections.md) for all-EMPTY and mixed members, and [simplicity validators](./simplicity-validators.md) for optional simplicity and
[geometry type validators](./geometric-types.md#linear-ring-checks) for closure and ring contracts.

A Point supplied through `PointInterface` must provide every ordinate declared by its variant, or consistently represent EMPTY.
For example, XY values `(null, 2)` fail `CoordinateLayout`; `(null, null)` with `isEmpty() === true` is EMPTY.
The concrete Point constructor already rejects partial-null input; independent validation also protects consumers of custom interface implementations.
Present ordinates must be finite, including M: `INF`, `-INF` and `NAN` fail `FiniteCoordinates`.
