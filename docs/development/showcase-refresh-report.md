# Documentation and showcase refresh audit

## Revision and scope

Audited application: `ae11475933ede60da058272e72f155d47c474c02`.
Both `HEAD` and refreshed `origin/master` resolved to this SHA on 2026-09-08.
The first implementation fetch failed with:

```text
error: cannot open '.git/FETCH_HEAD': Read-only file system
```

Retrying `git fetch origin master` with access to Git metadata succeeded. An earlier
planning-time `git ls-remote` had failed with `ssh: Could not resolve hostname
github.com: Name or service not known`; that limitation was resolved during
implementation. Revision claims refer to the successful fetch, not those failures.

Only documentation, documentation-site CSS, showcase assets, and manual capture
tooling changed. Application behavior, APIs, calculations, database schema,
existing browser tests, and regression screenshots were not changed.

## Presentation and structure

- README now introduces the product, outcome-based capabilities, privacy and
  plain-text foundations, installation, community, and visible project credits.
- Documentation home orients new users; Product Tour provides visual workflows
  linked to the detailed references. The upstream demo iframe was removed.
- The home page's INR/USD/EUR journal examples were preserved in Getting Started.
- Development/design pages and capture instructions are discoverable in navigation.
- Detailed references, Manifesto, FAQ, Blog, and installation methods remain.
- Privacy wording now distinguishes local journal ownership from external price
  requests and third-party hosting. No bank connectivity or investment advice is claimed.
- Contributor testing documentation now names the current domain/features/shared
  source layout rather than removed source directories.
- FAQ self-links pointed at nonexistent anchors; real headings now expose those anchors.
- Docker commands now explicitly bind the server to `0.0.0.0` inside the container,
  because `backend/cmd/serve.go` defaults to `127.0.0.1`. Published host ports remain
  limited to localhost in the examples.
- No decorative badges were added; ordinary links identify resources directly.

## Feature truth inventory

“Implemented” below means an accessible surface exists in this checkout. It does
not establish that upstream services or a particular packaged release contain it.

| Capability | Accessible implementation evidence | Classification and treatment |
| --- | --- | --- |
| Dashboard, net worth, income, expenses, liabilities | Dashboard and money/asset/liability routes; corresponding handlers registered in `backend/pkg/server/server.go` | Implemented; overview claims retained |
| Budgets and spending outlook | `/expense/budget`, `/api/budget`, populated browser fixture | Implemented; no promise that forecasts prevent overspending |
| Allocation and holdings analysis | `/assets/allocation`, `/assets/analysis`, allocation APIs and seeded synthetic portfolio | Implemented; Portfolio Analysis captured |
| Investment Performance | `/assets/gain` rendered its ready timeline; real `/api/investment/performance?preset=current_fy` returned HTTP 200 | Implemented, data-dependent; fixture returns a null period return and discloses attribution/valuation limitations; reference retained |
| Scenario Planning | `/more/scenarios` rendered its ready projection; real baseline and evaluation APIs returned HTTP 200, evaluation `available: true` | Implemented; illustrative assumptions only, not market predictions or saved scenarios |
| Doctor | `/more/doctor` exposes Run Diagnosis; real `/api/diagnosis` returned HTTP 200 with 11 checks, zero execution failures, seven passed checks and disclosed findings | Implemented read-only diagnostics; reference retained |
| Import | `/ledger/import`, CSV/Excel/PDF client import paths, reusable backend templates | Implemented; synthetic CSV generated three journal entries through the Paytm template without saving |
| Journal editor | `/ledger/editor/main.ledger`, editor APIs and existing save/reload browser test | Implemented; captured syntax highlighting; fixture Ledger stub does not prove real CLI validation |
| Goals, retirement, recurring transactions, credit cards | `/more/goals`, savings/retirement detail routes, `/cash_flow/recurring`, card routes and APIs | Implemented; goal screenshot uses synthetic configured targets |
| Sheets and tax references | Sheets and tax routes with corresponding APIs | Implemented; retained detailed references, no tax-advice claims |
| UI and chart design contracts | Existing `docs/design` documents | Design/development material, separately navigated; not a list of promised features |

No reference page among Investment Performance, Scenario Planning, and Doctor
was classified as specification-only. All three were checked through usable UI
and real APIs, not backend function names alone. Partial data is distinguished
from partial implementation. Unimplemented capabilities mentioned as limitations
(e.g. saved scenarios, benchmark comparison, probabilistic projections) remain
excluded from the product presentation. No design work was deleted.

## Media and reproduction

See [capture instructions](../images/showcase/capture.md) for the exact fixture,
routes, viewport, clock, commands, and readiness conditions.

Six 1440×900 PNGs were captured from this repository running on localhost:
Dashboard, Budget, Portfolio Analysis, Import, Editor, and Goals. PNGs range from
roughly 85–145 KiB. The 1200×750 GIF contains 120 frames at 10 fps over 12 seconds
and is 552,939 bytes. It holds each real screenshot for two seconds; it does not
pretend to record mouse interactions. The complete media set is about 1.2 MiB.

Every distinct screen was visually inspected. Import deliberately shows unknown
categories requiring review. The dashboard's partial-data warnings remain visible
and are explained in the tour; no displayed data was mocked or warnings hidden.
The populated Portfolio Analysis view was selected for investment imagery.
No upstream images, personal financial records, or hosted demo captures were used.

The GIF is optional. Static PNGs, alt text, and written explanations carry the
content independently; the overview includes a static dashboard link. Encoding
failure should use the PNG instead, following the capture manifest. No assets
are missing from this refresh.

## Attribution and Project History

1. **Creator credit:** README's visible **Project History & Credits** section names
   Anantha Kumaran and recognizes community contributions. The docs home does too.
   The root commit `33db293fcfaf21419ba41bb7ae6b663a0f68837b`, dated 2022-03-26,
   identifies Anantha Kumaran; existing MkDocs and desktop metadata corroborate it.
2. **Upstream preserved:** original project, creator profile, upstream contributors,
   hosted documentation/demo, Matrix, social accounts, Nix source, and historical
   references remain tied to their actual sources. No global replacement occurred.
3. **Current links:** MkDocs source/GitHub social links now identify this repository;
   Docker social links identify `pratapkute/paisa`, verified through Docker Hub.
   Installation download links now identify current-repository releases after
   verifying all six documented desktop/CLI asset names in `v0.9.1`.
4. **Copyright:** no copyright or license notices changed. `site_author`, the original
   MkDocs copyright, `COPYING`, and both existing desktop copyright credits remain
   intact. Git history was not rewritten.
5. **Contribution record:** README and docs home link Git history and both upstream
   and current Contributors pages. No invented or ranked contributor list was added.
6. **Uncertain ownership:** `site_url: https://paisa.fyi`, upstream analytics/feedback
   configuration, existing FinBodhi announcement, and established community social
   accounts remain unchanged.
   A fork-owned documentation domain or permission to change those services was
   not established. This work does not deploy the docs or claim that domain.

Creator credit must stay visible during later simplification; do not replace it
with generic “contributors” text or move it exclusively into development docs.
This repository is presented as an active continuation of Paisa, preserving its
name, logo, philosophy, and history.

### Truth and ownership matrix

| Resource | Owner/source | README treatment and verification |
| --- | --- | --- |
| Source repository | `Pratap-kute/paisa` | Primary source/issues/history; remote fetched successfully |
| Local docs | Current repository | Authoritative relative documentation links |
| `paisa.fyi` | Upstream | Explicitly labeled upstream; HTTP 200 |
| `demo.paisa.fyi` | Upstream | Explicitly labeled upstream; HTTP 200; never used for capture |
| Docker image | `pratapkute/paisa` | Linked through installation; publishing workflow and live `latest` tag confirmed; tag last updated 2026-08-27, parity with audited SHA not asserted |
| Releases | Current repository `v0.9.1` | Releases link and installation assets confirmed through GitHub API; current-master feature parity not asserted |
| Nix package | `github:ananthakumaran/paisa` | Existing upstream source preserved and explicitly identified; Nix installation not executed |
| Original project | `ananthakumaran/paisa` | Visible history/creator/contributor links, HTTP 200 |

## Validation and limitations

- `git fetch origin master`: passed on retry; SHA recorded above.
- Local fixture server: frontend production build and Go build passed; journal sync
  and seeded SQLite setup succeeded. `GOCACHE=/tmp/paisa-showcase-go-cache` avoided
  the sandbox's read-only default cache. Local servers required network access.
- `deno run -A scripts/capture_showcase.ts`: passed for all six screenshots.
- `deno run -A scripts/encode_showcase.ts`: passed; `ffprobe` verified size, dimensions,
  frame count, and duration. All six encoded scenes were inspected in a contact
  sheet, as well as reviewing the full-size source screenshots.
- `deno check scripts/capture_showcase.ts scripts/encode_showcase.ts`: passed.
- MkDocs initially failed because the system installation lacked `paginate`.
  Nix is unavailable in this environment. A temporary system-site-packages venv
  with `paginate` installed allowed `/tmp/paisa-docs-venv/bin/python -m mkdocs build
  --strict --site-dir /tmp/paisa-docs-site` to pass without changing repo dependencies.
- Built HTML link/image/anchor checks discovered and corrected three FAQ anchors.
  Final check: all 50 built HTML pages passed local link, image, and anchor validation.
  README relative media and documentation destinations were checked on disk.
- Chromium checks at 390px and 1440px passed for Home, Product Tour, and Installation:
  no horizontal overflow or unloaded images. Desktop Home and mobile Tour were
  visually reviewed. `git diff --check` passed.
- External checks returned HTTP 200 for repository, credits, release, Docker,
  upstream docs/demo, Matrix, social, and core tool links. The historical PikaPods
  launch URL returned HTTP 404; its availability warning is explicit. External
  availability is an observation at audit time, not a guarantee of future service.
- CLI `serve` defaults and flags were verified in source and exercised by the
  temporary fixture server. The bare command was not launched against the user's
  default Documents directory. Desktop installers, Docker images, and Nix packages
  were not installed or executed; advertised release asset names were verified.
- Product tests and financial calculations were not modified. The existing capture
  harness uses a Ledger stub; no claim of full accounting-engine validation is made.
