---
title: HTML search indexing and SEO validation
description: Canonical HTML identities, crawlable alternate representations, structured data and mandatory publication checks.
---

The official HTML representation is the search identity of each documentation resource.
The production URL comes from `URL_PRODUCTION`; authors do not maintain canonical URLs or JSON-LD in source Markdown.

## Representation policy

| Resource | Indexing and discovery |
| --- | --- |
| Production `.html` documentation | Absolute self-referencing production canonical; included in the sitemap. |
| Production `.md` | Accessible normally; Apache sends `X-Robots-Tag: noindex`. |
| Negotiated extensionless URI | Accessible normally; Apache sends `noindex` for either negotiated representation. |
| Preproduction HTML | Global `noindex, follow`; canonical identifies the matching production resource. |
| Preproduction sitemap | Empty URL set; no sitemap announcement in robots. |
| Search and error pages | Excluded from the documentation sitemap. |
| Public legal notice | Included with other public HTML pages, without artificial priority. |

`robots.txt` allows public retrieval for conventional and AI crawlers alike.
It references the production sitemap only in production. Crawling must remain allowed so crawlers can see `noindex` directives.
GitHub Pages cannot serve the production Apache response headers; the global HTML directive protects its documentation instead.

## Metadata and semantics

Docusaurus derives titles, descriptions, Open Graph metadata and the principal H1 from document metadata.
The HTML representation declares English; the current legal notice contains both English and French.
Authors must preserve a coherent heading hierarchy and supply informative image alternative text when appropriate.
Navigation and breadcrumbs retain explicit `.html` resource paths.

The [default sharing card](../assets/images/social-card.png) provides a reusable 1200 × 630 PNG geometric illustration.
Regenerate it with `python3 scripts/generate-social-image.py`; it introduces no browser download or font dependency.

## Structured data classification

`scripts/seo-policy.mjs` centrally derives JSON-LD from the same title, description and production URL.

| Page purpose | Schema.org type |
| --- | --- |
| Root `index.html`, the site identity | `WebSite` |
| Library/domain/version landing pages and roadmaps | No article type; these are navigation and planning resources. |
| Legal notice and legal publication review | No technical article type. |
| Validator constraints, concrete type API and encoder strategy API references | `APIReference`, selected by explicit path list. |
| Other technical reference and contributor pages | `TechArticle` |

An API-like directory name alone never selects `APIReference`. Update the explicit classification when genuine API reference pages are added.
Docusaurus also provides user-facing breadcrumbs and `BreadcrumbList` JSON-LD.
Schema.org validity does not promise a Google rich result or higher ranking.

## Publication checks

`npm run build` checks SEO after assembly and before atomic promotion of the public corpus.
The same mandatory step runs in production and preproduction CI builds; errors prevent publication.
`node --test tests/seo-publication.test.mjs` exercises valid environments and deliberate metadata/sitemap regressions.
`npm run test:apache` verifies actual HTTP response directives and negotiation independently.

The SEO gate checks canonical identity and suffix, title uniqueness, source description fidelity, Open Graph consistency,
principal H1, visible heading hierarchy, document language, JSON-LD syntax and classification, breadcrumbs, image alt attributes,
environment indexing policy, sitemap inventory and robots discovery policy.

Attribute validation cannot determine whether an image description is meaningful: review informative and decorative images manually.
Hidden navigation panels do not participate in the principal document heading hierarchy.

Production Apache also compresses text responses when `mod_deflate` is installed and gives content-hashed runtime/search files
an immutable one-year cache lifetime. Stable document paths retain normal server caching behavior.

## Operational audit and Search Console

The [Story 39 audit](./html-seo-audit.md) records the initial findings, measurements and accepted limitations.
After deployment, verify representative `.html`, `.md` and negotiated responses against the real HTTPS server.
Register the production property in Search Console and submit `/sitemap.xml` using an authorized account.
Account setup and authentication are outside CI. Deployment and search-engine indexing are independent events.

## References

- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: robots metadata and HTTP indexing directives](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google: sitemap generation and submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Schema.org WebSite](https://schema.org/WebSite), [TechArticle](https://schema.org/TechArticle), [APIReference](https://schema.org/APIReference)
- [Schema.org validator](https://validator.schema.org/)
