# Hearts Out for Homeless — Operations Platform

Internal ops tool for a small homeless-services nonprofit: inventory tracking with a
photo scanner, care kit builds, partner/shelter deliveries, fundraising and donor
management, volunteer scheduling, and a shared calendar.

**Note:** All data shown in this repo/demo (donor names, amounts, inventory counts,
partners, events) is sample data, not real records.

## Stack

Next.js, TypeScript, Tailwind, Drizzle ORM + Postgres, Anthropic API (vision scanner
and data assistant), Resend (email).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your own values
npm run db:push
npm run dev
```
