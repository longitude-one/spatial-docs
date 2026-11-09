---
title: Geometry and Geography
description: Understand spatial models in Spatial Types through planar and geodesic interpretations of the Ushuaia–Bordeaux journey.
---

Spatial Types represents spatial objects in two families, `Geometry` and `Geography`, identified by
`LongitudeOne\Core\Enum\SpatialModelEnum`. The family expresses how coordinates are intended to be interpreted;
the coordinate reference system (CRS) gives them a reference and units. A separate calculation engine supplies operations such as distance.

## Ushuaia to Bordeaux: two ways to measure

Imagine measuring the direct distance between Ushuaia and Bordeaux, rather than following a road or railway.

- **On a projected plane:** transform the city positions into equirectangular coordinates (EPSG:4087), then measure the straight segment
  with the Euclidean formula: `sqrt((x2 - x1)² + (y2 - y1)²)`. The coordinates and result are in metres.
- **On an Earth model:** use geographic positions referenced to WGS 84 (EPSG:4326), then solve the inverse geodesic problem on the
  WGS 84 ellipsoid. The input angles are in degrees; the computed surface distance can be returned in metres.

![Ushuaia–Bordeaux: 13 370.269 km on the EPSG:4087 plane and 12 750.997 km along the WGS 84 ellipsoid, shown at a shared reference scale.](../../assets/images/spatial-types/models-ushuaia-bordeaux.svg)

The right panel shows the visible hemisphere centred on the Atlantic at 35° W, 0°, including both the northern and southern hemispheres.
Ushuaia is near 55° S; Bordeaux is near 45° N. Positions and the surface geodesic are projected from their actual coordinates,
without exaggerating curvature. The left panel covers the same longitude and latitude extent in EPSG:4087.
The orange dashed curve is the **same geodesic** transformed into the plane; the blue segment is the direct Euclidean connection.
They are different paths.

### Coordinates and distances

The same illustrative positions near the city centres give these coordinates:

| City | WGS 84 longitude, latitude (degrees) | EPSG:4087 easting, northing (metres) |
| ---- | ----------------------------------- | ---------------------------------- |
| Ushuaia | −68.3030, −54.8019 | −7 603 455.18, −6 075 177.48 |
| Bordeaux | −0.5792, 44.8378 | −64 476.25, 4 966 919.06 |

The Euclidean distance in EPSG:4087 is approximately **13 370.269 km**; the WGS 84 ellipsoidal geodesic distance is approximately **12 750.997 km**.
The planar result is about **619 km longer**, or **4.86%**, for these positions. This difference reflects the projection and chosen paths.
“Equidistant” does not mean that the projection preserves distances between every pair of points.

### Reading the scales

The plane uses one uniform scale for X and Y: **28 SVG drawing units per 1 000 km** in projected coordinates.
The globe uses the same reference scale for its Earth-centred coordinates, with the WGS 84 equatorial radius represented by approximately 178.6 drawing units.
Its orthographic view preserves local scale at the centre and foreshortens surface distances towards the rim.
Consequently, the globe appears smaller than the rectangular map of the same hemisphere.

Do not measure the visible globe curve with a ruler to infer its surface length.
The two bars below the distance labels show the **computed distances at the same uniform scale** and can be compared directly.
Their scale changes proportionally when the SVG is resized; the graticules remain at the stated angular intervals.

### Calculation basis

These values were computed externally, not by Spatial Types. The EPSG:4087 conversion uses the ellipsoidal
[Equidistant Cylindrical method, EPSG:1028](https://proj.org/en/stable/operations/projections/eqc.html#ellipsoidal-formulas),
with its standard parallel and origin at 0°: `X = a × longitude_in_radians` and `Y = M(latitude)`,
where `a = 6 378 137 m` and `M` is the signed WGS 84 meridional arc from the equator.

Meridional arcs and the inverse geodesic calculation use `Geod(ellps='WGS84')` from pyproj 3.6.1 / PROJ 9.3.0;
the projected coordinates above were calculated from the stated formulas, rather than that version's spherical `eqc` implementation.
The planar distance uses the unrounded projected coordinates. Displayed decimals are rounding, not a claim of survey accuracy.
This example uses the ellipsoidal EPSG:4087 definition, rather than a spherical approximation with `Y = a × latitude_in_radians`.

| Aspect in this example | Geometry | Geography |
| ---------------------- | -------- | --------- |
| Reference space | Projected plane | Earth ellipsoid |
| Coordinates | Easting and northing, in metres | Longitude and latitude, in degrees |
| Example CRS | WGS 84 / World Equidistant Cylindrical, EPSG:4087 | WGS 84, EPSG:4326 |
| Chosen distance operation | Euclidean distance | Ellipsoidal geodesic distance |
| Path being measured | Straight segment in the plane | Shortest surface path between these cities |

These columns describe the example, rather than universal restrictions on the two families.
`Geometry` is not intrinsically restricted to projected coordinates: it can also carry geographic coordinate values.
Applying the Euclidean formula directly to longitude and latitude produces a value in angular coordinate units, not a reliable distance in metres.
Likewise, the `Geography` label alone does not select an ellipsoid or guarantee a particular distance algorithm.

## Terms that describe different things

| Term | Meaning |
| ---- | ------- |
| Cartesian | Coordinates along perpendicular axes; Euclidean operations use this space. |
| Geographic | Coordinates locating a position through longitude and latitude, optionally with height. |
| Geodesic | A path locally minimizing distance on a surface; here, the shortest ellipsoidal path between the cities. |
| Geocentric | A three-dimensional coordinate system whose origin is at the Earth's centre. |

**Geodesic**, rather than **geocentric**, describes the surface-distance calculation in this example.
A geocentric straight chord through the Earth would measure a different path.

## What the family means in Spatial Types

Keep the API names `Geometry` and `Geography` when selecting a spatial model:

```php
use LongitudeOne\Core\Enum\SpatialModelEnum;

$planarModel = SpatialModelEnum::GEOMETRY;
$geographicModel = SpatialModelEnum::GEOGRAPHY;
```

The family and spatial reference are separate information. Neither an SRID nor a family label transforms coordinate values.
In particular, assigning EPSG:4087 to longitude and latitude does not convert them into projected metres.
See [Spatial reference systems](./spatial-reference-systems.md) before changing a reference.

Spatial Types provides representations of spatial objects; it does **not** provide the distance calculations illustrated above.
Use an appropriate external spatial engine, with an explicitly chosen CRS, transformation and operation.
For the concrete classes and coordinate layouts in this major version, see [Instantiable spatial types](./instantiable-spatial-types.md).
The library uses `X, Y` for longitude, latitude in its geographic family; do not infer this tuple order from a CRS authority's axis order.

## Further reading

These are informative explanations, not a claim of complete ISO 19107 or ISO 19111 conformance:

- [PROJ: geodesic calculations](https://proj.org/en/stable/geodesic.html) explains distances on an ellipsoid and the inverse geodesic problem.
- [PROJ: Equidistant Cylindrical](https://proj.org/en/stable/operations/projections/eqc.html) explains the projection,
  its distortion and the distinction between ellipsoidal and spherical formulas.
- [PROJ: geodetic to Cartesian conversion](https://proj.org/en/stable/operations/conversions/cart.html)
  distinguishes longitude and latitude from Earth-centred Cartesian coordinates.
