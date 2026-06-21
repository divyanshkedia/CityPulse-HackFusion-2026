# CityPulse - Urban Incident Management System

A comprehensive, mobile-first incident management and ticketing platform for urban infrastructure. CityPulse enables citizens to report infrastructure issues, field staff to respond and resolve tickets, officers to manage operations, and administrators to monitor analytics and compliance.

## Key Features

### 🎯 Comprehensive Ticketing System
- **Full Ticket Lifecycle**: Open → Assigned → In Progress → Resolved → Closed
- **Severity Levels**: Low, Medium, High, Critical
- **Categories**: Potholes, Flooding, Traffic Signals, Street Lights, Debris, Accidents, Other
- **Real-time Status Tracking**: Live updates on every ticket action
- **Automatic Audit Trail**: Complete history of all changes with actor identification

### 👥 Multi-Role System

#### Citizens
- Report infrastructure issues with location and severity
- Track the status of their reports in real-time
- View complete history and updates on reported incidents
- Access incident details with full audit trail

#### Field Staff
- Accept available work orders
- Update incident status as work progresses
- Add progress notes and work updates
- Complete and resolve incidents with documentation

#### Officers
- Manage all incidents across the city
- Filter incidents by status, severity, and category
- Assign work to field staff
- Monitor team performance and utilization
- Respond to critical incidents immediately

#### Admins
- Generate detailed analytics and compliance reports
- Monitor system-wide performance metrics
- Review complete audit logs of all system activities
- Export data for compliance and reporting
- Analyze incident trends by category and severity

### 📊 Advanced Analytics & Reporting
- **Real-time Dashboard**: KPIs including total incidents, critical issues, resolution rates
- **Category Analysis**: Breakdown of incidents by type
- **Severity Distribution**: Visual representation of incident severity
- **Resolution Metrics**: Average resolution time and completion rates
- **Team Utilization**: Field staff performance and workload analysis
- **PDF/JSON Export**: Download reports for compliance documentation

### 🔐 Audit & Compliance
- **Complete Audit Trail**: Every action logged with timestamp and actor
- **Field Change Tracking**: See exact before/after values for all modifications
- **Compliance Reports**: Generate reports for regulatory requirements
- **Role-Based Access Control**: Secure access based on user roles
- **Activity Timeline**: Visual representation of incident history

### 📱 Mobile-First Design
- Fully responsive interface optimized for mobile devices
- Touch-friendly navigation and controls
- Adaptive layouts for all screen sizes
- Fast load times and smooth interactions
- Accessible UI following WCAG standards

### 🎨 Unique Design System
- **Color Palette**: Warm orange primary (#FF6B3D), Emerald secondary (#20B997), warm neutrals
- **No Blue/Purple**: Distinctive branding avoiding common SaaS colors
- **Accessibility**: High contrast ratios and semantic HTML
- **Performance**: Optimized CSS and minimal JavaScript overhead

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Components**: Shadcn/ui with custom theming
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Lucide React

### Backend & ML Service
- **ML Engine**: Python, FastAPI
- **Object Detection**: YOLOv8 (identifies potholes, garbage, water leaks, fallen trees, streetlights)
- **Image Processing**: OpenCV, PyTorch

### Database & Real-Time Sync
- **Database**: Supabase PostgreSQL for live ticket persistence
- **Real-Time Channels**: Supabase Realtime for instant dashboard updates
- **Audit System**: Immutable audit logs on all system modifications

### DevOps & Orchestration
- **Containerization**: Docker, Docker Compose (Frontend, Backend, Prometheus, Grafana)
- **Orchestration**: Kubernetes manifests (Deployments, LoadBalancer services, resource limits)
- **Monitoring**: Prometheus (metrics scraping) & Grafana (visual latency dashboards)
- **CI/CD**: GitHub Actions workflows & declarative Jenkinsfiles

*For a detailed systems architecture diagram and DevOps deployment details, see **[DEVOPS.md](./DEVOPS.md)**.*

## Getting Started

### Local Development Setup

1. Install dependencies in the root directory:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Start the FastAPI ML service in a separate terminal:
   ```bash
   cd ml-service
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Containerized Setup (DevOps Suite)

To spin up the entire containerized architecture locally:
1. Ensure Docker Desktop is installed and running.
2. Run from the root directory:
   ```bash
   docker compose up --build
   ```
3. Access the deployed services:
   - **Frontend App:** http://localhost:3000
   - **ML Backend Engine:** http://localhost:8000
   - **Prometheus Metrics:** http://localhost:9090
   - **Grafana Visualization:** http://localhost:3002

### Demo Credentials

The system comes with demo accounts for testing:

- **Citizen**: citizen@citypulse.local
- **Field Staff**: sarah@citypulse.local
- **Officer**: mike@citypulse.local
- **Admin**: admin@citypulse.local

Simply select a role on the login page to start exploring.

## Project Structure

```
/app
  - page.tsx              # Main entry point
  - layout.tsx            # Root layout with metadata
  - globals.css           # Global styles and design tokens

/components
  /auth
    - login-page.tsx      # Role selection and login
  /dashboard
    - dashboard.tsx       # Main dashboard router
  /navigation
    - navigation-bar.tsx  # Header navigation
  /portals
    - citizen-portal.tsx     # Citizen interface
    - field-staff-interface.tsx  # Field staff interface
    - officer-dashboard.tsx      # Officer management
    - admin-analytics.tsx        # Admin analytics
  /tickets
    - ticket-card.tsx         # Ticket display component
    - audit-timeline.tsx      # Audit log visualization
  /map
    - incident-map.tsx    # Visual incident distribution
  /common
    - empty-state.tsx     # Reusable empty state

/lib
  - types.ts       # TypeScript type definitions
  - storage.ts     # Client-side storage and operations
  - utils.ts       # Utility functions
```

## Features in Detail

### Ticket-Based System

Every incident is tracked as a ticket with:
- Unique ticket number (CYP-YYYY-000)
- Full audit trail with timestamps
- Status transitions tracked as audit logs
- Field-level change history (before/after values)
- Comment threads for collaboration
- Attachment support ready

### Audit & Compliance

The audit system logs:
- **Ticket Creation**: Who reported, when, category/severity
- **Status Changes**: Complete history of transitions
- **Assignments**: Who assigned to whom, when
- **Updates**: Field changes with old and new values
- **Resolutions**: Who resolved, when, how long it took
- **Compliance**: Ready for regulatory reporting

### Role-Based Access Control

- **Citizens**: Can only see/edit their own reports
- **Field Staff**: Can only edit assigned tickets
- **Officers**: Full incident visibility and team management
- **Admins**: Complete system access and reporting

## Mobile-First Features

- Hamburger navigation on mobile devices
- Responsive grid layouts (1-4 columns)
- Touch-optimized buttons and inputs
- Auto-collapsing sidebars
- Mobile-sized components
- Tab-based navigation on smaller screens

## Color System

The custom color palette was chosen for uniqueness and accessibility:

```css
Primary (Warm Orange): #FF6B3D (hsl(16, 85%, 58%))
Secondary (Emerald): #20B997 (hsl(145, 65%, 48%))
Background: #F8F5F2 (hsl(60, 30%, 97%))
Foreground: #251C1A (hsl(20, 10%, 15%))
Accents: Gold, Teal, Warm Grays
```

## Performance Optimizations

- Client-side rendering for instant interactivity
- No external API calls (local data)
- Efficient state management with minimal re-renders
- CSS-in-JS optimization with Tailwind
- Mobile viewport optimization
- Touch event handling

## Future Enhancements

- Real-time WebSocket updates
- Backend database integration
- Image upload for incidents
- Advanced mapping with actual map provider
- Email notifications
- SMS alerts for critical incidents
- Two-factor authentication
- Role-based dashboard customization
- Batch operations
- Advanced filtering and search

## Compliance & Auditing

CityPulse is designed with compliance in mind:
- Complete audit trail of all actions
- Exportable reports for regulatory review
- Immutable action logs
- Role-based access control
- Timestamp accuracy on all records
- Field change tracking for data integrity

## Support & Development

The application is built to be easily extensible:
- Well-organized component structure
- Type-safe TypeScript throughout
- Reusable utility functions
- Clear separation of concerns
- Easy to add new roles
- Straightforward data model

## License

This project is licensed under the MIT License.
