# Backend Dev Notes

## How to verify club creation in Compass

1. Open MongoDB Compass and connect to your local instance (default: `mongodb://localhost:27017`).
2. Select the database listed in your `.env` as `MONGO_DB_NAME` (default: `hack-mcwics`).
3. Look for the **clubs** collection.
4. After creating a club through the Exec Onboarding UI:
   - A new document should appear in `clubs` with `name`, `admins`, `execs`, etc.
   - The `admins[0]` and `execs[0]` should match the creating user's `_id`.
5. Cross-check: In the **users** collection, find the user who created the club:
   - `adminClub` should be an ObjectId matching the club's `_id`.
   - `roles` should include `"CLUB_LEADER"`.
6. You can also verify via API:
   - `GET /clubs` — lists all clubs.
   - `GET /clubs/:clubId` (auth required) — returns a single club document.

## Debugging club creation

The `createClub` controller logs to stdout:
- `Created club <id>` — after `club.save()` succeeds.
- `Updated user adminClub -> <id>` — after the user document is updated.

If neither log appears, check the server console for `createClub error:` which will contain the full error.
