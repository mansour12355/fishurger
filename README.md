# Fish Burger Essaouira - Backend System

A complete full-stack restaurant website with Express.js backend for order management and analytics.

## Features

- 🍔 **Order Management** - Complete order processing system
- 📊 **Analytics Dashboard** - Track sales, popular items, and trends
- 📍 **Location-Based** - Support for multiple restaurant locations (Rooftop, Medina, Casa)
- 🎨 **Modern UI** - Beautiful, responsive frontend with Tailwind CSS
- 🤖 **AI Chef** - Gemini-powered menu recommendations
- 📱 **Mobile Friendly** - Fully responsive design

## Tech Stack

### Backend
- Node.js
- Express.js
- JSON file-based storage (easily upgradable to MongoDB/PostgreSQL)

### Frontend
- HTML5, CSS3, JavaScript
- Tailwind CSS
- Lenis Smooth Scroll
- Font Awesome Icons

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd "c:\Users\useer\Desktop\final websites\fish burger"
   ```

2. **Navigate to the backend folder**
   ```bash
   cd backend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the backend server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open the website**
   - Navigate back to the root folder, then to frontend
   - Open `frontend/location-select.html` in your browser
   - Or use a local server (e.g., Live Server extension in VS Code) from the frontend folder

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Health Check
```http
GET /api/health
```
Returns server status.

#### Create Order
```http
POST /api/orders
```
**Body:**
```json
{
  "items": [
    {
      "name": "Crispy Fish Burger",
      "price": 95,
      "priceStr": "95 DH"
    }
  ],
  "total": 95,
  "customer": {
    "name": "John Doe",
    "address": "123 Main St"
  },
  "location": "rooftop"
}
```

#### Get All Orders
```http
GET /api/orders?location=rooftop&status=pending&limit=10
```
Query parameters (all optional):
- `location` - Filter by location (rooftop, medina, casa)
- `status` - Filter by status (pending, preparing, ready, completed)
- `limit` - Limit number of results

#### Get Specific Order
```http
GET /api/orders/:id
```

#### Update Order Status
```http
PATCH /api/orders/:id/status
```
**Body:**
```json
{
  "status": "preparing"
}
```
Valid statuses: `pending`, `preparing`, `ready`, `completed`, `cancelled`

#### Get Analytics
```http
GET /api/analytics
```
Returns complete analytics data including total orders, revenue, and trends.

#### Get Popular Items
```http
GET /api/analytics/popular-items
```
Returns menu items sorted by popularity.

## Project Structure

```
fish burger/
├── backend/
│   ├── server.js          # Express backend server
│   ├── package.json       # Node.js dependencies
│   ├── node_modules/      # Installed packages
│   ├── data/
│   │   ├── orders.json    # Orders database
│   │   └── analytics.json # Analytics data
│   └── .gitignore         # Backend git ignore
├── frontend/
│   ├── index.html         # Main website
│   ├── location-select.html # Location selection page
│   ├── img/               # Images
│   ├── video/             # Videos
│   └── firebase.js        # (Legacy - can be removed)
├── .gitignore             # Root git ignore
└── README.md              # This file
```

## Data Storage

The backend uses JSON files for data storage:

### orders.json
Stores all customer orders with:
- Unique order ID
- Items ordered
- Customer information
- Location
- Status
- Timestamp

### analytics.json
Tracks:
- Total orders and revenue
- Popular menu items
- Orders by location
- Daily order trends

## Development

### Running in Development Mode
```bash
cd backend
npm run dev
```
This uses nodemon to automatically restart the server when files change.

### Testing the API

You can test the API using:
- **Browser** - For GET requests
- **Postman** - For all request types
- **curl** - Command line testing

Example curl command:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"name": "Fish Burger", "price": 90}],
    "total": 90,
    "customer": {"name": "Test", "address": "Pickup"},
    "location": "medina"
  }'
```

## Deployment

### Backend Deployment
The backend can be deployed to:
- Heroku
- Vercel
- Railway
- DigitalOcean
- AWS

Update the `API_URL` in `index.html` to point to your deployed backend.

### Frontend Deployment
The frontend can be hosted on:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

## Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] User authentication
- [ ] Real-time order updates (WebSockets)
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Payment integration
- [ ] Inventory management

## License

ISC

## Support

For issues or questions, please contact the development team.
