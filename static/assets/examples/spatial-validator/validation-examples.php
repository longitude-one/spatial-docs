<?php

declare(strict_types=1);

// Run with: php validation-examples.php /path/to/project/vendor/autoload.php
require $argv[1] ?? 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry as Geometry;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geography as Geography;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolyhedralSurface;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;
use Symfony\Component\Validator\Validation;

function check(bool $condition, string $description): void
{
    if (!$condition) {
        throw new RuntimeException($description);
    }
}

$validator = Validation::createValidator();
$point = new Geometry\Point(10, 20);
check(0 === count($validator->validate($point, new SpatialAssert\Spatial())), 'Generic Point validation');
check(0 === count($validator->validate($point, new SpatialAssert\Point())), 'Specialized Point validation');
check(0 === count($validator->validate($point, new SpatialAssert\Spatial(groups: ['Import']), ['Import'])), 'Active group');

// Direct calls check the constraint before handling null or any string.
foreach ([null, '', '   ', '42', 'POINT (10 20)'] as $value) {
    try {
        (new SpatialAssert\SpatialValidator())->validate($value, new Assert\NotNull());
        throw new RuntimeException('Wrong constraint was accepted');
    } catch (UnexpectedTypeException) {
        // Expected even when the value is null.
    }
}
(new SpatialAssert\SpatialValidator())->validate(null, new SpatialAssert\Spatial());
check(0 === count($validator->validate(null, new SpatialAssert\Spatial())), 'Null is optional');

foreach (['', '   ', '42', 'POINT (10 20)', 42, false, [], new stdClass()] as $value) {
    foreach ([new SpatialAssert\Spatial(), new SpatialAssert\Point()] as $constraint) {
        $direct = $constraint instanceof SpatialAssert\Spatial
            ? new SpatialAssert\SpatialValidator() : new SpatialAssert\PointValidator();
        try {
            $direct->validate($value, $constraint);
            throw new RuntimeException('Unsupported value was accepted');
        } catch (UnexpectedValueException) {
            // Direct invocation throws; the service converts this into a type violation.
        }
        $violations = $validator->validate($value, $constraint);
        check(1 === count($violations), 'Service type violation');
        check('This value should be of type {{ type }}.' === $violations->get(0)->getMessageTemplate(), 'Type message');
        foreach ([new Assert\NotNull(), new Assert\NotBlank()] as $presence) {
            $sequential = new Assert\Sequentially([$presence, $constraint]);
            $list = $validator->validate($value, $sequential);
            check(1 === count($list), 'Presence cannot accept an unsupported input');
            $expected = $presence instanceof Assert\NotBlank && ('' === $value || false === $value || [] === $value)
                ? $presence::class : $constraint::class;
            check($list->get(0)->getConstraint() instanceof $expected, 'Presence runs before spatial checks');
            if ($expected === $constraint::class) {
                try {
                    $direct->validate($value, $constraint);
                    throw new RuntimeException('Presence changed direct spatial acceptance');
                } catch (UnexpectedValueException) {
                    // Values that pass presence still fail the same direct spatial precondition.
                }
            }
        }
    }
}
foreach ([new Assert\NotNull(), new Assert\NotBlank()] as $presence) {
    $required = new Assert\Sequentially([$presence, new SpatialAssert\Spatial()]);
    check(1 === count($validator->validate(null, $required)), 'Presence rejects null');
    check(0 === count($validator->validate(new Geometry\Point(), $required)), 'EMPTY Point is present');
}

// EMPTY members are retained, including all-EMPTY and mixed typed aggregates.
$emptyPoint = new Geometry\Point();
$emptyLine = new Geometry\LineString([]);
$allEmpty = new Geometry\MultiPoint([$emptyPoint, $emptyPoint]);
$mixed = new Geometry\MultiPoint([$emptyPoint, $point]);
$allEmptyLines = new Geometry\MultiLineString([$emptyLine]);
$mixedLines = new Geometry\MultiLineString([$emptyLine, new Geometry\LineString([[0, 0], [1, 1]])]);
foreach ([$allEmpty, $mixed, $allEmptyLines, $mixedLines, new Geometry\GeometryCollection(elements: [$emptyPoint])] as $value) {
    $members = $value->getElements();
    check(0 === count($validator->validate($value, new SpatialAssert\Spatial())), 'Valid collection members');
    check($members === $value->getElements(), 'Members preserved');
}
check(2 === count($allEmpty->getPoints()), 'All-EMPTY list retained');
$duplicates = new Geometry\MultiPoint([new Geometry\Point(1, 2), new Geometry\Point(1, 2)]);
check(0 === count($validator->validate($duplicates, new SpatialAssert\MultiPoint())), 'Duplicate ordinary validity');
check(1 === count($validator->validate($duplicates, new SpatialAssert\SimpleMultiPoint())), 'Explicit distinctness');
check(1 === count($validator->validate($allEmptyLines, new SpatialAssert\ClosedMultiLineString())), 'EMPTY closure');

$boundary = new Geometry\LineString([[0, 0], [4, 0], [0, 4], [0, 0]]);
check(0 === count($validator->validate($boundary, new SpatialAssert\Ring())), 'Linear ring');
check(1 === count($validator->validate($emptyLine, new SpatialAssert\Ring())), 'EMPTY is not a ring');
$open = new Geometry\CircularString([[-1, 0], [0, 1], [1, 0]]);
$retraced = new Geometry\CircularString([[-1, 0], [0, 1], [1, 0], [0, 1], [-1, 0]]);
$circle = new Geometry\CircularString([[-1, 0], [0, 1], [1, 0], [0, -1], [-1, 0]]);
check(0 === count($validator->validate($open, new SpatialAssert\SimpleCircularString())), 'Simple open semicircle');
check(0 === count($validator->validate($retraced, new SpatialAssert\CircularString())), 'Valid retraced semicircle');
check(1 === count($validator->validate($retraced, new SpatialAssert\SimpleCircularString())), 'Non-simple retracing');
check(0 === count($validator->validate($circle, new SpatialAssert\SimpleCircularString())), 'Simple closed circle');

$outsideHole = new Geometry\Polygon([
    [[0, 0], [12, 0], [12, 12], [0, 12], [0, 0]],
    [[20, 2], [20, 4], [22, 2], [20, 2]],
]);
foreach ([new SpatialAssert\Polygon(), new SpatialAssert\Spatial()] as $constraint) {
    $violations = $validator->validate($outsideHole, $constraint);
    check(1 === count($violations), 'Complete Polygon validation');
    check('polygon-outside' === $violations->get(0)->getCode(), 'Outside-hole code');
    check('rings[1]' === $violations->get(0)->getPropertyPath(), 'Outside-hole path');
}
$nested = new Geometry\GeometryCollection(elements: [$outsideHole]);
$violations = $validator->validate($nested, new SpatialAssert\Spatial());
check('geometries[0].rings[1]' === $violations->get(0)->getPropertyPath(), 'Nested path');
check('polygon-outside' === $violations->get(0)->getCode(), 'Nested original code');
check($nested === $violations->get(0)->getRoot(), 'Root preserved');
$triangularPolygon = new Geometry\Polygon([[[0, 0], [4, 0], [0, 4], [0, 0]]]);
check(0 === count($validator->validate($triangularPolygon, new SpatialAssert\Spatial())), 'Polygon dispatch');
check(1 === count($validator->validate($triangularPolygon, new SpatialAssert\Triangle())), 'No Triangle inference');
check(0 === count($validator->validate(new Geometry\Triangle([[[0, 0], [4, 0], [0, 4], [0, 0]]]), new SpatialAssert\Triangle())), 'Declared Triangle');

$emptySurface = new PolyhedralSurface();
check(0 === count($validator->validate($emptySurface, new SpatialAssert\PolyhedralSurface())), 'Default EMPTY surface');
check(1 === count($validator->validate($emptySurface, new SpatialAssert\ClosedPolyhedralSurface())), 'Explicit EMPTY surface closure');
$line = new Geography\LineString([[0, 0], [1, 1]]);
$violations = $validator->validate($line, new SpatialAssert\SimpleLineString());
check(1 === count($violations), 'Geography simplicity warning');
check(['severity' => 'warning'] === $violations->get(0)->getConstraint()?->payload, 'Associated warning payload');

// A relative-orientation warning is retained without reorienting the rings.
$sameDirection = new Geometry\Polygon([
    [[0, 0], [12, 0], [12, 12], [0, 12], [0, 0]],
    [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
]);
$before = $sameDirection->toArray();
$violations = $validator->validate($sameDirection, new SpatialAssert\Spatial());
check(1 === count($violations), 'Hole orientation diagnostic');
check('polygon-orientation' === $violations->get(0)->getCode(), 'Orientation code');
check(['severity' => 'warning'] === $violations->get(0)->getConstraint()?->payload, 'Orientation warning payload');
check($before === $sameDirection->toArray(), 'No automatic reorientation');

echo "Spatial validation examples passed.\n";
