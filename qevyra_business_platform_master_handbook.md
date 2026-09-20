# QEVYRA — Business & Platform Master Handbook

---

## 1. Executive Summary & Core Concept

### 1.1 The Idea in One Sentence
**QEVYRA** is a unified digital ecosystem for local businesses that starts with a customizable website template for every business, then plugs in domain-specific SaaS engines (QR Ordering for food businesses and Status Tracking for service businesses), connecting them into a shared local cross-advertising network.

### 1.2 Core Architectural Axiom
> **You are not building three isolated companies. You are plugging separate, specialized SaaS engines into one universal website foundation.**

```
                           ┌─────────────────────────────────────────┐
                           │      QEVYRA UNIVERSAL PLATFORM          │
                           │       ("Website for Everyone")          │
                           └────────────────────┬────────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
        ┌─────────────────────────┐                           ┌─────────────────────────┐
        │     QEVYRA ORDER        │                           │      QEVYRA TRACK       │
        │    (QR Menu SaaS)       │                           │     (Tracking SaaS)     │
        │                         │                           │                         │
        │  • Restaurants & Cafes  │                           │  • Garages & Tailors    │
        │  • Food Stalls & Bars   │                           │  • Repairs & Cleaning   │
        └─────────────────────────┘                           └─────────────────────────┘
                                                │
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │      SHARED ADVERTISING NETWORK          │
                           │     (Local Cross-Promotional Grid)      │
                           └─────────────────────────────────────────┘
```

---

## 2. Platform Architecture: The 3 Building Blocks

### Block 1: "Website for Everyone" (Universal Layer)
Every business onboarded to QEVYRA automatically receives a lightweight, customizable mini-website. This serves as their digital front door.

* **Customization:** Configurable color themes, typography, shop logo, hero banner, and business details.
* **Essential Details:** Business name, owner profile, phone numbers, direct WhatsApp button, physical address, Google Maps embed, and operating hours.
* **Dynamic Action Center (CTAs):**
  * For Restaurants: `[ View Menu & Order ]`
  * For Garages / Tailors / Repairs: `[ Track My Service / Ticket ]`
  * For General Retail / Shops: `[ Chat on WhatsApp ]` | `[ View Location ]`

---

### Block 2: QEVYRA Order (QR Menu SaaS Engine)
Your existing restaurant QR SaaS becomes the specialized ordering engine plugged directly into restaurant websites.

#### Customer Journey Flow
```
Scan QR on Table / Click Website Link
                │
                ▼
      Restaurant Mini-Website
                │
                ▼
       Interactive Digital Menu
   (Categories, Items, Add-ons)
                │
                ▼
         Place Order
   (Table # / Takeaway / Dine-in)
                │
                ▼
    Restaurant Admin Dashboard
```

#### Key Capabilities
* Category and menu item management with add-ons/options.
* Table management and unique QR code generation per table.
* Real-time order status (Pending $\rightarrow$ Preparing $\rightarrow$ Served $\rightarrow$ Completed).
* Multi-plan billing system (Bronze, Silver, Star).

---

### Block 3: QEVYRA Track (Service Tracking SaaS Engine)
A generic status-tracking engine built for service-based businesses to eliminate repetitive "Is it ready?" phone calls.

#### Industry Configurations

| Industry | Sample Ticket Code | Workflow Status Steps |
| :--- | :--- | :--- |
| **Garage** | `GAR-4821` | Vehicle Received $\rightarrow$ Inspection $\rightarrow$ Repairing $\rightarrow$ Quality Check $\rightarrow$ Ready |
| **Tailor** | `TLR-1092` | Cloth Received $\rightarrow$ Measurement $\rightarrow$ Cutting $\rightarrow$ Stitching $\rightarrow$ Ready |
| **Electronics Repair** | `REP-0419` | Received $\rightarrow$ Diagnosis $\rightarrow$ Waiting for Parts $\rightarrow$ Repairing $\rightarrow$ Ready |
| **Dry Cleaner** | `DRY-8821` | Dropped Off $\rightarrow$ Washing/Dry Cleaning $\rightarrow$ Ironing $\rightarrow$ Ready for Pickup |

#### Customer Tracking Experience
```
1. Customer leaves item at shop ──► 2. Receives Ticket (e.g., GAR-4821)
                                              │
3. Opens qevyra.com/track/GAR-4821 ◄──────────┘
                │
                ▼
  ┌──────────────────────────────────────────────────────────┐
  │ [✓] Vehicle Received                                    │
  │ [✓] Inspection Completed                                │
  │ [➔] Repairing in Progress...                            │
  │ [ ] Quality Check                                        │
  │ [ ] Ready for Pickup                                    │
  └──────────────────────────────────────────────────────────┘
```

---

## 3. WhatsApp Integration & Data Integrity

### WhatsApp is a Channel, NOT the Database
* **Database as Source of Truth:** All tickets, orders, customer records, and menu items live inside the PostgreSQL database.
* **Notification Layer:** WhatsApp is utilized exclusively to dispatch updates and links (e.g., *"Your repair update for GAR-4821: Ready for pickup. View details: qevyra.com/track/GAR-4821"*).
* **System Resilience:** If third-party messaging services experience downtime, the business operations and status pages remain fully functional and accessible.

---

## 4. The QEVYRA Cross-Advertising Network

Once multiple businesses in a geographic area use QEVYRA websites, they form a self-reinforcing local marketing grid.

```
                    ┌────────────────────────────────────────┐
                    │  Customer at "Ram's Pizza" scans QR   │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │     Views Menu & Places Food Order     │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │         Order Confirmation Screen      │
                    ├────────────────────────────────────────┤
                    │  "Need car maintenance nearby?"        │
                    │  [ Express Auto Garage — 200m away ]   │
                    │  "Get custom suit tailored?"           │
                    │  [ Royal Tailors — Check Status ]      │
                    └────────────────────────────────────────┘
```

### Network Mechanics
1. **Traffic Exchange:** High-foot-traffic businesses (e.g., cafes, restaurants) expose their customers to nearby non-competing service providers (e.g., garages, tailors).
2. **Business Incentives:** Participating businesses receive platform discounts or ad credits when their pages generate local network impressions.
3. **Privacy First:** Customer data is segmented per tenant (`businessId`). A garage cannot view a customer’s dining history without explicit consent.

---

## 5. Technical Stack & Repository Architecture

### Stack Specifications
* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Database:** PostgreSQL (Supabase / Managed Postgres)
* **ORM:** Prisma
* **Auth:** NextAuth / Auth.js
* **Validation & Security:** Zod & bcrypt
* **Deployment:** Vercel (Frontend/API) + Cloud Database

### Target Directory Architecture (Modular Monolith)
```
qevyra/
├── app/                      # Next.js App Router routes
│   ├── (public)/             # Universal marketing & customer tracking pages
│   ├── (business)/           # Business Admin Portal
│   └── (superadmin)/         # Platform Super Admin
├── modules/                  # Modular Monolith core logic
│   ├── core/                 # Shared tenant, user, business, & subscription logic
│   ├── website/              # Custom website rendering engine & themes
│   ├── order/                # QR Menu SaaS engine (Menu, Tables, Orders)
│   └── track/                # Tracking SaaS engine (Tickets, Statuses, Config)
├── prisma/
│   └── schema.prisma         # Single unified schema with module boundaries
├── lib/                      # Database clients, helpers, utilities
└── public/                   # Static assets & default imagery
```

---

## 6. Business Model & Subscription Plans

### Pricing Matrix

| Tier | Price Model | Website Included | SaaS Module Access | Network Status |
| :--- | :--- | :--- | :--- | :--- |
| **Bronze** | Low Cost / Free Tier | Basic Template | **QR Menu (View-Only)** or Basic Contact | Standard Ads Shown |
| **Silver** | Monthly Subscription | Full Customization | **Full QR Ordering** OR **Full Tracking SaaS** | Reduced Ads |
| **Star** | Founding Member Tier | Full Customization | **All Modules + Premium Customization** | Featured Ad Placement |
| **Gold** | Future Enterprise Plan | Multi-Branch | **Multi-location Order & Track Ecosystem** | Network Network Partner |

---

## 7. Sales Strategy & Execution Playbook

### 7.1 Sales Pitch Philosophy
Never sell "Software as a Service" or technical jargon. Sell operational outcomes.

```
❌ WRONG APPROACH: "We offer a cloud-based modular Next.js SaaS platform with QR capabilities."
✅ RIGHT APPROACH (Restaurant): "Stop losing customers during rush hours. Let them view your menu and order instantly from their phones."
✅ RIGHT APPROACH (Garage): "Stop answering 50 phone calls a day asking 'Is my car ready?' Send them one tracking link instead."
```

### 7.2 Acquisition Stages
1. **Phase 1: Founder-Led Direct Sales (Nepal Base)**
   * Hands-on onboarding of local restaurants, garages, tailors, and repair shops.
   * Direct feedback loop to refine menu management and tracking workflows.
2. **Phase 2: Standardized Playbook & Local Sales Team**
   * Documented sales scripts, automated onboarding tools, and fast-setup templates.
3. **Phase 3: Agency & Reseller Network**
   * Local web agencies, printing shops (who print QR standees), and business consultants act as QEVYRA resellers.

---

## 8. Strategic Roadmap (2026 – 2027+)

```
  STAGE 0 (Current)       STAGE 1                 STAGE 2                 STAGE 3                 STAGE 4 (Sept 2027+)
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│ Refactor QR SaaS │ ──►│ Stable QEVYRA    │ ──►│ Launch Universal │ ──►│ Launch QEVYRA    │ ──►│ Local Ad Network & │
│ into Module Core │    │ Order + Revenue  │    │ Website Engine   │    │ Track SaaS       │    │ Remote China Exec  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘    └────────────────────┘
```

* **Stage 0 — Architecture Refactoring:** Establish clear database boundaries (`businessId`) without discarding current working code.
* **Stage 1 — QEVYRA Order Commercialization:** Onboard founding restaurants in Nepal under the Star/Silver tiers to generate recurring revenue.
* **Stage 2 — Universal Website Engine:** Deploy customizable templates so every business gets a digital storefront.
* **Stage 3 — QEVYRA Track Rollout:** Expand to service businesses (garages, tailors, electronics repair) using the generic ticket engine.
* **Stage 4 — Network & Global Remote Execution (September 2027):** Launch the cross-advertising grid across onboarded businesses and manage/expand QEVYRA operations while based in China.