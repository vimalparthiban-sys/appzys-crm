# APPZYS Client Acquisition CRM - Backend

Java Spring Boot 3 + MySQL Backend for the APPZYS Client Acquisition CRM.

## Tech Stack
- **Java 17+**
- **Spring Boot 3.2.3** (Web, Data JPA, Validation)
- **MySQL Database**
- **Lombok**
- **Maven**

## Database Setup
1. Start your local MySQL server.
2. The default credentials in `src/main/resources/application.properties` are:
   - Database: `appzys_crm` (created automatically if not present)
   - User: `root`
   - Password: `root` (change as needed in application.properties)
3. Initial tables are created automatically via JPA / `schema.sql`.
4. Sample initial leads, follow-ups, sources, and timeline events are loaded from `data.sql`.

## Running the Application
```bash
# Navigate to backend folder
cd "D:\Client Acquisition CRM\backend"

# Build and run with Maven
mvn spring-boot:run
```
The server starts at `http://localhost:8080`.

## API Endpoints Overview
- `GET /api/dashboard/overview` - Summary cards, pipeline counts, sources donut, follow-up tasks, recent activities
- `GET /api/companies` - List companies with search, status, source, follow-up filters & sorting
- `GET /api/companies/{id}` - Complete company record, sources, timeline, follow-up status
- `POST /api/companies/check-duplicate` - Duplicate detection check by normalized name & URL
- `POST /api/companies` - Create new lead with initial source & optional follow-up
- `PUT /api/companies/{id}` - Update company details
- `PATCH /api/companies/{id}/status` - Update pipeline stage
- `POST /api/companies/{id}/sources` - Attach additional discovery source
- `POST /api/companies/{id}/follow-ups` - Schedule / reschedule follow-up
- `PATCH /api/companies/{id}/follow-ups/{fId}/complete` - Mark follow-up as completed
- `POST /api/companies/{id}/activities` - Log manual outreach activity (Call, Email, Meeting, etc.)
- `GET /api/settings/sources` - List reusable discovery platforms
- `POST /api/settings/sources` - Add new custom source
