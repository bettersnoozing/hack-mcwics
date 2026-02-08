# MCWICS Flask API (backend2)

This backend exposes a set of RESTful API routes for club and recruitment management, powered by Snowflake.

## Setup

1. Create a `.env` file with your Snowflake credentials (see `.env.example`).
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the app:
   ```bash
   source venv/bin/activate
   python app.py
   ```

## API Routes

### Clubs
- `GET /clubs` — List all clubs. Optional filters:
  - `?tag=AI` — filter by tag
  - `?recruiting=true` — filter by recruiting status
  - `?min_members=100` — filter by minimum member count
- `GET /clubs/<slug>` — Get a single club by slug
- `POST /clubs` — Create a new club (JSON body)
- `PUT /clubs/<slug>` — Update a club (JSON body)
- `DELETE /clubs/<slug>` — Delete a club

### Positions
- `GET /positions` — List all positions. Optional filters:
  - `?club_id=1` — filter by club
  - `?is_open=true` — filter by open positions
- `GET /positions/<id>` — Get a single position
- `POST /positions` — Create a new position (JSON body)
- `DELETE /positions/<id>` — Delete a position

### Recruitment View
- `GET /recruitment` — Get joined club/position data

### Search
- `GET /search?q=<query>` — Search clubs and positions by name, tags, description, title, or requirements

### Analytics
- `GET /stats` — Dashboard stats (counts, top clubs, upcoming deadlines)

### Recommendations
- `GET /recommend?interests=AI,Robotics` — Get recommended clubs and positions based on interest tags

### Snowflake Setup/Test
- `GET /snowflake-test` — Test Snowflake connection
- `POST /init-snowflake-app` — Initialize database, tables, mock data, and view
- `GET /create-snowflake-db` — Create database (uses env var or default)

---

For more details, see the code in `app.py`. All routes return JSON responses.
