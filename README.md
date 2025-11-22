# Bisrat Travel Agency - Backend API

## Overview
RESTful API for managing travel agency appointments built with Express.js and MongoDB.

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

## Installation

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Configure environment variables**
Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/bs_travel_agency
PORT=3000
NODE_ENV=development
```

3. **Start MongoDB**
Make sure MongoDB is running locally:
```bash
# For Windows (if MongoDB is installed)
net start MongoDB

# For macOS/Linux
sudo systemctl start mongod
```

4. **Start the server**
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Base URL
`http://localhost:3000`

### Health Check
- **GET** `/health` - Check server and database status

### Appointments

#### Create Appointment (Customer-facing)
- **POST** `/appointments`
- **Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "serviceType": "consultation",
  "appointmentAt": "2025-11-25T10:00:00.000Z",
  "notes": "Need visa assistance for Europe",
  "location": "office",
  "source": "website"
}
```
- **Response:** `201 Created`
```json
{
  "message": "Appointment request submitted successfully",
  "appointment": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "appointmentAt": "2025-11-25T10:00:00.000Z",
    "serviceType": "consultation",
    "status": "scheduled"
  }
}
```

#### Get All Appointments (Admin)
- **GET** `/appointments/all`
- **Query Parameters:**
  - `status` - Filter by status (scheduled, confirmed, completed, cancelled, no-show)
  - `from` - Start date (ISO format)
  - `to` - End date (ISO format)
  - `limit` - Maximum results (default: 100)
- **Example:** `/appointments/all?status=confirmed&limit=50`

#### Get Upcoming Appointments (Admin)
- **GET** `/appointments/upcoming`
- **Query Parameters:**
  - `days` - Number of days ahead (default: 7)
  - `limit` - Maximum results (default: 20)
- **Example:** `/appointments/upcoming?days=14`

#### Get Single Appointment
- **GET** `/appointments/:id`
- **Response:** `200 OK`

#### Update Appointment (Admin)
- **PUT** `/appointments/:id`
- **Body:**
```json
{
  "status": "confirmed",
  "notes": "Updated notes",
  "appointmentAt": "2025-11-26T14:00:00.000Z"
}
```

#### Delete Appointment (Admin)
- **DELETE** `/appointments/:id`
- **Response:** `200 OK`

#### Get Appointment Statistics (Admin Dashboard)
- **GET** `/appointments/stats/summary`
- **Response:**
```json
{
  "total": 150,
  "today": 5,
  "upcomingWeek": 23,
  "byStatus": {
    "scheduled": 45,
    "confirmed": 67,
    "completed": 30,
    "cancelled": 8
  }
}
```

## Service Types
- `consultation` - General consultation
- `flight-booking` - Flight booking service
- `hotel-booking` - Hotel reservation
- `visa-assistance` - Visa application help
- `group-booking` - Group travel arrangements
- `other` - Other services

## Appointment Statuses
- `scheduled` - Initial status when customer books
- `confirmed` - Admin confirmed the appointment
- `completed` - Appointment has been completed
- `cancelled` - Appointment was cancelled
- `no-show` - Customer didn't show up

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 404 Not Found
```json
{
  "error": "Appointment not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Testing

### Using cURL

**Create appointment:**
```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "serviceType": "visa-assistance",
    "appointmentAt": "2025-11-25T14:00:00Z",
    "notes": "Need help with visa application"
  }'
```

**Get all appointments:**
```bash
curl http://localhost:3000/appointments/all
```

**Get appointment stats:**
```bash
curl http://localhost:3000/appointments/stats/summary
```

## CORS Configuration
The server accepts requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000`
- `http://127.0.0.1:5173`

## Development

### File Structure
```
backend/
├── index.js                 # Main server file
├── package.json            # Dependencies
├── .env                    # Environment variables
├── database/
│   └── database.js         # MongoDB connection
├── models/
│   ├── appointment.js      # Appointment schema
│   └── user.js            # User schema
└── routes/
    └── appointmentRoutes.js # Appointment endpoints
```

### Adding New Routes
1. Create route file in `/routes`
2. Import in `index.js`
3. Mount with `app.use()`

### Database Connection
The app connects to MongoDB on startup. Connection status is logged to console.

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check MONGODB_URI in `.env`
- Verify network connectivity

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <process_id> /F
```

### CORS Errors
- Add your frontend URL to the CORS origin array in `index.js`
- Clear browser cache and restart dev server

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use MongoDB Atlas for database
3. Set up proper environment variables
4. Use PM2 or similar for process management:
```bash
npm install -g pm2
pm2 start index.js --name "travel-agency-api"
```

## Support
For issues or questions, contact the development team.
