# CRM Next Integration Mapping

Scope: replace the existing Seeding CRM UI at `/all-platform/crm` with the
`crm-next` module UI, while reusing Seeding auth, API, and database. No database
migration is included in this phase.

## Sources

- UI/domain source: `C:\Code\SMB_Deployment\crm-next\src\modules\crm`
- Seeding frontend route: `linkedin-crawler-ui/app/(all-platform)/all-platform/crm/page.tsx`
- Seeding API client: `linkedin-crawler-ui/services/customer-lead.service.ts`
- Seeding backend API: `linkedin_group_crawler/app/modules/all_platform/routers/customer_lead.py`
- Seeding database model: `customer_leads`, `customer_lead_activity_log`, `app_users`

## Direct Field Mapping

| crm-next Deal field | Seeding API / DB field | Direction | Persistence |
| --- | --- | --- | --- |
| `id` | `customer_leads.id` | read/write target id | direct |
| `contactId` | `customer_leads.id` | read only alias | fallback |
| `dealId` | `customer_leads.id` | read only alias | fallback |
| `customerName` | `customer_name` | read/write | direct |
| `companyName` | `company_name` | read/write | direct |
| `phone` | `phone` | read/write | direct |
| `email` | `email` | read/write | direct |
| `website` | `website` | read/write | direct |
| `taxCode` | `tax_code` | read/write | direct |
| `address` | `address` | read/write | direct |
| `city` | `city` | read/write | direct |
| `industry` | `industry` | read/write | direct |
| `sourcePlatform` | `source_platform` | read/write | direct for `Manual`, `FB_Inbox`, `FB_Group`, `Zalo` |
| `servicePackage` | `service_package` | read/write | direct |
| `stage` | `deal_stage` | read/write through transition API for moves | direct |
| `prevStage` | `prev_stage` | read/write through transition API | direct |
| `stageEnteredAt` | `stage_entered_at` | read/write | direct |
| `daysInStage` | `days_in_stage` | read | computed/fallback |
| `decisionMaker` | `decision_maker` | read/write | direct |
| `estimatedBudget` | `estimated_budget` | read/write | direct |
| `lifetimeValue` | `lifetime_value` | read/write | direct |
| `followUpDate` | `follow_up_date` | read/write | direct |
| `contract.signedAt` | `contract_signed_at` | read/write | direct |
| `contract.warrantyExpiresAt` | `warranty_expires_at` | read/write | direct |
| `contract.customerSince` | `customer_since` | read/write | direct |
| `contract.lastCareAt` | `last_care_at` | read/write | direct |
| `contract.paymentDueDate` | `payment_due_date` | read/write | direct |
| `contract.url` | `last_attachment_url` | read/write | direct as document/link reference |
| `contract.title` | `last_attachment_name` | read/write | direct as document/link title |
| `contract.note` | `care_note` | read/write | fallback |
| `note` | `note` | read/write | direct |
| `closedReason` | `closed_reason` | read/write | direct |
| `assignment.sdrId` | `sdr_id` | read/write | direct |
| `assignment.sdrName` | `sdr_name` | read | joined/display only |
| `assignment.leadedById` | `leaded_by` | read/write | direct |
| `assignment.leadName` | `leader_name` | read | joined/display only |
| `stageHistory` | `customer_lead_activity_log` | read | direct through activity-log API |
| `createdAt` | `created_at` | read | direct |
| `updatedAt` | `updated_at` | read | direct |

## Fallback Or Display-Only Mapping

| crm-next Deal field | Current handling | Reason |
| --- | --- | --- |
| `position` | UI keeps field, not persisted | no `customer_leads.position` field |
| `zalo` | UI keeps field, not persisted | no dedicated field |
| `facebook` | UI keeps field, not persisted | no dedicated field |
| `telegram` | UI keeps field, not persisted | no dedicated field |
| `package` | UI keeps field, not persisted | no dedicated package/plan field separate from `service_package` |
| `pauseReason` | read from `note` when on hold, not separately persisted | no `pause_reason` field |
| `quote.id` | UI keeps field, not persisted | no quote table/API in phase 1 |
| `quote.number` | UI keeps field, not persisted | no quote table/API in phase 1 |
| `quote.url` | fallback to `last_attachment_url` when available | quote module is phase 2 |
| `quote.totalAmount` | fallback to `estimated_budget` or `lifetime_value` | quote module is phase 2 |
| `crmStatus` | derived from `deal_stage`/`status` | no separate DB field needed |
| `closedAt` | fallback to `customer_since` or `updated_at` for terminal deals | no `closed_at` field |
| `outcome.reviewedAt` | display-only fallback | no field |
| `outcome.result` | `review_result` when compatible | partial |
| `outcome.reasonText` | `reject_reason` for lost deals | partial |
| `outcome.reasons/rootCause/evidence/repeat/improve/confidence` | UI keeps fields, not persisted | no fields/API yet |

## Status Mapping Constraints

### Contract status

`crm-next` supports:

- `moi_tiep_nhan`
- `dang_xu_ly`
- `da_bao_gia`
- `dang_dam_phan`
- `da_chot`
- `tam_dung`
- `khong_hoat_dong`

Existing Seeding DB/migrations currently guarantee only:

- `active`
- `completed`
- `maintenance`

Some frontend types in the old Seeding service also mention `da_bao_gia`,
`dang_xu_ly`, and `da_chot`, but the database migration does not guarantee the
full `crm-next` enum.

Phase 1 rule: do not collapse multiple `crm-next` contract statuses into one DB
value. The UI may display derived status from the deal stage, but updates to
unsupported contract statuses must not be persisted until a dedicated migration
is approved.

### Payment status

`crm-next` supports:

- `chua_thanh_toan`
- `thanh_toan_mot_phan`
- `da_thanh_toan`
- `qua_han`

Seeding DB supports:

- `unpaid`
- `partial`
- `paid`

Safe reversible mapping:

- `unpaid` <-> `chua_thanh_toan`
- `partial` <-> `thanh_toan_mot_phan`
- `paid` <-> `da_thanh_toan`

Unsupported:

- `qua_han` is derived from `payment_due_date < now` and `payment_status != paid`.
  It must not be persisted as a DB value in this phase.

## API Mapping

| CrmRepository method | Seeding API |
| --- | --- |
| `getDeals(filters)` | `GET /api/all-platform/customer-leads` |
| `getDeal(id)` | get list then find by id, or use cached list; no dedicated endpoint in phase 1 |
| `createDeal(input)` | `POST /api/all-platform/customer-leads` |
| `updateDeal(id, input)` | `PUT /api/all-platform/customer-leads/{id}` |
| `deleteDeal(id)` | `DELETE /api/all-platform/customer-leads/{id}` |
| `moveDeal(id, stage, payload)` | `POST /api/all-platform/customer-leads/{id}/transition` |
| `getAnalytics(filters)` | computed from `getDeals()` in frontend repository in phase 1 |

## User/Agent Source

`DealFormModal` must not import mock agents. It will receive user options from
`SeedingCrmRepository.getSdrs()`, backed by:

- `GET /api/all-platform/customer-leads/sdrs`

Current endpoint returns `app_users` with roles `admin` and `leader`.

## Fields Requiring Future Backend/DB Support

- customer position/job title
- Zalo/Facebook/Telegram contact links
- separate CRM package/plan distinct from `service_package`
- quote id/number/total/link with a real quote table or quote API
- full contract status enum from `crm-next`
- pause reason separate from generic note
- detailed won/lost review fields: confidence, reasons, root cause, evidence,
  repeat, improve, reviewedAt
- dedicated closedAt field if terminal timing must differ from `updated_at` or
  `customer_since`
