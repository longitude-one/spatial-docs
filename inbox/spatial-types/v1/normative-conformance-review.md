# Normative conformance review for 1.0.0

This review covers the spatial representations provided by `spatial-types`
for [Story #26](https://github.com/longitude-one/spatial-types/issues/26).
The package stores and edits spatial values. Geometric evaluation and
functional validation belong to explicit consumer operations through
`spatial-validator`.

The matrix describes the current representation contracts and their automated
evidence. It does not certify the validity of every representable value or
complete SQL/MM conformance.

Reviewed on **2026-11-05**, against runtime/test baseline
`255eaf06de0281a8c0f429ffd7a8d5d297fd7574` (`main`). This audit changes
documentation only; implementation status means representation support within
the ownership boundary below.

## Scope, sources and ownership

`SpatialTypeImplementationStatus::isFullyImplemented()` currently reports the
eleven types below. Each has immutable Geometry/Geography classes and mutable
classes with family metadata. Layouts are XY, XYZ, XYM and XYZM except
PolyhedralSurface, which supports XYZ and XYZM. Coordinate dimension here means
ordinate layout, not topological dimension.

| Reviewed type | ISO concept | Represented members or position |
| -------------------- | ------------- | ----------------------------------------------------------------------------------- |
| Point | 4.2.3 | One declared-layout position, including the adopted all-null EMPTY representation |
| LineString | 4.2.5 | Ordered defining points with linear interpretation |
| CircularString | 4.2.6 | Ordered circular-arc control points |
| CompoundCurve | 4.2.7 | Ordered line/circular curve components |
| Polygon | 4.2.10 | Exterior boundary first, followed by interior boundaries |
| Triangle | 4.2.11 | Distinct type identity using polygon boundary storage |
| PolyhedralSurface | 4.2.12 | Polygon patches in a layout containing Z |
| GeometryCollection | 4.2.14 | Heterogeneous and nested spatial values |
| MultiPoint | 4.2.15 | Point members |
| MultiLineString | 4.2.17 | LineString members |
| MultiPolygon | 4.2.19 | Polygon members |

Excluded (`false`): BrepSolid, Circle, Clothoid, CompoundSurface,
EllipticalCurve, GeodesicString, NurbsCurve, SpiralCurve, CurvePolygon, TIN,
MultiCurve and MultiSurface. Non-instantiable model types are not reviewed as
concrete types. The inventory comes from
`lib/Implementation/SpatialTypeImplementationStatus.php` and its tests, not
from the set of currently valid constructed values.

### Scope, sources and ownership: Primary ISO

- **Inspected evidence and limits:** Local **ISO/IEC CD 13249-3:201x(E)** PDF, Committee Draft dated 2009-01-16. Available clause evidence: 4.2.1.6, relevant type concepts in
4.2.3–19, 5.1.5–6, 7.2.1 Description 4–11, 8.5.1 Description 2–20, 9.1.1 Description 2–11, 9.2.1 Description 5, and 20.1/20.3. This is not a final published edition.

### Scope, sources and ownership: Supporting OGC

- **Inspected evidence and limits:** Supplied full transcription of **OGC 06-103r4, Simple Feature Access 1.2.1**, especially 6.1.5–7 and 6.1.12.1, inspected independently.
ISO remains primary under repository arbitration.

### Scope, sources and ownership: ISO 19107/19111

- **Inspected evidence and limits:** Full texts unavailable. This source limitation is accepted as non-blocking. No direct verification or complete conformance to these
sources is claimed.

### Scope, sources and ownership: ISO 19136 / SQL/MM completeness

- **Inspected evidence and limits:** Encoding/decoding and GML belong to other components; this package does not implement the complete SQL type/routine/schema surface
required by ISO clause 20.

### Scope, sources and ownership: Project decisions

- **Inspected evidence and limits:** #33 externalizes functional validation; #36 permits partial-null positions; #38 defines mutable/immutable representation; #57 defines the
public boundary; #77 preserves complete references in neutral immutable copies; #78 requires dimensional consistency in mutable composites; #79 defines incompatible-component
exceptions. The public API provides representation operations.

The [validation contract](validators.md) governs package responsibility.
Normative well-formedness requirements still exist, but automatic enforcement
of ring validity, coordinate completeness, family/reference compatibility,
continuity and topology belongs to explicit consumer validation. Mutable
component **coordinate-layout compatibility is structural** and enforced by
this package; immutable aggregates retain their documented permissive layout
contract. Storing an invalid representation is not certified as valid geometry
by this matrix.

## Current conformance matrix

Implementation and test paths are repository-relative. `Conformant` applies
only to the stated representation requirement. `Not applicable` identifies
functionality owned by other components. The classifications are `Conformant`,
`Non-conformant`, `Normative ambiguity`, `Intentional divergence` and
`Not applicable`. No unapproved difference is classified as an intentional
divergence. An adopted representation convention is identified separately from
a normative geometry requirement; permissive storage does not prove that
requirement has been enforced.

### Current conformance matrix: All eleven

- **Requirement:** Concrete identity, instantiability and declared coordinate layout

- **Normative / adopted source:** ISO 4.2.3–19; 4.2.1.6; adopted #38/#57

- **Implementation:** `lib/Implementation/SpatialTypeImplementationStatus.php` ; concrete `lib/Types/` classes and interfaces

- **Automated verification:** `tests/Unit/Implementation/SpatialTypeImplementationStatusTest.php` ;
`tests/Unit/Types/ConcreteTypeContractTest.php::testConcreteTypesExposeTheirPublicContract()` ; `tests/Unit/Types/SpatialVariantContractTest.php`

- **Status:** Conformant

- **Limit / notes:** The PHP hierarchy is not required to reproduce SQL inheritance or expose every SQL routine.

### Current conformance matrix: All eleven (2)

- **Requirement:** Preserve declared reference and ordinates during reference-only copy/edit

- **Normative / adopted source:** ISO 5.1.5 versus 5.1.6; adopted #38

- **Implementation:** `lib/Internal/Types/AbstractSpatialTypeImmutable.php` ; mutable context setters and aggregate overrides

- **Automated verification:** `tests/Unit/Types/SpatialWithSridTest.php` ; `tests/Unit/Types/MutablePointSequenceContextTest.php` ;
`tests/Unit/Types/MutablePolygonContextTest.php` ; `tests/Unit/Types/MutablePolyhedralSurfaceContextTest.php` ; `tests/Unit/Types/MutableMultiObjectContextTest.php` ;
`tests/Issue/ImmutablePointReferenceCopyTest.php` ; `tests/Issue/ImmutableCompositeReferenceCopyTest.php` ; `tests/Issue/ImmutableSurfaceReferenceCopyTest.php` ;
`tests/Issue/CustomImmutableCollectionReferenceCopyTest.php`

- **Status:** Conformant

- **Limit / notes:** Assignment is not coordinate transformation. Neutral `copy()` and unchanged components preserve each complete authority/identifier pair; only explicit
reference replacement propagates the requested reference.

### Current conformance matrix: Point

- **Requirement:** Store X/Y/Z/M and distinguish all-null EMPTY from partial positions

- **Normative / adopted source:** ISO 4.2.3; 4.2.1.6; adopted #36

- **Implementation:** `lib/Internal/Types/PointBehaviorTrait.php` ; `lib/Value/Coordinates.php`

- **Automated verification:** `tests/Unit/Types/EmptyPointTest.php` ; `tests/Issue/PartiallyNullXYPointTest.php` ; `tests/Issue/PartiallyNullXYZPointTest.php` ;
`tests/Issue/PartiallyNullXYMPointTest.php` ; `tests/Issue/PartiallyNullXYZMPointTest.php`

- **Status:** Conformant

- **Limit / notes:** Storage/EMPTY mapping only. Coordinate completeness and geographic numeric ranges are external validity concerns.

### Current conformance matrix: Point (2)

- **Requirement:** Exact representation equality without numeric storage-type bias

- **Normative / adopted source:** Adopted representation equality contract; explicitly not ISO spatial equality

- **Implementation:** `lib/Internal/Types/PointBehaviorTrait.php::equalsTo()`

- **Automated verification:** `tests/Issue/NumericPointEqualityTest.php` ; `tests/Issue/LargeNumericPointEqualityTest.php`

- **Status:** Conformant

- **Limit / notes:** All layouts/families/variants covered. Mixed comparison does not round integers to float; context and null distinctions remain.

### Current conformance matrix: LineString

- **Requirement:** Preserve ordered defining positions

- **Normative / adopted source:** ISO 4.2.5; adopted representation contract

- **Implementation:** `lib/Internal/Types/AbstractLineStringImmutable.php` ; `lib/Internal/Types/AbstractLineString.php`

- **Automated verification:** `tests/Unit/Types/MutableLineStringTest.php::testMembershipEditsPreserveOrderAndIdentity()` ;
`tests/Unit/Types/RepresentationWithoutValidationTest.php`

- **Status:** Conformant

- **Limit / notes:** Cardinality and geometric validity are explicit validation concerns.

### Current conformance matrix: CircularString

- **Requirement:** Preserve ordered arc control points and circular type

- **Normative / adopted source:** ISO 4.2.6; adopted #33/#38

- **Implementation:** `lib/Internal/Types/AbstractCircularStringImmutable.php` ; `lib/Internal/Types/AbstractCircularString.php`

- **Automated verification:** `tests/Unit/Types/CircularStringValidationTest.php::testMultipleArcs()` ;
`tests/Unit/Types/MutableCircularStringTest.php::testArcEditsPreserveIdentityAndSharedEndpoints()` ; `tests/Unit/Types/MutablePointSequenceContextTest.php`

- **Status:** Conformant

- **Limit / notes:** Storage and layout evidence; geometric arc validity is external.

### Current conformance matrix: CompoundCurve

- **Requirement:** Ordered line/circular components without linearization

- **Normative / adopted source:** ISO 4.2.7; adopted #33/#38

- **Implementation:** `lib/Internal/Types/AbstractCompoundCurveImmutable.php` ; `lib/Internal/Types/AbstractCompoundCurve.php`

- **Automated verification:** `tests/Unit/Types/CompoundCurveValidationTest.php::testLinearComponents()` and `testCircularComponents()` ;
`tests/Unit/Types/MutableCompoundCurveTest.php::testOrderedMembershipAndSharedEdits()` ; `tests/Issue/PartiallyNullCompoundCurveTest.php`

- **Status:** Conformant

- **Limit / notes:** Continuity and family/reference consistency are external. Mutable component layouts are checked, as mapped below.

### Current conformance matrix: Polygon

- **Requirement:** Exterior-first boundary sequence, then stored interiors

- **Normative / adopted source:** ISO 4.2.9–10; adopted #33/#38

- **Implementation:** `lib/Internal/Boundary/PolygonBoundary.php` ; `lib/Internal/Types/AbstractPolygonImmutable.php` ; `lib/Internal/Types/AbstractPolygon.php`

- **Automated verification:** `tests/Unit/Types/AggregateBoundaryAndValidationTest.php` ; `tests/Unit/Types/MutablePolygonTest.php::testOrderedEditingAndSharing()` ;
`tests/Unit/Types/MutablePolygonLayoutTest.php`

- **Status:** Conformant

- **Limit / notes:** Representation/order only. Ring/topology enforcement is not attributed to this package.

### Current conformance matrix: Triangle

- **Requirement:** Distinct Triangle identity, polygon boundary storage and retained ordinates

- **Normative / adopted source:** ISO 4.2.11; adopted #33

- **Implementation:** Concrete Triangle classes in `lib/Types/` ; polygon bases above

- **Automated verification:** `tests/Unit/Types/TriangleTest.php` ; `tests/Unit/Types/MutablePolygonTest.php::testEmptyAndInvalidTriangleStates()` ;
`tests/Unit/Types/RepresentationWithoutValidationTest.php::testXymTriangleStoresOpenBoundariesAndHoles()`

- **Status:** Conformant

- **Limit / notes:** Four-point/no-hole/non-collinearity validity is externally checked, not a constructor guarantee.

### Current conformance matrix: PolyhedralSurface

- **Requirement:** Ordered polygon patches, supported XYZ/XYZM layouts

- **Normative / adopted source:** ISO 4.2.12; 8.5.1 Description 17; adopted #33

- **Implementation:** `lib/Internal/Types/AbstractPolyhedralSurfaceImmutable.php` ; `lib/Internal/Types/AbstractPolyhedralSurface.php` ; concrete XYZ/XYZM classes

- **Automated verification:** `tests/Unit/Types/PolyhedralSurfaceTest.php` ; `tests/Unit/Types/MutablePolyhedralSurfaceTest.php::testOrderedPatchEditing()` and
`testXyzmLayout()` ; `tests/Unit/Types/RepresentationWithoutValidationTest.php` surface scenarios

- **Status:** Conformant

- **Limit / notes:** Connectivity, orientation and manifold/closure validity remain external. See source difference below.

### Current conformance matrix: GeometryCollection

- **Requirement:** Heterogeneous/nested storage; acyclic mutable sharing

- **Normative / adopted source:** ISO 4.2.14; 9.1.1; adopted #33/#38

- **Implementation:** `lib/Internal/Types/AbstractCollectionImmutable.php` ; `lib/Internal/Types/AbstractSpatialCollection.php` ;
`lib/Internal/Types/MutableComponentGuard.php`

- **Automated verification:** `tests/Unit/Types/RepresentationWithoutValidationTest.php::testMembershipDoesNotEnforceFamilyDimensionOrReference()` ;
`tests/Unit/Types/MutableSpatialCollectionCycleTest.php` ; `tests/Issue/AllEmptyGeometryCollectionTest.php`

- **Status:** Conformant

- **Limit / notes:** Family/reference compatibility and immutable component layouts are not automatically enforced. Mutable layouts are checked. Cycle rejection protects the
PHP ownership graph.

### Current conformance matrix: MultiPoint

- **Requirement:** Preserve Point members, repeated positions and member order

- **Normative / adopted source:** ISO 4.2.15; adopted representation contract

- **Implementation:** `lib/Internal/Types/AbstractMultiPointImmutable.php` ; `lib/Internal/Types/AbstractMultiPoint.php`

- **Automated verification:** `tests/Issue/EmptyMultiPointMembersTest.php` ; `tests/Issue/AllEmptyMultiPointTest.php`

- **Status:** Conformant

- **Limit / notes:** Duplicate and EMPTY members remain stored; membership does not certify geometric validity.

### Current conformance matrix: MultiLineString

- **Requirement:** Preserve LineString members, order and EMPTY members

- **Normative / adopted source:** ISO 4.2.17; adopted member-preservation contract

- **Implementation:** `lib/Internal/Types/AbstractMultiLineStringImmutable.php` ; `lib/Internal/Types/AbstractMultiLineString.php`

- **Automated verification:** `tests/Issue/EmptyMultiLineStringDimension2Test.php` ; `tests/Issue/EmptyMultiLineStringDimension3zTest.php` ;
`tests/Issue/EmptyMultiLineStringDimension3mTest.php` ; `tests/Issue/EmptyMultiLineStringDimension4zmTest.php` ; `tests/Issue/AllEmptyMultiLineStringTest.php`

- **Status:** Conformant

- **Limit / notes:** Member well-formedness enforcement is external.

### Current conformance matrix: MultiPolygon

- **Requirement:** Preserve Polygon members and EMPTY member positions

- **Normative / adopted source:** ISO 4.2.19; adopted member-preservation contract

- **Implementation:** `lib/Internal/Types/AbstractMultiPolygonImmutable.php` ; `lib/Internal/Types/AbstractMultiPolygon.php`

- **Automated verification:** `tests/Issue/EmptyMultiPolygonDimension2Test.php` ; `tests/Issue/EmptyMultiPolygonDimension3zTest.php` ;
`tests/Issue/EmptyMultiPolygonDimension3mTest.php` ; `tests/Issue/EmptyMultiPolygonDimension4zmTest.php` ; `tests/Issue/AllEmptyMultiPolygonTest.php`

- **Status:** Conformant

- **Limit / notes:** Disjoint interiors and boundary topology are external validity concerns.

### Current conformance matrix: All mutable composites

- **Requirement:** Reject component and descendant layouts differing from the declared XY/XYZ/XYM/XYZM layout, including EMPTY members

- **Normative / adopted source:** ISO 4.2.1 and 4.2.1.6; adopted structural contract #78

- **Implementation:** `lib/Internal/Types/MutableComponentGuard.php` ; point-sequence, compound-curve, polygon, surface and collection bases

- **Automated verification:** `tests/Issue/MutableDimensionConstructionTest.php` ; `tests/Issue/MutableDimensionAggregateConstructionTest.php` ; mutable dimension mutation
suites listed below

- **Status:** Conformant

- **Limit / notes:** All twelve mismatching point-layout pairs are rejected. XYZ and XYM remain distinct. No reprojection, truncation or conversion of supplied objects occurs.

### Current conformance matrix: All composites

- **Requirement:** Required member kinds and mutable/immutable ownership; incompatible spatial input raises an exception implementing `SpatialTypeExceptionInterface`

- **Normative / adopted source:** ISO type concepts 4.2.5–19; adopted ownership/exception contracts #38/#79

- **Implementation:** `lib/Internal/Types/ImmutableComponentGuard.php` ; `lib/Internal/Types/MutableComponentGuard.php` ; aggregate membership methods

- **Automated verification:** `tests/Issue/Issue79Test.php` ; `tests/Unit/Types/MutableMultiObjectFailureTest.php` ;
`tests/Unit/Types/MutablePolyhedralSurfaceOwnershipTest.php`

- **Status:** Conformant

- **Limit / notes:** Member typing and ownership are technical PHP contracts. Non-spatial single-member input retains PHP `TypeError` ; dimensional mismatch uses
`InvalidDimensionException` .

### Current conformance matrix: Collections and composite storage

- **Requirement:** Preserve zero-membership versus stored EMPTY members, nested arrays, order and repeated members during replacement

- **Normative / adopted source:** ISO 9.1.1 Description 6–7; adopted member-preservation contract

- **Implementation:** `lib/Internal/Types/AbstractCollectionImmutable.php` ; immutable aggregate replacements; `lib/Internal/Types/AbstractMutableCollection.php`

- **Automated verification:** `tests/Issue/AllEmptyGeometryCollectionTest.php` ; `tests/Issue/AllEmptyMultiPointTest.php` ; `tests/Issue/AllEmptyMultiLineStringTest.php` ;
`tests/Issue/AllEmptyMultiPolygonTest.php` ; `tests/Issue/ImmutableCollectionEmptyReplacementTest.php` ; `tests/Issue/MutableCollectionEmptyTransitionTest.php`

- **Status:** Conformant

- **Limit / notes:** These tests establish stored membership and replacement behavior, not a geometric emptiness predicate. A partial-null point remains a stored partial
position.

### Current conformance matrix: All eleven (3)

- **Requirement:** Automatic geometric validity, serialization, transformations and complete SQL routine surface

- **Normative / adopted source:** Relevant type definitions; ISO 5.1.6, serialization clauses and 20

- **Implementation:** Explicit consumer validation / other components

- **Automated verification:** Representation-without-validation tests demonstrate the boundary, not validity

- **Status:** Not applicable

- **Limit / notes:** See the ownership table below. Supporting ISO source access remains limited.

## Validity requirements assigned to explicit validation

These are normative properties of well-formed geometries. Under #33 their
automatic enforcement is **Not applicable** to `spatial-types`; they are not
silently declared satisfied by permissive constructors.

### Validity requirements assigned to explicit validation: Point and all containing structures

- **Requirements considered:** Coordinate completeness, numeric geographic ranges and family/reference consistency

- **Source / package evidence:** ISO 4.2.3 and type rules; `tests/Unit/Types/RepresentationWithoutValidationTest.php` ; partial-null tests

### Validity requirements assigned to explicit validation: LineString

- **Requirements considered:** Non-EMPTY well-formed cardinality and reference consistency

- **Source / package evidence:** ISO 7.2.1 Description 4–5; `tests/Unit/Types/MutableLineStringTest.php::testEmptyAndIncompletePathsRemainEditable()`

### Validity requirements assigned to explicit validation: CircularString

- **Requirements considered:** Valid arc cardinality, control points and geometric arc structure

- **Source / package evidence:** ISO 4.2.6; `tests/Unit/Types/RepresentationWithoutValidationTest.php::testCircularStringStoresIncompleteArcsAndEmptyMembers()`

### Validity requirements assigned to explicit validation: CompoundCurve

- **Requirements considered:** Endpoint continuity and family/reference consistency

- **Source / package evidence:** ISO 4.2.7; `tests/Unit/Types/RepresentationWithoutValidationTest.php::testCompoundCurveStoresDisconnectedAndEmptyComponents()`

### Validity requirements assigned to explicit validation: Polygon

- **Requirements considered:** Ring closure/simplicity, planarity, hole topology and connected interior

- **Source / package evidence:** ISO 4.2.9–10; polygon representation tests in the current matrix

### Validity requirements assigned to explicit validation: Triangle

- **Requirements considered:** Four exterior points, no interior boundaries, valid non-degenerate surface

- **Source / package evidence:** ISO 4.2.11; Triangle representation-without-validation scenario in the matrix

### Validity requirements assigned to explicit validation: PolyhedralSurface

- **Requirements considered:** Connected patches, orientation, manifold/closed-surface conditions and valid patches

- **Source / package evidence:** ISO 8.5.1 Description 2–20; surface representation-without-validation scenarios

### Validity requirements assigned to explicit validation: GeometryCollection, MultiPoint, MultiLineString, MultiPolygon

- **Requirements considered:** Family/reference consistency, immutable member layout compatibility and member well-formedness; relevant inter-member topology

- **Source / package evidence:** ISO 4.2.14–19; 9.1.1 Description 10–11; heterogeneous/EMPTY storage tests

## Structural mutation evidence

Every path below is an existing executable regression suite. Construction,
matching tuples, EMPTY components and custom descendants are covered by
`tests/Issue/MutableDimensionConstructionTest.php` and
`tests/Issue/MutableDimensionAggregateConstructionTest.php`.

### Structural mutation evidence: LineString

- **Construction/edit evidence:** `tests/Issue/MutableLineStringDimensionMutationTest.php`

- **Verified rejection boundary:** Append, insertion and point replacement

### Structural mutation evidence: CircularString

- **Construction/edit evidence:** `tests/Issue/MutableCircularStringDimensionMutationTest.php` ; `tests/Issue/MutableArcDimensionMutationTest.php`

- **Verified rejection boundary:** Point edits, origin replacement, arc append/replacement; both arc arguments checked before writing either

### Structural mutation evidence: CompoundCurve

- **Construction/edit evidence:** `tests/Issue/MutableCompoundCurveDimensionMutationTest.php`

- **Verified rejection boundary:** Individual and complete curve-sequence replacement

### Structural mutation evidence: Polygon / Triangle

- **Construction/edit evidence:** `tests/Issue/MutablePolygonDimensionMutationTest.php` ; `tests/Issue/MutableTriangleDimensionMutationTest.php`

- **Verified rejection boundary:** Ring insertion, addition and replacement

### Structural mutation evidence: PolyhedralSurface

- **Construction/edit evidence:** `tests/Issue/MutablePolyhedralSurfaceDimensionMutationTest.php`

- **Verified rejection boundary:** Patches and delegated ring/point replacement

### Structural mutation evidence: MultiPoint

- **Construction/edit evidence:** `tests/Issue/MutableMultiPointDimensionMutationTest.php`

- **Verified rejection boundary:** Individual and complete member replacement

### Structural mutation evidence: MultiLineString

- **Construction/edit evidence:** `tests/Issue/MutableMultiLineStringDimensionMutationTest.php`

- **Verified rejection boundary:** Individual and complete member replacement

### Structural mutation evidence: MultiPolygon

- **Construction/edit evidence:** `tests/Issue/MutableMultiPolygonDimensionMutationTest.php`

- **Verified rejection boundary:** Individual and complete member replacement

### Structural mutation evidence: GeometryCollection (`SpatialCollection`)

- **Construction/edit evidence:** `tests/Issue/MutableSpatialCollectionDimensionMutationTest.php` ; `tests/Unit/Types/MutableSpatialCollectionCycleTest.php`

- **Verified rejection boundary:** Individual/complete replacement and containment cycles

The rejection scenarios verify retained membership and subsequent reference
propagation: rejected components must not become owned by the receiver.
The four-layout construction suite also verifies matching object identity,
tuple hydration, ordinate preservation and declared family/reference metadata.

## Supporting-source difference

ISO/IEC CD 13249-3:201x(E), 8.5.1 Description 6, states the closed,
sphere-topology condition for PolyhedralSurface without the condition used in
OGC 06-103r4, 6.1.12.1. OGC applies that conclusion when every common boundary
LineString bounds exactly two patches. The ISO text also separately discusses
closedness in Description 7. These statements are not silently treated as
identical.

This difference concerns geometric surface validity. Its automatic enforcement
is **Not applicable** to this package under the adopted ownership boundary;
open/disconnected patches remain representable. This audit chooses no new
closure rule and makes no assertion about the availability or conformance of
an external validator for that case. A future change to that validation rule
requires its own normative decision in the component responsible for it.

## Representation equality

`PointInterface::equalsTo()` compares point representations. Numerically equal
integer and floating-point ordinates compare equal without rounding distinct
integers to floating-point values. Null remains distinct from zero. SRID,
family, declared coordinate layout and the existing concrete-class compatibility
rule remain significant. This operation does not implement ISO spatial
`ST_Equals`. See [numeric point equality](numeric-point-equality.md).

## Evidence limits

The matrix maps representation contracts to existing implementation and tests.
A passing test suite is evidence for those contracts, not a general normative
certification. Direct verification of ISO 19107 and ISO 19111 remains unavailable;
that accepted limitation does not imply conformance to uninspected requirements.

Release readiness, independent review and integration are assessed separately
from this document's representation-level conclusions.

## Findings and completion boundary

No unresolved blocking implementation non-conformance or missing automated
coverage was identified for the representation requirements mapped above.
This conclusion does not classify external validity rules as satisfied.

### Findings and completion boundary: Direct ISO 19107/19111 texts unavailable

- **Classification:** Not applicable to the direct-source claims made here; evidence limitation

- **1.0.0 disposition:** Non-blocking, explicitly accepted by the Product Owner. No claim of full verification of these standards.

### Findings and completion boundary: PolyhedralSurface closedness wording differs between inspected ISO and OGC clauses

- **Classification:** Not applicable to automatic validation in this package

- **1.0.0 disposition:** Non-blocking for representation; the source difference remains explicit above without adopting a validity interpretation.

### Findings and completion boundary: Geometric completeness, closure, simplicity, ring validity, continuity and topology

- **Classification:** Not applicable to automatic enforcement by `spatial-types`

- **1.0.0 disposition:** Non-blocking within the adopted boundary; acceptance by a constructor is not evidence of geometric validity.

### Findings and completion boundary: Serialization, coordinate transformation, GML and complete SQL/MM schemas/routines

- **Classification:** Not applicable

- **1.0.0 disposition:** Non-blocking for this representation audit; owned by other components or outside the supported PHP API.

Implementation changes discovered by this audit must be tracked separately,
with the affected type, source, observed/expected behavior and release impact;
this documentation PR introduces none. A newly discovered in-scope failure or
missing normative coverage would reopen the affected conclusion and prevent
final acceptance until resolved.

The matrix is input to the subsequent public-contract stabilization review.
It does not itself freeze APIs, authorize a release, certify full SQL/MM
conformance or mark Story #26 Done. Independent review must cover the final
audit revision; merge and final Definition of Done verification remain
separate steps.
