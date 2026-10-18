---
title: French website legal review and publication checklist
description: Scope, official sources and manual approval required before publishing the individual-operated LongitudeOne documentation website.
---

This review covers a free documentation website published by an individual, without accounts, sales, audience analytics or advertising.
It records the implementation review of Story #38 on 15 October 2026. It is not a legal opinion, legal certification or accessibility certification.
The publisher must confirm the facts below separately for production and development before approving publication.

## Applicable requirements and implementation

| Subject | Assessment and implementation | Official reference |
| --- | --- | --- |
| Publisher | The configured full-disclosure route identifies the natural person, address and telephone number; no company or association is invented. | [LCEN article 1-1 I, 1°](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164) |
| Publication director | An individual providing the service is the director; the configured name must match the publisher. Check the individual's legal capacity. | [Law of 29 July 1982, article 93-2](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033971722) |
| Hosting and storage | Verify host identity, address, telephone and applicable additional storage providers with addresses. | LCEN article 1-1 I, 4° and 5° |
| Nonprofessional anonymity | A conditional anonymity option exists; this Story implements full identity disclosure. | LCEN article 1-1 II |
| Cookies and local storage | No analytics, advertising, tracking or profiling cookie is introduced. Explicit theme selection uses browser local storage; this is a traceur even though it is not an HTTP cookie. | [CNIL traceurs][cnil] |
| Intellectual property | Preserve the repository MIT license, bundled dependency notices and each third party's applicable terms. A link to a standard does not authorize reproducing it. | [CPI L122-4][cpi] |
| Article 47 accessibility | No covered public entity, public-service mission or qualifying private entity is identified in the stated individual-publisher facts. Confirm those facts; this is no RGAA audit. | [DINUM: scope of accessibility obligations](https://accessibilite.numerique.gouv.fr/obligations/champ-application/) |
| European Accessibility Act | Free technical documentation is not identified as a covered service on the stated facts. Reassess if commerce or another covered service is added. | [DGCCRF: accessibility of products and services](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/professionnels-vos-produits-et-services-doivent-etre-conformes-la-directive-accessibilite) |

The current LCEN identification provisions are in article **1-1**, following the 2024 reorganization; older references to article 6 III need checking.
Registration or professional identifiers require a fresh assessment if the publisher's status changes.

## Privacy and storage review

The current application has no account, contact form, newsletter, audience analytics or application-managed visitor profile.
Search runs locally against the published index. External GitHub edit links lead to a separate service with its own terms.
Docusaurus stores an explicitly selected theme locally. That presentation preference is intrinsically related to the requested interface;
no consent banner is introduced for the current behavior. Adding analytics or another non-exempt traceur requires a new assessment before release.

Hosting infrastructure may process IP addresses, request metadata and technical logs independently of the site's JavaScript.
The publisher must obtain the actual providers, purposes, access controls, legal basis, retention and any required visitor information from the hosting setup.
No retention period or assertion that the host collects nothing is invented here. If additional personal-data processing is introduced or identified,
complete the appropriate privacy information and consent assessment before approving publication.

## License and asset review

The repository documentation is distributed under its existing root MIT license; the generated notice links to an exact copy with attribution retained.
The build inventories installed production dependencies from the lockfile and copies their packaged LICENSE, LICENCE, COPYING and NOTICE texts
into `assets/legal/third-party-notices.txt`. Existing bundled JavaScript license notices remain public too.
The inventory is recorded internally in `.publication-metadata/legal-publication.json` for review; it is not an automatic legal clearance.
Packages without packaged license text are explicitly flagged in that public notice and require manual examination before approval.

The implementation review found authored SVGs and example JSON/CSV assets, references to standards, and migrated ecosystem documentation.
Confirm ownership and provenance of those materials, fonts, icons and any later imported media. Do not infer redistribution rights from technical availability.
Keep standards PDFs and third-party copied text out of publication unless their specific rights permit distribution.

## Environment configuration

`templates/legal-notice.fr.md` and `templates/legal-notice.en.md` generate the French and English legal notices from one approved configuration.
Their generated sources are `docs/legal-notice.fr.md` and `docs/legal-notice.en.md`, each with matching portable Markdown and HTML representations.
The generated source and legal assets are ignored by Git. Never commit actual publisher contact details or copy one environment's facts into another.
Every published HTML page, including search and 404 pages, links to `/legal-notice.fr.html` and `/legal-notice.en.html` in its footer.
Each notice links to its translation; the French page uses a 🇬🇧 English link. The HTML language follows the `.fr.md` / `.en.md` source suffix.

Configure the following legal values as GitHub Actions **repository variables**, except `LEGAL_CONFIGURATION_ENVIRONMENT`.
Configure that variable separately in each GitHub environment: `development` in `github-pages`, and `production` in `production`.
Both deployment workflows read legal values through `vars.LEGAL_*`; `LEGAL_TEST_MODE` remains `false` in the workflows.
Deployment credentials, including `SSH_PRIVATE_KEY`, remain secrets; their configuration is unchanged.

| Variable | Required value |
| --- | --- |
| `LEGAL_PUBLISHER_NAME` | Individual's full name |
| `LEGAL_PUBLISHER_ADDRESS` | Publisher's address for the chosen disclosure route |
| `LEGAL_PUBLISHER_PHONE` | Publisher's telephone number |
| `LEGAL_PUBLICATION_DIRECTOR` | Same individual as the publisher |
| `LEGAL_HOST_NAME` | Actual hosting provider's name |
| `LEGAL_HOST_ADDRESS` | Hosting provider's address |
| `LEGAL_HOST_PHONE` | Hosting provider's telephone number |
| `LEGAL_ADDITIONAL_STORAGE` | Applicable additional storage providers and addresses, or an explicit reviewed statement that none apply |
| `LEGAL_CONFIGURATION_ENVIRONMENT` | Exactly `production` or `development`, matching the build |
| `LEGAL_PUBLICATION_APPROVED` | `true` only after completing the checklist below |

Normal `npm start`, `npm run validate:assets` and `npm run build` require this configuration through the process environment.
Do not put contact values on command lines or in tracked shell files. Diagnostics identify missing variable names without printing their contents.
The values will intentionally become public in the generated notice once an approved artifact is deployed.

For local testing and pull-request checks only, use:

```sh
node scripts/with-test-legal.mjs npm run build
node scripts/with-test-legal.mjs npm run validate:determinism
```

The wrapper injects conspicuously fictional values, marks the notice **TEST ONLY**, and records that publication is unapproved.
Both deployment paths reject those artifacts. Do not upload them manually.
A missing field, unresolved placeholder, inconsistent environment, mismatched director or missing approval blocks a normal build.
The final corpus gate checks both representations, their hashes, required sections and the legal footer on every HTML file.
The deployment preflight verifies approval, environment and notice integrity; it does not certify legal correctness.

## Completed implementation review

The developer reviewed the generated fictional notice against the requirements and sources above on 15 October 2026.

- [x] Publisher, director, hosting and additional storage sections are present in the shared template.
- [x] Application behavior was checked against configuration and installed theme/search implementations; no tracking service or consent banner was added.
- [x] Local theme persistence is distinguished from HTTP cookies and hosting logs from application analytics.
- [x] Root license attribution is retained; dependency notice generation and authored asset categories were reviewed.
- [x] Accessibility scope was assessed for the stated individual-operated documentation service; no RGAA certification is claimed.
- [x] Unresolved real identity, hosting/log facts and final rights approval are explicitly recorded and block publication.

This completed implementation review uses artificial data. The publisher's separate factual review below remains required.

## Publisher checklist before each environment's first publication

- [ ] Confirm the natural-person, noncommercial, free-documentation scope and the chosen disclosure route.
- [ ] Supply and verify the real publisher/director identity, capacity, address and telephone; approve their public disclosure.
- [ ] Verify that environment's host details, additional storage providers and technical log processing with the actual provider.
- [ ] Review privacy information and local-storage behavior; confirm that no unassessed analytics or tracking was added.
- [ ] Review documentation and asset provenance, full dependency notices and every missing-license warning; resolve any distribution restriction.
- [ ] Confirm accessibility scope against the official sources above; do not assert RGAA conformance without an appropriate audit.
- [ ] Inspect both `/legal-notice.fr.html` / `/legal-notice.fr.md` and `/legal-notice.en.html` / `/legal-notice.en.md` from the same final artifact for accuracy.
  Check the footer on ordinary, search and 404 pages.
- [ ] Record the reviewer, date, environment and evidence in the operational publication record.
  Set the repository variable `LEGAL_PUBLICATION_APPROVED=true` after both environments are reviewed.

Real publisher and hosting facts have not been supplied as part of this implementation. Approval therefore remains unset;
publication must stay blocked until the publisher completes this review. Revisit it when hosting, processing, dependencies or the site's purpose changes.

[cnil]: https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi
[cpi]: https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278911
