# ManageIT — Asset Management Module

**Date:** 2026-04-02
**Status:** Approved
**Target:** ProjectIT staging

## Overview

ManageIT is an asset management module inside ProjectIT for tracking company assets and tools assigned to employees. Shares existing Supabase auth, PostgreSQL database, and Railway deployment — no new infrastructure.

## Data Model

### Asset Entity
- `name`, `type` (IT Equipment, Mobile Device, Software License, Vehicle, Physical Tool)
- `serial_number`, `model`, `manufacturer`, `purchase_date`, `purchase_cost`
- `status` (Available, Assigned, Returned)
- `condition` (New, Good, Fair, Damaged)
- `location` (office/branch/site)
- Software-specific: `license_key`, `expiry_date`
- `notes`, `image_url`

### AssetAssignment Entity
- `asset_id`, `employee_id`
- `assigned_date`, `returned_date`
- `condition_at_checkout`, `condition_at_return`
- `acknowledged` (boolean), `acknowledged_date`, `signature_data`
- `notes`

### Employee Entity (JumpCloud-synced)
- `jumpcloud_id`, `first_name`, `last_name`, `email`
- `department`, `job_title`, `location`
- `status` (Active, Suspended, Inactive)
- `last_synced`

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/assets` | Asset Dashboard | Admin |
| `/assets/inventory` | Asset List | Admin |
| `/assets/inventory/:id` | Asset Detail | Admin |
| `/assets/assign` | Assign/Return | Admin |
| `/assets/employees` | Employee Directory | Admin |
| `/assets/employees/:id` | Employee Profile | Admin |
| `/assets/licenses` | Software Licenses | Admin |
| `/assets/reports` | Reports | Admin |
| `/my-assets` | My Assets | Employee |

## Asset Lifecycle

Available -> Assigned -> Returned -> Available (simple loop)

## JumpCloud Integration

- Server-side sync via JumpCloud System Users API
- Daily automatic + manual trigger
- Creates/updates Employee entities, marks removed as Inactive (never deletes)
- Matched by `jumpcloud_id`
- API key stored as environment variable

## Digital Signature

- Canvas-based signature capture on assignment
- Signature stored as base64 in AssetAssignment
- Remote employees: token-based link for review and sign
- Works on tablet/mobile

## Alerts

- Expiring licenses (30-day window) on dashboard
- Overdue returns (Inactive JumpCloud employee with assigned assets)
- Dashboard badge counts for actionable items

## Reporting

- Dashboard overview: total assets, assigned vs available, by type
- Employee profiles: all current/past assignments
- Asset history: full assignment timeline with audit log
- Cost summary and exports

## Access Control

- Admins: full management
- Employees: view own assigned assets, acknowledge receipt

## Tech Stack (shared with ProjectIT)

- React + Vite, shadcn/ui, Tailwind, Lucide icons
- Express backend, JSONB entity storage
- Supabase auth with MFA
- Railway deployment
