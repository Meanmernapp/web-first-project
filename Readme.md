# WebFirst Timesheet & Project Alert System
This project is an internal dashboard used to monitor project health in day-to-day operations.

Its main goal is simple: **help teams avoid budget surprises and contract end-date misses** by turning timesheet data into clear views and timely alerts.

## Why This Exists

Project tracking usually lives across multiple places: timesheets, email threads, PM notes, and spreadsheets. This system brings those decisions into one place so managers can act quickly.

It helps answer questions like:

- Are we about to cross project budget limits?
- Which projects are ending soon and need extension planning?
- Who is working where, and how much?
- Are there inactive projects still taking effort?

## Who Uses It

- Project managers
- Operations teams
- Delivery leadership
- Finance/oversight stakeholders

## What You Can Do In The App

### 1) Track project budget health

The dashboard groups projects and highlights usage levels so you can spot risk early (safe, warning, critical).

### 2) Configure budget warning emails

On the alerts page, teams can set low/high thresholds and choose who should be notified when projects cross those limits.

### 3) Configure contract (POP) end-date reminders

On the project-end alerts page, teams can choose recipients for reminders before contracts expire.

### 4) Review team utilization

The staff page gives a simple view of people, roles, and utilization trends.

### 5) Drill down by project or by person

- Project view: monthly/user hour breakdown with supporting charts
- User view: monthly/project history and utilization summary

### 6) Manage grouped projects

Projects that share the same budget/time boundaries can be grouped for consistent reporting and monitoring.

## Practical Value (Real-World Impact)

- Reduces last-minute escalations
- Improves forecast conversations
- Makes project risk visible earlier
- Helps teams prepare renewals/extensions before deadlines
- Creates a single source of truth for project hour monitoring

## Typical Working Flow

1. Start on the dashboard to see current project status.
2. Open budget alerts and confirm thresholds/recipients are correct.
3. Open project-end alerts and review upcoming contracts.
4. Use project and user drill-down pages to investigate outliers.
5. Take action (resource changes, client communication, extension planning).

## Main Areas In This Repository

- `site/pages/dashboard.tsx` - project overview
- `site/pages/alerts.tsx` - budget alert configuration
- `site/pages/project-end-alerts.tsx` - contract end reminder configuration
- `site/pages/staff.tsx` - staff utilization view
- `site/pages/project/[projectId].tsx` - project detail report
- `site/pages/users/[username].tsx` - user detail report
- `site/pages/group/index.tsx` - group management

## Notes

- This is an internal operations tool.
- Alerting is designed to be proactive, not reactive.
- The system is most effective when threshold and recipient settings are kept up to date.
