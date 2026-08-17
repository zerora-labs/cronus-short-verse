<div align="center">

![CronusShortVerse](https://img.shields.io/badge/CronusShortVerse-Narrative_Gravity-purple?style=for-the-badge)

**A Short Drama Universe Powered by Narrative Gravity**

[![中文版](https://img.shields.io/badge/🌏_中文版-README-blue?style=flat-square&logo=google translate&logoColor=white)](README.zh-CN.md)
[![English](https://img.shields.io/badge/🌐_English-README-green?style=flat-square&logo=google translate&logoColor=white)](README.md)

---

</div>

CronusShortVerse is an open, community-driven framework for building connected short drama universes. It uses astrophysical metaphors (stars, planets, comets, meteors, black holes) to model characters, relationships, and plot dynamics, enabling creators to design fast‑paced, high‑drama stories that keep viewers engaged.

---

## What is a Short Drama?

In the context of CronusShortVerse, a **short drama** refers to a video series where each episode is approximately **2 minutes** long. These episodes feature:
- **Rapid pacing** – scenes change quickly
- **High‑intensity conflicts** – every moment drives tension
- **Frequent cliffhangers** – viewers are compelled to watch the next episode
- **Viral hooks** – designed for short‑video platforms (e.g., TikTok, Reels, YouTube Shorts)

Short dramas are a unique storytelling form that demands efficiency, impact, and serial engagement.

---

## The Vision: A Universe of Short Dramas

Most short dramas are standalone. CronusShortVerse changes that by providing a **shared narrative infrastructure**:

- **Cross‑story connections** – characters from different series can interact
- **Evolving lore** – events in one drama can ripple across the entire universe
- **Creator collaboration** – multiple authors can contribute to the same world

Think of it as a **Marvel Cinematic Universe for short dramas**, but open and built by the community.

---

## Core Features

- **Character Book & World Book**  
  Users can provide character profiles (traits, goals, backstory) and world settings (history, laws, geography). The system can also output updated versions after evolution.

- **Evolution by Community Voting**  
  Participants propose and vote on character arcs, major events, or world rule changes. Voting results directly update the books, enabling decentralized collective storytelling.

- **Evolution by AI Generation**  
  Integrated LLMs generate story fragments, dialogues, or event branches. Users can select, modify, and commit AI-generated content, which then becomes part of the universe history.

- **Traceable History**  
  Every evolution (voting or AI) is logged. Users can browse or roll back to any previous version of a character or world.

---

## The Core Metaphor: Celestial Bodies

We model every narrative element as a celestial body. This makes complex relationships visual and intuitive.

| Celestial Body | Narrative Role | Example |
| -------------- | ------------------------------------- | -------------------------------------- |
| **Star** | Core protagonist / central figure | The CEO in a business drama |
| **Planet** | Recurring supporting character | The loyal assistant, the rival |
| **Comet** | Guest character / temporary influence | A mysterious stranger passing through |
| **Meteor** | One‑time event / noise | A viral rumor, a sudden accident |
| **Black Hole** | High‑risk point / unknown | A secret that could destroy everything |

**Gravitational fields** represent external forces (market trends, social pressure, antagonist actions) that pull on characters’ orbits.

---

## How It Works with CronusCycle

CronusShortVerse is built on top of **CronusCycle** – the open‑source decision audit middleware. CronusCycle provides:
- **Noise filtering** – separates signal from noise in story data
- **Logic auditing** – ensures character actions stay consistent with their established traits
- **AI slots** – allows you to plug in any LLM for generative story assistance
- **Galaxy Engine** – the visualization module that renders your story universe as an interactive star map

Thus, CronusShortVerse is not just a concept – it is a **runnable, extensible tool** for creators.

---

## Roadmap

We are building more than a document – we are building a **usable platform**. Here is what’s planned:

- **Q3 2026 – Web Prototype**  
  A simple web interface where you can:
  - Create or import Character Books and World Books
  - Visualize your universe with the Galaxy Engine (basic 2D star map)
  - Submit evolution proposals and vote on community ideas

- **Q4 2026 – AI Integration**  
  One-click AI generation of story branches based on your books. Users can commit AI suggestions directly.

- **Q1 2027 – Mobile App (iOS & Android)**  
  A companion app for browsing universes, receiving notifications on voting results, and quick story generation on the go.

- **Beyond** – API for developers, custom visualization themes, and decentralized governance experiments.

> **Note**: Everything is open source. If you are a developer, you can help accelerate this roadmap. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Development Status

> Last updated: 2026-08-17

### Completed

| Module | Backend API | Frontend Page | Status |
|--------|:-----------:|:-------------:|--------|
| User Auth (register / login / profile) | ✅ | ✅ | Done |
| Universe CRUD + fork + export chronicle | ✅ | ✅ | Done |
| Character CRUD (with celestial type) | ✅ | ✅ | Done |
| Galaxy Engine (interactive Canvas star map) | ✅ | ✅ | Done |

### In Progress / Not Started

| Module | Backend API | Frontend Page | Status |
|--------|:-----------:|:-------------:|--------|
| Relationship management (gravitational ties) | ❌ | ❌ | DB table exists, no routes |
| Proposal + voting system | ❌ | ❌ | DB tables exist, no routes |
| Arc & episode management | ❌ | ❌ | DB tables exist, no routes |
| Event tracking (signal / noise) | ❌ | ❌ | DB table exists, no routes |
| Change history & rollback | ❌ | ❌ | DB table exists, no routes |
| Character detail page (full Character Book) | — | ❌ | — |
| Proposal center page | — | ❌ | — |
| AI story generation | ❌ | ❌ | Not started |

### Tech Stack

- **Backend**: Express + SQLite (better-sqlite3) + JWT
- **Frontend**: Vanilla JS + TailwindCSS + Canvas (Galaxy Engine)
- **Database**: SQLite (14 tables defined in `db.js`)

---

## TODO

### Phase 1 — MVP Completion (Q3 2026)

**Backend**
- [ ] Relationship CRUD API (`/api/universes/:uid/relationships`)
- [ ] Proposal CRUD + voting API (`/api/universes/:uid/proposals` + `/api/proposals/:id/vote`)
- [ ] Arc & episode management API
- [ ] Event management API (signal vs noise)
- [ ] Change history API (`/api/history`)
- [ ] Galaxy data API (verify `/api/universes/:uid/galaxy` integration)

**Frontend**
- [ ] Proposal center page (create proposal + voting panel)
- [ ] Character detail page (Character Book: traits, relationships, evolution timeline)
- [ ] Relationship management UI (create / edit gravitational ties)

### Phase 2 — Core Feature Enhancement

- [ ] Galaxy Engine animated orbits (currently static equilibrium layout)
- [ ] Signal / noise event visualization
- [ ] Historical version rollback UI
- [ ] Notification system

### Phase 3 — AI Integration (Q4 2026)

- [ ] AI story branch generation (OpenAI / Anthropic API)
- [ ] AI session management + submit as proposal
- [ ] Logic audit (character consistency checking)

---

## Get Involved

- **Read the concept document** ([concept.md](concept.md)) for deeper lore
- **Explore the rules** ([rules.md](rules.md)) to understand how celestial bodies interact
- **Check examples** ([examples.md](examples.md)) to see universes built with CronusShortVerse
- **Contribute** via GitHub – we welcome writers, artists, and developers

CronusShortVerse is **free and open source** (MIT license for code, CC BY for concept documents). Join us in shaping the future of short drama storytelling.

---

*Part of the CronusCycle ecosystem – where decisions and stories follow the same laws of gravity.*