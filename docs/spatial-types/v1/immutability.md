---
title: Immutability and mutability
description: Choose immutable spatial values for safe reuse or mutable objects for flexible, in-place editing.
---

## Immutability

Immutable types, identified by the `Immutable` suffix, protect spatial values from
unexpected changes. Their coordinates, spatial reference, and components cannot
be changed through the public API; replacement operations return a new object.
This makes them safe to reuse across your application: a point shared by several
geometries keeps the same value, so one part of your code cannot silently alter
another part's data. Immutability makes changes explicit and easier to reason about;
it does not guarantee geometric validity.

## Mutability

Mutable types let you edit the same object in place through setters. This flexibility
is useful when building a geometry step by step, adjusting coordinates interactively,
or applying successive edits without replacing the object each time. Shared mutable
components also let related geometries reflect the same update: moving a shared point
updates every geometry that references it. Choose mutability when that shared editing
behaviour is useful and you control where changes occur.
