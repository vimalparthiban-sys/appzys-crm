# APPZYS Client Acquisition CRM - Frontend

Modern, high-performance React (JSX) + Tailwind CSS client acquisition CRM interface designed strictly according to the APPZYS CRM specifications and UI mockups.

## Features
- **Design System**: Palette (`#F7F7FC` background, `#6D42D8` primary purple, `#211B3B` deep purple sidebar), Inter typography, soft cards, responsive desktop/tablet layouts.
- **5-Minute Auto-Refresh**: Background interval polling synchronizing team CRM updates without full page reloads.
- **Intelligent Duplicate Detection**: Real-time modal checking for normalized company names and official/source URLs, with interactive warning resolution (View Existing, Add Source to Existing, or Continue as New).
- **Interactive Kanban & Table Views**: Full pipeline drag/status changes across Found → Contacted → Reply Received → Interested → Meeting → Converted stages.
- **Company Details Workspace**: Inline status transitions, multi-source links, follow-up scheduler/rescheduler, and rich activity timeline (auto + manual logs).
- **Dedicated Follow-ups**: Today, Overdue, and Upcoming task queues with instant mark-complete actions.
- **Settings & Reusable Sources**: Dynamic platform management for discovery links.

## Getting Started

### 1. Install Dependencies
```bash
cd "D:\Client Acquisition CRM\frontend"
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
The output will be generated in `dist/`.
