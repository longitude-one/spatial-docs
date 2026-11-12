# Catalogue des règles de validation spatiale

Référence de conception de l’[Epic #7](https://github.com/longitude-one/spatial-validator/issues/7),
de la [story #8](https://github.com/longitude-one/spatial-validator/issues/8) et de la
[story #12](https://github.com/longitude-one/spatial-validator/issues/12).
Révision du 22 octobre 2026. [English version](catalogue-validation.en.md).

Ce catalogue distingue l’infrastructure livrée, les règles cibles approuvées et les décisions restantes.
La présence d’une règle ci-dessous ne signifie pas que son algorithme est implémenté.

## 1. API et couverture livrées

Namespace public : `LongitudeOne\SpatialValidator\Validator\Constraints`.
`Spatial` étend Constraint de Symfony ; `SpatialValidator` étend ConstraintValidator.
Utilisation : `$validator->validate($geometry, new Spatial())` via ValidatorInterface de Symfony.
Groupes et payload standards sont disponibles, sans service isValid ni contrat commun supplémentaire.

`SpatialValidator` sélectionne la contrainte spécialisée par un `match` sur la valeur déclarée de GeometryTypeEnum.
La délégation conserve racine, chemin de propriété et groupe actif. Chaque cas possède sa paire
contrainte/validateur :

| Types disposant d’un dispatch dédié |
| --- |
| BRepSolid, Circle, CircularString, Clothoid, CompoundCurve, CompoundSurface, Curve, CurvePolygon |
| EllipticalCurve, GeodesicString, Geometry, GeometryCollection, LineString |
| MultiCurve, MultiLineString, MultiPoint, MultiPolygon, MultiSurface, NURBSCurve |
| Point, Polygon, PolyhedralSurface, Solid, SpiralCurve, Surface, TIN, Triangle |

Ces 27 routes incluent des types abstraits ou futurs : le dispatch ne garantit pas une classe concrète dans le
modèle.
GeometryCollection exige CollectionInterface ; Triangle exige TriangleInterface.
Les validateurs spécialisés exigent l’interface disponible et le cas exact de l’enum.
Sans interface dédiée, ils exigent SpatialInterface et le cas exact de l’enum.

### L-INPUT-01 — Contrat actuel des entrées et des échecs

La révision approuvée par Alexandre le 22 octobre remplace l’exemption de chaîne vide de #10 pour l’API active.

- **Mauvaise contrainte** — UnexpectedTypeException de Symfony, avant l’examen de la valeur

- **Valeur PHP null avec la bonne contrainte** — Aucune violation ; composer avec NotNull pour imposer une valeur

- **Toute chaîne, y compris '' et WKT, ou autre valeur incompatible** — UnexpectedValueException de Symfony en appel
  direct ; violation de type via le service Validator

- **Objet spatial admissible, même EMPTY** — Règles de coordonnées Point ou warning spécialisé de non-implémentation

- **Type inconnu du dispatch** — InvalidArgumentException PHP : `Unsupported spatial type: <type>`

À l’exception de Point et LineString, les validateurs spécialisés émettent actuellement
`<Type> validation is not implemented yet.`
avec le payload par défaut `['severity' => 'warning']` sur sa contrainte.
Spatial a un payload null par défaut et ne produit aucun warning global.
Son payload personnalisé n’est pas recopié sur les contraintes enfants.
Symfony conserve les warnings dans sa liste de violations ; le consommateur interprète ces métadonnées.
Le cas défensif par défaut est inaccessible pour un objet conforme avec l’enum fermé actuel.

**Point implémente les contrôles de coordonnées V02, V03 et V16.**
`PointValidator` compose `CoordinateLayout`, `FiniteCoordinates` et `GeographyBounds` ;
ces contraintes ont un payload null par défaut et conservent les groupes et le payload personnalisés de Point.
Le [référentiel des validateurs](../validators.md) fournit les liens vers chaque contrainte et son validateur.
Un warning signifie qu’un contrôle n’a pas été réalisé, sans prouver validité ni invalidité.
Aucune conformité générale SQL/MM ni validation géodétique n’est annoncée.
Voir le [README](../../README.md) et les [conventions d’entrée Symfony][symfony-input].

### Variantes concrètes du modèle

| Types du modèle | Variantes Geometry / Geography |
| --- | --- |
| Point, LineString, CircularString, CompoundCurve, Polygon, Triangle | XY, XYZ, XYM, XYZM |
| MultiPoint, MultiLineString, MultiPolygon, GeometryCollection | XY, XYZ, XYM, XYZM |
| PolyhedralSurface | XYZ, XYZM uniquement |

La classe de collection Geography utilise le même dispatch de type géométrique.
Les autres routes de l’enum ne garantissent pas l’existence de classes concrètes correspondantes.
XYZ et XYM restent distincts malgré leurs trois ordinates.

## 2. Sources et autorité

Les références de règles conservent les résultats du catalogue du 21 octobre.
Cette révision les condense et intègre les décisions d’API approuvées, sans nouvelle interprétation normative.

- **ISO-CD** — ISO/IEC CD 13249-3:201x(E), 2009-01-16, Committee Draft non final

  **Clauses pertinentes:** Base 4.2.1–4.2.19, 5.1.7–5.1.10 ; courbes 7.1–7.4 ; surfaces 8.3–8.5 ; collections 9 ;
  contrôles 16.1

- **OGC** — OGC 06-103r4, SFA 1.2.1, Corrigendum

  **Clauses pertinentes:** 6.1.2–6.1.3, 6.1.6–6.1.7, 6.1.11–6.1.14

- **GML** — OGC 07-036, GML 3.2.1, 2007-08-27

  **Clauses pertinentes:** 10.5.8, anneaux linéaires

- **ISO 19107 / 19111 / 19136** — Références normatives de la clause 2 d’ISO-CD

  **Clauses pertinentes:** Éditions et clauses sources à consulter avant toute nouvelle conclusion dépendante

ISO-CD a été consulté dans le PDF privé du skill ; ses extraits ne sont pas redistribués.
Les documents [OGC SFA][ogc-sfa] et [GML][ogc-gml] sont publics.
Comportements des bases, code historique et garanties des constructeurs ne sont pas des preuves normatives.
Les choix LongitudeOne sont identifiés ci-dessous ; une interprétation non résolue relève d’Alexandre.

## 3. Règles cibles et scénarios de référence

Validité, simplicité, fermeture et restrictions applicatives sont distinctes.
Une courbe valide n’est pas nécessairement simple ou fermée.
La fermeture topologique d’un ensemble n’implique ni fermeture d’une courbe ni solide.
Point implémente V02, V03 et V16. LineString livre V04/B01 et le contrôle explicite S01 pour Geometry.
Ring livre F01 en composant les règles de ligne, cardinalité, fermeture et simplicité.
Les autres règles géométriques suivantes attendent leur implémentation
spécialisée ; `Components` valide désormais récursivement les composants (C01–C04).

### Règles communes et Point

- **V01** — Un objet réellement EMPTY peut être valide ; ISO-CD 5.1.10(2a). Vérifier cohérence et composants
  autorisés, pas seulement un résumé EMPTY.

  **Scénarios de référence:** Ligne sans point : EMPTY ; un seul point : invalide ; Point EMPTY dans LineString :
  invalide.

- **V02** — LongitudeOne : rejeter INF, -INF et NAN dans toute ordinate présente, M compris ; ne pas les confondre
  avec null.

  **Scénarios de référence:** X infini, Z NaN ou M infini : violation.

- **V03** — Représentation LongitudeOne du Point ; ISO-CD 4.2.3 définit la position. Toutes les ordinates de la
  variante null : EMPTY ; aucune null : non vide ; mélange : invalide.

  **Scénarios de référence:** XY (null,null) : EMPTY ; XYZ/XYM (1,2,null) : invalide ; zéro est une coordonnée.

- **V16** — Bornes Geography LongitudeOne en degrés inclusives : longitude X [-180,+180], latitude Y [-90,+90].

  **Scénarios de référence:** Bornes admises ; dépassement rejeté ; Geometry X=700000 ne viole pas V16.

V03 examine X/Y, X/Y/Z, X/Y/M ou X/Y/Z/M selon la variante déclarée.
Le contrat de représentation approuvé L-POINT-01 est ainsi conservé.
Un axe absent de cette variante n’est pas une ordinate obligatoire manquante.
Les objets implémentant une interface doivent être contrôlés indépendamment des garanties des constructeurs du
modèle.

### Courbes et anneaux linéaires

**Livré dans #15 :** LineString compose la validité Point via Components, la cardinalité minimale,
l’interdiction des Points EMPTY et les doublons consécutifs. Une liste vide est EMPTY ; deux Points EMPTY sont
invalides. La validité n’impose ni simplicité ni fermeture. `SimpleLineString` est explicite : XY sans Z, XYZ
avec Z, M ignoré selon Q01. La simplicité Geography non EMPTY reste indisponible et produit un warning (Q03).
Les signes exacts des prédicats binaires évitent un epsilon de déterminant ; l’égalité conserve Q02.
Une copie de contrainte porte le warning, sans modifier l’instance originale ni son payload personnalisé.
Le [référentiel des lignes](../validators.md#line-rules) précise chemins, codes et limites.

- **V04** — LineString : aucun point ou au moins deux points valides non EMPTY ; ISO-CD 7.2.1 Description 3–5, 10–11
  ; 7.2.3 → 16.1.7 → 16.1.6.

  **Scénarios de référence:** Zéro : EMPTY ; un : invalide ; deux points distincts satisfont la cardinalité, pas
  toutes les règles.

- **V05** — CircularString : nombre impair >=3 sauf EMPTY ; trois points pour le premier arc, deux par arc suivant.
  ISO-CD 4.2.6, 7.3.1 Description 6–11.

  **Scénarios de référence:** 3/5 points admissibles ; 2/4 invalides ; trois points colinéaires peuvent donner un
  segment dégénéré.

**Livré dans #17 :** CircularString compose Components, CircularPointCount et CircularArcPoints ;
EMPTY est valide, la cardinalité non vide est impaire et >=3, et l’intermédiaire diffère des extrémités selon
Q02 (XYZ si Z existe, M ignoré). Cercles complets et dégénérescences collinéaires en segment sont admis.
SimpleCircularString vérifie explicitement les arcs réels/segments, croisements, tangences et recouvrements ;
la validité ordinaire n’exige ni simplicité ni fermeture. La topologie Geography non vide reste indisponible.
Les extrémités répétées hors fermeture globale, dont deux cercles tangents en huit, ne sont pas simples.
**Limite approuvée #17 :** le cercle complet XYZ isolé A,B,A est simple, mais son plan est indéterminé ;
ses interactions avec d’autres arcs produisent des warnings explicites, sans choix arbitraire du plan XY.
Le [référentiel circulaire](../validators.md#circular-curve-rules) précise diagnostics, payload et couverture.

- **V06** — CompoundCurve : composants LineString/CircularString bien formés, raccordés par leurs extrémités
  successives ; ISO-CD 7.4.1 Description 3–10.

  **Scénarios de référence:** A→B puis B→C raccordés ; B≠C échoue ; composant Polygon rejeté.

- **S01** — Simplicité des courbes dans l’espace retenu ; ISO-CD 4.2.4, 5.1.8–5.1.9 ; OGC 6.1.6–6.1.7.

  **Scénarios de référence:** Croisement/recouvrement : non simple ; un croisement XY à altitudes distinctes peut
  être simple en XYZ.

**Livré dans #16 :** `Ring` compose le minimum de quatre positions, `FirstPointEqualsLastPoint` et
`SimpleLineString`, qui réutilise la validité LineString/Point/composants. Ring rejette EMPTY sans modifier
la validité d’une LineString EMPTY. Geometry utilise XYZ si Z existe, sinon XY, en ignorant M ; la fermeture
conserve Q02 et la simplicité évalue les coordonnées exactes, sans exempter un croisement proche de la fermeture.
Fermeture et simplicité Geography restent indisponibles et produisent des warnings distincts ; les règles
structurelles et Point restent appliquées. Les contraintes de warning sont copiées, sans modifier les instances
partagées ni les payloads explicites. CircularString n’est pas soumis à cette contrainte de frontière linéaire.
L’intégration Polygon reste dans ses stories spécialisées.
Le [référentiel des anneaux](../validators.md#linear-ring-rules) précise chemins, codes et limites de l’API.

- **F01** — Un anneau est simple et fermé ; EMPTY n’est ni fermé ni un anneau. ISO-CD 4.2.4–4.2.5, 7.1.6–7.1.9.
  Anneau linéaire : >=4 positions, fermeture répétée comprise ; GML 10.5.8.

  **Scénarios de référence:** A,B,C,A non colinéaires : anneau ; boucle croisée : pas un anneau ; M seul ne change
  pas la fermeture.

- **B01** — Doublons consécutifs d’une ligne : ISO-CD 7.2.3 → 16.1.7, appelant aussi 16.1.6. ID conservé, bien que
  ce soit une condition de méthode SQL/MM, pas seulement métier.

  **Scénarios de référence:** A,A,B échoue ; A,B,A avec A≠B passe ce contrôle ; M seul ne distingue pas les
  positions.

Le point intermédiaire d’un arc CircularString diffère de ses deux extrémités.
Le cercle complet (1,0),(-1,0),(1,0) est admissible ; ne pas exiger trois points distincts.
Les cordes ne prouvent pas la simplicité des arcs. Le minimum de quatre positions ne concerne que les anneaux
linéaires.
Ne pas substituer ST_Equals à un symbole d’égalité SQL sans vérifier la sémantique de la procédure concernée.

### Polygon, Triangle et agrégats

- **V07** — Extérieur et trous du Polygon sont des anneaux linéaires ; ISO-CD 8.3.1 Description 2–4.

  **Scénarios de référence:** Extérieur ouvert ou trou auto-croisé rejeté ; Polygon non vide exige un extérieur.

- **V08** — Planéité et non-dégénérescence de Polygon/Triangle et des faces ; ISO-CD 4.2.9–4.2.10, OGC 6.1.11.1.

  **Scénarios de référence:** Carré incliné/vertical plan ; sommet ou trou hors plan, extérieur colinéaire rejetés.

- **V09** — Relations entre anneaux : pas de croisement, coupure, pointe ni perforation ; intérieur connexe. ISO-CD
  4.2.9, OGC 6.1.11.1.

  **Scénarios de référence:** Trous extérieurs/croisés/recouvrants/imbriqués rejetés ; tangence isolée possible si
  intérieur connexe ; segment partagé rejeté.

- **V15** — OGC 6.1.11.1 : trous opposés à l’extérieur vus du même côté du plan ; LongitudeOne signale le même sens
  par warning.

  **Scénarios de référence:** Inverser tous les anneaux conserve l’orientation relative ; pas de réorientation ni de
  sens horaire absolu imposé.

- **V10** — Triangle : quatre positions, trois sommets distincts non colinéaires, sans trous. ISO-CD 8.4.1
  Description 2–4 ; OGC 6.1.11.1.

  **Scénarios de référence:** A,B,C,A non colinéaires admissibles ; sommets colinéaires, quatrième sommet distinct
  ou trou rejetés.

- **S02** — MultiPoint simple si aucune paire de points égaux ; ISO-CD 4.2.15.

  **Scénarios de référence:** Position répétée : non simple, pas automatiquement invalide ; EMPTY : simple.

- **S03** — MultiLineString simple si membres simples, intersections limitées à leurs frontières respectives ;
  ISO-CD 4.2.16–4.2.17.

  **Scénarios de référence:** Extrémités partagées de lignes ouvertes possibles ; extrémité intérieure à l’autre
  ligne, croisement ou recouvrement non simples.

- **F02** — MultiLineString fermée si tous ses membres le sont ; MultiCurve EMPTY non fermée selon ISO-CD
  9.3.3–9.3.4.

  **Scénarios de référence:** Deux boucles fermées : fermée ; un membre ouvert : non fermée.

- **V11** — MultiPolygon : intérieurs disjoints, contacts de frontières en un nombre fini de points ; sans coupures,
  pointes ni perforations. ISO-CD 4.2.18–4.2.19, OGC 6.1.14.

  **Scénarios de référence:** Polygones séparés/contact en sommet admis ; arête partagée ou intérieurs recouvrants
  rejetés ; polygone dans un trou possible.

Composition Polygon approuvée : une contrainte publique unique livre le contrat complet J+K.
J fournit les blocs structure/anneaux/planéité ; K complète la topologie et l’intégration publique.
Un trou extérieur coplanaire devra échouer via Polygon et Spatial ; une réussite structurelle n’est pas une validité
complète.
Triangle exige TriangleInterface ; il n’est pas déduit des coordonnées d’un Polygon.

### PolyhedralSurface

- **V12** — Faces Polygon valides et planes avec Z ; ISO-CD 8.5.1 Description 16–17.

  **Scénarios de référence:** Absence de Z, face non plane ou trou invalide rejetés ; toutes les règles Polygon
  s’appliquent.

- **V13** — Surface contiguë, frontières partagées linéaires, <=2 faces incidentes par segment, sens opposés sur les
  arêtes communes. ISO-CD 4.2.12, 8.5.1 Description 2,4,18–19 ; OGC 6.1.12.1.

  **Scénarios de référence:** Arête commune en sens opposés admise ; même sens, trois incidences ou faces disjointes
  rejetés ; contact en sommet insuffisant.

- **V14** — LongitudeOne autorise les surfaces ouvertes par défaut ; un validateur séparé exige la fermeture en
  solide.

  **Scénarios de référence:** Livre ouvert valide admis par défaut, rejeté par fermeture ; cube/tétraèdre valide
  admis par les deux ; fermeture EMPTY non résolue.

ISO-CD 8.5.1 Description 6 évoque un polyèdre fermé ; Description 7, 4.2.12 et OGC 6.1.12.1
distinguent le cas fermé. Q08 conserve le choix produit approuvé sans masquer cette tension.
Le contrôle des seules arêtes partagées ne détecte pas toutes les intersections entre faces.

### C01–C04 — Composants et compatibilité

`Components` livre C01–C04 et la détection des cycles pour les agrégats disponibles.
Le [référentiel des composants](../validators.md#component-rules) précise les chemins, types admis et codes.
Les membres sont tous visités, même derrière un parent déclaré EMPTY. Les membres EMPTY valides de
GeometryCollection, MultiPoint et MultiLineString sont conservés ; aucune exemption EMPTY globale ne remplace
les règles géométriques des autres parents.
Un cycle direct ou indirect produit `Components::CYCLE_ERROR` sur la référence cyclique et arrête cette branche.
Les autres branches continuent ; un même objet partagé est validé à chacun de ses chemins indépendants.
Racine, préfixe et groupe Symfony sont conservés, ainsi que les contraintes, codes et payloads délégués.
Les erreurs Components ont un payload null par défaut. Les emplacements Polygon admettent leur sous-type
Triangle (ISO-CD 4.2.11), sans modifier le dispatch distinct de Triangle.
Les règles géométriques propres aux parents restent dans leurs stories spécialisées.

- **C01** — Vérifier les types de membres permis et chaque composant récursivement.

  **Source et limite:** ISO-CD 7.4.1, 8.3.1, 8.5.1, 4.2.14–19 ; parcours récursif livré par D / #13.

- **C02** — Compatibilité de famille Geometry/Geography.

  **Source et limite:** Décision D approuvée : chaque membre conserve exactement la famille Geometry/Geography du parent.

- **C03** — Compatibilité de disposition des ordinates, XYZ distinct de XYM.

  **Source et limite:** Décision D approuvée : même variante XY/XYZ/XYM/XYZM que le parent, sans conversion.
  Ce contrat LongitudeOne est plus strict que la dimension minimale des faces dans ISO-CD 8.5.1 Description 9.

- **C04** — Compatibilité de référence spatiale.

  **Source et limite:** ISO-CD 4.2.1, 4.2.14 ; identité autorité+identifiant ne prouve ni équivalence CRS ni
  cohérence axes/dimension.

Une collection générale peut mêler types et dimensions topologiques ; l’intersection de membres n’est pas seule
invalidante.
Un même entier SRID sous des autorités différentes n’établit pas l’identité de référence.
Ne déduire ni validité des axes ni transformation des coordonnées du seul SRID.

## 4. Décisions approuvées Q01–Q09

Les décisions du 21 octobre restent applicables, sauf remplacement explicite par la révision d’API du 22 octobre.
L-DIM-01 désigne l’espace de calcul de Q01 ; L-GEO-01 les contrôles Geography structurels prioritaires de Q03.

- **Q01** — Calculs Geometry en XYZ si Z existe, sinon XY ; M toujours ignoré, même pour égalité, fermeture,
  raccords et simplicité. Les opérations ISO-CD ordinaires restent XY, distinctes des opérations 3D explicites.

- **Q02** — Coordonnées finies égales si abs(a-b) <= PHP_FLOAT_EPSILON * max(1.0, abs(a), abs(b)). Aucun arrondi,
  changement de coordonnées ni interprétation en distance.

- **Q03** — Contrôle géographique indisponible : violation explicite avec payload warning ; poursuivre les contrôles
  disponibles. La topologie cartésienne ne remplace pas la géodésie.

- **Q04** — Rejeter les ordinates non finies, M compris ; Geography respecte les bornes inclusives de V16 en degrés.
  Aucune autre limite propre au SRS n’en découle.

- **Q05** — Distinguer l’état EMPTY de l’objet des restrictions des méthodes de construction/mutation SQL/MM ;
  tableau ci-dessous.

- **Q06** — Anneau linéaire non vide : >=4 positions avec fermeture ; Triangle : exactement quatre, sans trous.
  Seuil non applicable aux anneaux circulaires.

- **Q07** — API, helpers, messages et restrictions historiques non publiés modifiables/supprimables ; inventaire,
  pas obligation de compatibilité.

- **Q08** — PolyhedralSurface ouverte admise par défaut ; validateur séparé exigeant la fermeture. Cas EMPTY de ce
  contrôle encore à décider.

- **Q09** — Trou de même sens que l’extérieur : warning, comparaison du même côté du plan ; aucune réparation
  automatique.

Q02 est symétrique et approximatif, non transitif ; il ne compense pas toutes les erreurs arithmétiques accumulées.
Exemples : 0.1+0.2 et 0.3, ou 700000.1+0.2 et 700000.3, sont égaux ; 3 et 3.000001 diffèrent.
Les tolérances de déterminants, projections, orientations et intersections nécessitent une spécification distincte.
Voir la [comparaison des flottants PHP][php-floats].

### Q05 — Membres EMPTY et limites SQL/MM

- **LineString / CircularString** — Point EMPTY interdit ; ISO-CD 7.2.3 / 7.3.3 → 16.1.7 → 16.1.6.

- **CompoundCurve** — Courbe EMPTY interdite dans le chemin SQL/MM inspecté, 7.4.3 → 16.1.6.

- **Polygon / Triangle** — Trou EMPTY rejeté dans 8.3.4 → 8.2.4 → 16.1.6 ; objet non vide exige un anneau, 8.3.3 →
  8.2.3 et 7.1.8. Triangle sans trous.

- **PolyhedralSurface** — Face EMPTY interdite dans le chemin inspecté 8.5.3 → 16.1.6.

- **GeometryCollection** — Membres EMPTY valides admis par le contrat LongitudeOne ; conserver et valider chaque
  membre.

- **MultiPoint / MultiLineString** — Points / LineString EMPTY valides admis dans M / #22 ; conserver les membres et
  la compatibilité stricte de métadonnées/types.

- **MultiPolygon** — La méthode inspectée 9.6.3 → 16.1.15 → 16.1.6 rejette les membres EMPTY ; pas d’extension
  générale du choix MultiPoint.

ST_CheckNulls d’ISO-CD (16.1.6) rejette les membres null et EMPTY.
La méthode de collection 9.1.3 et celles de MultiPoint/MultiLineString 9.2.3→16.1.8 / 9.4.3→16.1.10
l’appellent ; ne pas présenter ces restrictions de méthodes SQL/MM comme des obligations générales de validité des
objets.
Le contrat des collections générales suit OGC 6.1.3.1 et les ensembles vides de 6.1.2 ;
ISO-CD 4.2.14 donne également une définition générale des collections.

Une collection sans membres ou dont tous les membres valides sont EMPTY est EMPTY.
Un Point non vide avec une LineString EMPTY est admissible et non EMPTY, sous réserve des règles de
composants/références.
Ne supprimer ni réordonner les membres ; ne pas ignorer un membre invalide parce que le parent se déclare EMPTY.
Cela n’autorise pas un Point EMPTY dans une LineString.
Une liste sans membres diffère d’une liste contenant un membre EMPTY.
Un extérieur EMPTY accompagné de trous ne décrit pas un Polygon non vide valide.

## 5. Inventaire historique et vérification

Le code historique est archivé dans old/, hors autoload de production.
Révision inspectée : fca0ef88424a862deda7f7d2e8d7c8deafe58c16.
Inventaire du modèle : spatial-types 1.0.0-beta à ceaee5d142c77fc3922ab50c762fa6648fea0e30
et spatial-core 1.3.0 à 1289582288e8954243de5ccb1f28ab7e78f4e9a4.
Ces révisions établissent la provenance, pas les garanties actuelles ni des versions de dépendances figées.

- **SameFamily, SameDimension, SameSpatialReference** — Comparaison aux métadonnées attendues ; aucune traversée
  automatique.

- **MinimumPointCount, FirstPointEqualsLastPoint, NoConsecutiveDuplicatePoints, Ring** — Ancien Ring sans simplicité
  ; égalité incluant M, différente de la comparaison géométrique approuvée.

- **SimpleLineString / Simple3dLineString** — Simplicité linéaire XY/XYZ ; pas d’analyse complète des
  arcs/CompoundCurve.

- **Triangle, PlanarPatch, PolyhedralSurfaceTopology** — Structure/plan/incidence partiels ; pas de topologie
  complète des trous ni preuve générale d’absence d’intersection entre faces.

L’ancien equalsTo comparait classe concrète, famille, dimension, SRID entier et ordinates X/Y/Z/M strictes,
sans identité complète du SRS ni équivalence à ST_Equals.
Les constructeurs historiques protégeaient partiellement coordonnées, membres, anneaux et raccords ;
ces garanties peuvent disparaître lors de l’extraction et ne couvrent pas les implémentations tierces des
interfaces.

Les tests fonctionnels actuels couvrent entrées, routes de l’enum, préconditions spécialisées,
payloads warning, groupes, racine/chemins de propriété et cas défensif par défaut.
La couverture exige 100 % des instructions de production, sans prouver la complétude normative.
Les contrôles locaux ne prouvent pas le succès de la matrice PHP 8.4/8.5 × Symfony 5.4/6/7/8.
Revue indépendante, CI réussie et merge restent nécessaires pour Done.

## 6. Décisions restantes et répartition

La compatibilité stricte famille/variante/référence et la politique des cycles de D sont approuvées et implémentées.

- **Tolérance à l’échelle des calculs intermédiaires** — H–O ; conserver Q02 pour les paires de coordonnées

- **Cohérence axes CRS/dimension du modèle ; consulter ISO 19111** — Future validation des métadonnées CRS,
  hors périmètre D et E

- **Surface EMPTY dans le validateur supplémentaire de fermeture** — O/P ; validité EMPTY par défaut déjà approuvée

- **Interactions entre arcs et intersections arbitraires entre faces** — H/I/O ; annoncer explicitement les
  contrôles indisponibles

L’acceptation EMPTY de GeometryCollection et des MultiPoint/MultiLineString de #22 est approuvée.
Ces choix ne sont plus des questions ouvertes.
Aucune politique EMPTY d’un autre type n’est déduite du silence des sources.

- **A / #8** — Catalogue et traçabilité normative

- **B / #10** — Alignement historique des entrées Symfony ; politique active de chaîne vide remplacée par C

- **C / #12** — Spatial/SpatialValidator, 27 paires spécialisées, dispatch exhaustif et warnings ; aucun algorithme
  géométrique

- **D** — C01–C04, récursion, chemins/groupes/diagnostics

- **E** — V02/V03/V16, coordonnées et Point

- **F / G** — V04/S01/B01 lignes / F01 anneaux linéaires

- **H / I** — V05 arcs / V06 CompoundCurve et simplicité demandée

- **J / K** — V07/V08 blocs structurels / V09/V15 topologie et Polygon public complet

- **L** — V10 Triangle, réutilisant les règles Polygon applicables

- **M / #22** — Collections, C01–C04 et S02/S03/F02 optionnels

- **N** — V11 interactions MultiPolygon

- **O** — V12–V14 surfaces et validation séparée de fermeture

- **P** — Documentation de l’API utilisateur, diagnostics et couverture livrée

Les lettres désignent des périmètres, pas des numéros GitHub. Consulter les Issues pour dépendances et readiness
actuelles.
Les stories spécialisées remplacent progressivement les warnings ; C n’attend pas la réalisation de D–O.
La documentation utilisateur détaillée de spatial-docs reste prévue à partir de 1.0.0-RC.0.

[symfony-input]: https://symfony.com/doc/7.4/validation/custom_constraint.html#creating-the-validator-itself
[ogc-sfa]: https://portal.ogc.org/files/?artifact_id=25355
[ogc-gml]: https://docs.ogc.org/is/07-036/07-036.pdf
[php-floats]: https://www.php.net/manual/en/language.types.float.php
