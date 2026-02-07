# CityPulse - System Flow & Architecture

## Complete Incident Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE INCIDENT WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

1. CITIZEN REPORTS INCIDENT
   ┌────────────────────┐
   │ Login as Citizen   │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────────────┐
   │ Navigate to Report Incident │
   └─────────┬──────────────────┘
             │
             ▼
   ┌─────────────────────────────────────┐
   │ Fill Incident Details               │
   │ - Title, Description                │
   │ - Category (7 types)                │
   │ - Severity (4 levels)               │
   │ - Location & Coordinates            │
   └─────────┬───────────────────────────┘
             │
             ▼
   ┌─────────────────────────────────────┐
   │ Upload Photos                       │
   │ - Multi-image upload                │
   │ - Drag & drop support               │
   │ - Preview & delete                  │
   └─────────┬───────────────────────────┘
             │
             ▼
   ┌─────────────────────────────────────┐
   │ Duplicate Detection Check           │
   │ Scoring: Category(25%) +            │
   │   Location(30%) +                   │
   │   Severity(20%) +                   │
   │   Title(25%)                        │
   └─────────┬───────────────────────────┘
             │
      ┌──────┴────────┐
      │               │
      ▼               ▼
   Duplicate     No Duplicate
   Found         Found
      │               │
      ▼               │
   ┌──────────────┐   │
   │Show Warning  │   │
   │+ Allow       │   │
   │  Override    │   │
   └──────┬───────┘   │
          │           │
          └─────┬─────┘
                ▼
   ┌─────────────────────────────────────┐
   │ Submit Incident (Status: OPEN)      │
   │ [AUDIT: Created by John Citizen]    │
   └─────────┬───────────────────────────┘
             │
             ▼
   ┌─────────────────────────────────────┐
   │ Incident appears in:                │
   │ - My Reports (Citizen)              │
   │ - City-Wide View (All Citizens)     │
   │ - Officer Dashboard                 │
   │ - Admin Analytics                   │
   └─────────────────────────────────────┘

2. OFFICER ASSIGNS INCIDENT
   ┌────────────────────┐
   │ Login as Officer   │
   │ (Officer Mike)     │
   └─────────┬──────────┘
             │
             ▼
   ┌──────────────────────────┐
   │ View All Incidents       │
   │ (Filter, search, sort)   │
   └─────────┬────────────────┘
             │
             ▼
   ┌──────────────────────────┐
   │ Select Incident          │
   │ CYP-2024-001             │
   │ (Pothole on Main St)     │
   └─────────┬────────────────┘
             │
             ▼
   ┌────────────────────────────┐
   │ Assign to Field Staff      │
   │ → Field Officer Sarah      │
   │ (Status: ASSIGNED)         │
   │ [AUDIT: Assigned by        │
   │  Officer Mike Chen]        │
   └─────────┬──────────────────┘
             │
             ▼
   ┌────────────────────────────┐
   │ Add Officer Note           │
   │ "Team assigned.            │
   │  Prioritizing this repair" │
   │ [AUDIT: Comment added]     │
   └─────────┬──────────────────┘
             │
             ▼
   ┌──────────────────────────────────────┐
   │ Sarah receives task in:              │
   │ - My Assigned Tasks (List View)      │
   │ - Map View (Geographic Location)    │
   └──────────────────────────────────────┘

3. FIELD STAFF EXECUTES WORK
   ┌────────────────────────┐
   │ Login as Field Staff   │
   │ (Sarah)                │
   └─────────┬──────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ View "My Assigned Tasks"       │
   │ - List of 5 assigned tasks     │
   │ - Sorted by severity           │
   │ - Large mobile-friendly cards  │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ Switch to Map View             │
   │ - See task locations on map    │
   │ - Navigate to incident         │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ Click on Task to Open Detail   │
   │ View full incident information │
   │ - Original citizen report      │
   │ - Uploaded photos              │
   │ - Officer notes                │
   │ - Estimated completion date    │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ Click "Accept & Start Work"    │
   │ (Status: IN_PROGRESS)          │
   │ [AUDIT: Status changed by      │
   │  Field Officer Sarah]          │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ Add Progress Notes             │
   │ "Arrived at site. Starting     │
   │  pothole repair..."            │
   │ [AUDIT: Comment added]         │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────────────────┐
   │ Can Transition Status:         │
   │ ► On Hold (with reason)        │
   │ ► Resolved (with notes)        │
   │ ► Closed                       │
   └─────────┬──────────────────────┘
             │
      ┌──────┘
      ▼
   ┌────────────────────────────────┐
   │ Update Status to "RESOLVED"    │
   │ Add Resolution Notes:          │
   │ "Pothole filled. Road smooth"  │
   │ [AUDIT: Status → Resolved by   │
   │  Sarah, Time: 12h, On-time: Y] │
   └─────────┬──────────────────────┘
             │
             ▼
   ┌────────────────────────────────────┐
   │ Incident Complete!                 │
   │ Can transition to CLOSED by Admin  │
   └────────────────────────────────────┘

4. CITIZEN TRACKS STATUS
   ┌────────────────────┐
   │ Login as Citizen   │
   │ (John)             │
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────────────┐
   │ Click "My Reports"         │
   │ See all submitted incidents│
   └─────────┬──────────────────┘
             │
             ▼
   ┌────────────────────────────┐
   │ Click on Incident Card     │
   │ View complete timeline:    │
   │ ✓ Created (John, 3 days)   │
   │ ✓ Assigned (Officer Mike)  │
   │ ✓ In Progress (Sarah)      │
   │ ✓ Resolved (Sarah, 12h)    │
   │                            │
   │ Photos visible             │
   │ Comments visible           │
   │ Dates & times logged       │
   └────────────────────────────┘

5. ADMIN ANALYZES DATA
   ┌──────────────────┐
   │ Login as Admin   │
   │ (Lisa Park)      │
   └─────────┬────────┘
             │
             ▼
   ┌──────────────────────────────────┐
   │ Dashboard Overview Tab           │
   │ - Total incidents: 5             │
   │ - Critical areas: 3              │
   │ - Avg resolution: 18.5 hours     │
   │ - Duplicate rate: 0%             │
   └─────────┬────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────┐
   │ View Performance Metrics Tab     │
   │ Officer: Sarah                   │
   │ - Tasks assigned: 3              │
   │ - Completed: 1                   │
   │ - Avg time: 12 hours             │
   │ - On-time: 100%                  │
   │ - Rating: 4.5/5.0                │
   └─────────┬────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────┐
   │ View Analytics Charts:           │
   │ ✓ Time Series (7-day trends)     │
   │ ✓ Category Pie (Pothole 40%)     │
   │ ✓ Severity Bar (Critical 20%)    │
   │ ✓ Performance Comparison         │
   └─────────┬────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────┐
   │ View Geographic Heatmap          │
   │ - Downtown area: HIGH density    │
   │ - Main St: MEDIUM density        │
   │ - Park Ave: LOW density          │
   └─────────┬────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────┐
   │ Batch Operations Tab             │
   │ - Select 2 incidents             │
   │ - Batch status: RESOLVED         │
   │ - Processed: 2                   │
   │ [AUDIT: Batch operation logged]  │
   └─────────┬────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────┐
   │ Export Compliance Report         │
   │ - JSON file downloaded           │
   │ - All incidents included         │
   │ - Complete audit trail           │
   │ - Officer metrics                │
   │ - Timestamp: 2024-02-07          │
   └──────────────────────────────────┘

```

---

## State Machine Transitions

```
┌─────────────────────────────────────────────────────┐
│           INCIDENT STATUS STATE MACHINE              │
└─────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │    OPEN     │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │                             │
            ▼                             ▼
      ┌────────────┐                ┌─────────────┐
      │ ASSIGNED   │                │   CLOSED    │
      └─────┬──────┘                └─────────────┘
            │                             ▲
   ┌────────┼────────┐                   │
   │        │        │                   │
   ▼        ▼        ▼                   │
┌──────┐ ┌──────┐ ┌──────┐              │
│HOLD  │ │ IN   │ │CLOSE │─────────────┘
│      │ │PROG  │ │      │
└─┬─┬──┘ └─┬────┘ └──────┘
  │ │     │
  │ │     │
  │ │  ┌──┴──┐
  │ │  │     │
  └─┼──┤  RESOLVED
    │  │
    │  ▼
    │  ┌────────┐
    └─►│  HOLD  │
       │ REASON │
       └────────┘

VALID TRANSITIONS:
• OPEN → ASSIGNED or CLOSED
• ASSIGNED → IN_PROGRESS or ON_HOLD or CLOSED
• IN_PROGRESS → ON_HOLD or RESOLVED or CLOSED
• ON_HOLD → IN_PROGRESS or RESOLVED or CLOSED
• RESOLVED → CLOSED or IN_PROGRESS (reopen)
• CLOSED → (final state, no transitions)

```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│              CITYPULSE DATA FLOW                     │
└─────────────────────────────────────────────────────┘

                    USERS
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    CITIZEN        OFFICER       ADMIN
        │             │             │
        ▼             ▼             ▼
    ┌──────────────────────────────────┐
    │     AUTHENTICATION LAYER         │
    │ (Role-based access control)      │
    └────────────────┬─────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    REPORTS      ASSIGNMENTS   ANALYTICS
        │            │            │
        └────┬───────┴────┬───────┘
             │            │
             ▼            ▼
        ┌─────────────────────────┐
        │   INCIDENT TICKETS      │
        │  (lib/types.ts)         │
        │  - Status               │
        │  - Severity             │
        │  - Category             │
        │  - Photos               │
        │  - Audit Trail          │
        └────────┬────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    STATE MACHINE    ANALYTICS
    (state-machine)  (analytics.ts)
        │                 │
        └──────┬──────────┘
               │
        ┌──────▼──────┐
        │ STORAGE     │
        │localStorage │
        └─────────────┘
               │
        ┌──────▼────────────┐
        │ VISUALIZATION     │
        │ Charts, Maps      │
        │ Dashboards        │
        └───────────────────┘

```

---

## Component Hierarchy

```
┌────────────────────────────────────────┐
│  app/page.tsx (Main Entry)             │
└────────────────┬───────────────────────┘
                 │
        ┌────────▼──────────┐
        │  Dashboard.tsx    │
        │ (Router)          │
        └────────┬──────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
CitizenPortal  FieldStaff   AdminDash
Enhanced      Enhanced      Enhanced
    │            │            │
    └────┬───────┴────┬───────┘
         │            │
         ▼            ▼
    Charts       IncidentMap
    Incident     (Heatmap +
    Charts       Markers)

```

---

## Duplicate Detection Algorithm

```
┌─────────────────────────────────────┐
│  NEW INCIDENT SUBMISSION            │
└────────────┬────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ CHECK: Category Match                  │
│ Score = 25% if category same           │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ CHECK: Location Proximity              │
│ Score = 30% if within 500m             │
│ Haversine formula calculation          │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ CHECK: Severity Match                  │
│ Score = 20% if severity same           │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ CHECK: Title Similarity                │
│ Score = 25% using string algorithm     │
│ Bigram matching                        │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ CALCULATE: Total Similarity %          │
│ 25% + 30% + 20% + 25% (weighted sum)   │
└────────────┬───────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
  >60%         <60%
      │             │
      ▼             ▼
 DUPLICATE    NO
 WARNING      DUPLICATE
      │             │
      └──────┬──────┘
             ▼
      ALLOW OVERRIDE
      AND SUBMIT

```

---

## Batch Processing Flow

```
┌────────────────────────────┐
│ SELECT ACTION TYPE         │
│ • Status Update            │
│ • Assign                   │
│ • Category Change          │
│ • Priority Change          │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ SELECT NEW VALUE           │
│ • New status               │
│ • Officer to assign        │
│ • New category             │
│ • New priority             │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ SELECT TICKETS (3 selected)│
│ □ CYP-2024-001             │
│ □ CYP-2024-002             │
│ ☑ CYP-2024-003             │
│ ☑ CYP-2024-004             │
│ ☑ CYP-2024-005             │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ VALIDATE STATE MACHINES    │
│ Check all transitions valid│
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ ASYNC PROCESS (10 at time) │
│ Chunk 1: CYP-001           │
│ Chunk 2: CYP-002           │
│ Chunk 3: CYP-003           │
│ ...                        │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ AUDIT LOG ALL CHANGES      │
│ • Action: batch_status_upd │
│ • Actor: Admin Lisa Park   │
│ • Timestamp: 2024-02-07    │
│ • Count: 3 processed       │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ RETURN STATUS              │
│ ✓ Processed: 3/3           │
│ ✓ Success message          │
│ ✓ Update UI list           │
└────────────────────────────┘

```

---

## Analytics Pipeline

```
┌──────────────────────────────────────┐
│ ALL INCIDENTS IN SYSTEM              │
│ (Active + Resolved + Closed)         │
└──────────────────┬───────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   COUNT     CATEGORIZE   RESOLVE
   TOTAL       SEVERITY   TIME
        │          │          │
        └──────┬───┴──────┬───┘
               │          │
               ▼          ▼
          CALCULATE    GENERATE
          KPIs         METRICS
               │          │
               └─────┬────┘
                     │
        ┌────────────▼──────────────┐
        │ GEOGRAPHIC ANALYSIS       │
        │ • Density calculation     │
        │ • Critical areas          │
        │ • Heatmap grid (12x12)    │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │ TIME SERIES GENERATION    │
        │ • Last 30 days            │
        │ • Daily counts            │
        │ • Resolved per day        │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │ OFFICER PERFORMANCE       │
        │ • Tasks assigned          │
        │ • Completion rate         │
        │ • Avg time                │
        │ • On-time %               │
        │ • Overall rating          │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────┐
        │ VISUALIZATION            │
        │ • Charts (4 types)       │
        │ • Maps (2 modes)         │
        │ • Dashboards             │
        └──────────────────────────┘

```

---

All flows, transitions, and data pipelines are fully implemented and functional.

Ready for production deployment! 🚀
