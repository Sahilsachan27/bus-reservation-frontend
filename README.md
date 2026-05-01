# Online Bus Reservation System

A complete full-stack bus reservation project with:

- Professional responsive frontend
- Express backend API
- SQLite database
- Search by origin, destination, and date
- Live seat map with booked-seat locking
- Passenger booking flow
- Ticket lookup
- Admin dashboard stats
- Render and Docker deployment files

## Run Locally

### Option 1: Run immediately on Windows PowerShell

This machine-friendly runner uses the same frontend and API routes with a local JSON database:

```powershell
.\server.ps1
```

Open:

```text
http://localhost:3000
```

The local database is created automatically at `data/bus_reservation.json`.

### Option 2: Production Node + SQLite

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

The SQLite database is created automatically at `data/bus_reservation.sqlite` and seeded with sample buses and trips.

## API Endpoints

- `GET /api/health`
- `GET /api/locations`
- `GET /api/trips?origin=Delhi&destination=Jaipur&date=YYYY-MM-DD`
- `GET /api/trips/:id/seats`
- `POST /api/bookings`
- `GET /api/bookings/:reference`
- `GET /api/admin/stats`

## Deploy On Render

1. Push this folder to a GitHub repository.
2. Create a new Render Web Service.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Set environment variables if needed:
   - `NODE_VERSION=20`
   - `DATABASE_PATH=/opt/render/project/src/data/bus_reservation.sqlite`

The included `render.yaml` can also be used as a Blueprint.

## Deploy With Docker

```bash
docker build -t bus-reservation-system .
docker run -p 3000:3000 bus-reservation-system
```
