---
title: Spatial Validator 1.x
description: Guides and references for the Symfony API, validation rules, EMPTY values and diagnostics in Spatial Validator 1.x.
sidebar_label: Overview
pagination_label: Spatial Validator 1.x
sidebar_position: 1
---

Validate spatial objects with Symfony constraints, then inspect each diagnostic to distinguish geometric errors from warnings about orientation or unavailable checks.

This documentation targets **1.0.0-RC.0**. Examples were verified against the
[delivered implementation](https://github.com/longitude-one/spatial-validator/tree/e16098b457520ae03cdc8355d2fddf9f4ddd899e).
This target identifies the documentation milestone, not an announcement that the RC has been released.

| Your task | Read |
| --- | --- |
| Install the package and validate an object | [Symfony validation](./symfony-validation.md) |
| Handle null, strings and presence checks | [Input and EMPTY values](./input-and-empty.md) |
| Select rules for a type, family and dimension | [Coverage and rule catalogue](./coverage-and-rules.md) |
| Validate curves, rings, polygons and surfaces | [Curves and surfaces](./curves-and-surfaces.md) |
| Use collections without discarding EMPTY members | [Collections](./collections.md) |
| Read paths, codes and warning payloads | [Diagnostics and composition](./diagnostics-and-composition.md) |

Examples use PHP 8.4 or later within PHP 8 and Symfony Validator 5.4, 6, 7 or 8.
The [executable examples](../../assets/examples/spatial-validator/validation-examples.php) provide regression checks for the documented contracts.
The documentation site itself has no PHP package dependency.
