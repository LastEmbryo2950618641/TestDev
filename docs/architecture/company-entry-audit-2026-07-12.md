# Company Entry Audit (2026-07-12)

This note records `publish/company-actions.js` as another helper-first, low-risk top-level thinning candidate following the earlier settings, loading, role-card-loading, calendar, and event passes.

## Why company is a good next pass
- `publish/company-actions.js` already delegates a visible cluster of readonly presentation methods into `publish/ui/company/view-helpers.js`.
- The helper directory already has an explicit README describing it as the landing zone for readonly display logic.
- The file still keeps state initialization, lexicon sync, and company write-side orchestration in the top-level entry, making the split relatively safe.

## Keep in entry for now
- `initCompanySystem()`
- `currentCompany()`
- `normalizeCompanyPolicy(company)`
- `normalizeEmploymentRecords()`
- company lexicon synchronization and prompt-facing state composition
- attendance / salary / workday calculations that still support runtime state mutation or orchestration
- app open / close flow

## Strong helper facade cluster
These methods are already clearly UI-facing and suitable for forwarding consolidation:
- `companyOrganization()`
- `companyHeaderView()`
- `companyAttendanceView()`
- `companyPayPreviewView()`
- `companyOrganizationSectionView()`
- `companyFieldSectionView()`
- `companyContractSectionView()`
- `companyEmploymentRecordSectionView()`
- `workStatusText()`
- `monthlyPayPreview()`

## 2026-07-12 First facade consolidation landed
A first-pass company entry consolidation is now in place in `publish/company-actions.js`.

What changed:
- introduced a single `companyViewHelperForwarders` map
- introduced `callCompanyViewHelper(name, context, ...args)`
- replaced repeated top-level one-line wrappers with one shared forwarding registration pass

What intentionally did not change:
- company runtime state initialization
- company lexicon generation and sync
- workday / attendance / salary calculations that still support orchestration
- app open / close and other stateful flows

Why this is aligned with the broader refactor:
- makes the top-level entry thinner without changing gameplay behavior
- reinforces `ui/company` as the readonly display landing zone
- preserves the existing split between company rules/orchestration and display composition

Verification performed:
- `node --check publish/company-actions.js`
