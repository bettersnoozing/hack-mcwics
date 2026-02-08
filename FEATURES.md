# mcwics — Centralized Club Application Portal (Feature List)

## Core Vision
- Centralized application hub for McGill tech clubs (starting with CSUS)
- Turns recruiting from isolated + Instagram-scattered into a collaborative, community-driven experience
- One account system for students and club executives, with role-based access control

---

## Student Experience (Current + Planned)
- **McGill student accounts**
  - Signup/login with McGill email
  - Role: `STUDENT` stored in MongoDB
- **Discover page (Real, DB-backed)**
  - Browse real clubs stored in MongoDB
  - View real open positions (OpenRoles) with deadlines + questions
  - “Recruiting” state derived from whether a club has active roles
- **Applications (Partial / In-progress)**
  - Apply to a role (wires to OpenRole + questions + Application model)
  - View application statuses (planned/next)

---

## Club Executive Admin Portal (Real, DB-backed)
### Executive onboarding + club membership
- **Exec onboarding flow**
  - Create a club OR request to join an existing club
- **Club creation**
  - Creates real `Club` document in MongoDB
  - Creator becomes **superadmin** (club admin leader)
  - Auto-added to the club roster (exec + admin)
- **Join request flow**
  - Execs can request to join an existing club
  - Superadmin can approve/reject join requests
- **Role-based admin access**
  - Approved execs get `CLUB_LEADER` role
  - Secure server-side role assignment (prevents role escalation)

### Club roster + profiles
- Club roster page displays exec cards:
  - Profile photo, name, exec position, short bio
- Exec profile editing (real DB persistence)
  - Execs update their own bio/photo/position
  - Updates reflected on the roster instantly
- Club page editing (approved execs)
  - Update club description + contact fields (email/website)

---

## Recruitment + Applications Management (Real, DB-backed)
### Recruitment posts / open roles
- Create and manage **Open Roles** per club (real MongoDB)
  - Job title, description, deadline, application questions (string list)
- Open roles automatically appear on Discover for students

### Application dashboard (Real, DB-backed)
- Admin dashboard lists submitted applications
- Filter applications by:
  - Role (OpenRole)
  - Status (SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, WITHDRAWN)
- Update application statuses (persisted to MongoDB)

---

## Security + Engineering (Implemented)
- Prevents client-side role escalation (cannot self-assign ADMIN/CLUB_LEADER via API payload)
- Tavi architecture enforced:
  - Thin routes, controllers for logic, Mongoose models as source of truth
- Real database persistence (no mock/demo data)
- Clean, cohesive UI design system applied across pages (cozy pastel + rounded + modern)

---

## Next Features (Planned, not implemented yet)
- Discussion forums (club-wide applicant forum + internal exec review threads)
  - Thread + comment tree architecture (Reddit-style)
- Review threads per application (exec-only)
  - traffic light decisions + star ratings + average score + sorting
- Email outbox workflow
  - Draft/edit/send emails from an outbox (SMTP integration)
- Student dashboard enhancements
  - Individualized application status tracking
  - Anonymized applicant metrics (“34 applied for this role”)
- Interview scheduling
  - Invite-to-interview status + time slot selection + calendar invites
- Cross-club ecosystem layer
  - Customizable forms for any tech club
  - Community graph / peer connections / clustering by interests
  - Club news boards + job boards + announcements
  - Exportable rosters with configurable columns
