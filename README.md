# DaddyLnk

Cut the noise. Keep the link.

A professional URL shortening service with advanced features including analytics, QR code generation, caching, and rate limiting.

## Features

- URL shortening with auto-generated or custom aliases
- QR code generation (PNG/SVG formats)
- Advanced analytics tracking (clicks, devices, browsers, referrers)
- Redis caching for improved performance
- Rate limiting to prevent abuse
- Batch URL creation
- Custom domains support
- URL expiration
- Tag-based organization
- RESTful API design

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- Redis (ioredis)
- QR Code generation
- Rate limiting with Redis store
- Security with Helmet
- CORS support

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Redis (optional but recommended)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/unknown07ps/URL-shortner.git
cd URL-shortner
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/daddylnk
BASE_URL=http://localhost:3000

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

NODE_ENV=development
```

4. Start MongoDB and Redis services

5. Run the application:
```bash
npm run dev

npm start
```

## API Endpoints

### Create Short URL
```
POST /api/urls
Content-Type: application/json

{
  "originalUrl": "https://example.com",
  "customAlias": "my-link",
  "generateQR": true,
  "customDomain": "example.com",
  "expiresIn": 24,
  "tags": ["marketing", "campaign"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "shortUrl": "http://localhost:3000/abc123",
    "originalUrl": "https://example.com",
    "qrCode": "data:image/png;base64,...",
    "expiresAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Redirect to Original URL
```
GET /:shortCode
```
Redirects to the original URL and records analytics.

### Get URL Analytics
```
GET /api/urls/:shortCode/analytics?days=7
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://example.com",
    "totalClicks": 150,
    "clicksByDate": [...],
    "topBrowsers": [...],
    "topDevices": [...],
    "topReferrers": [...],
    "topCountries": [...]
  }
}
```

### Get URL Statistics
```
GET /api/v1/url/:shortCode/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://example.com",
    "clicks": 150,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastVisited": "2024-01-02T00:00:00.000Z"
  }
}
```

### Generate QR Code
```
GET /api/urls/:shortCode/qr?format=png&download=true
```

Formats: `png` (default) or `svg`

### Batch Create URLs
```
POST /api/urls/batch
Content-Type: application/json

{
  "urls": [
    {
      "originalUrl": "https://example1.com",
      "customAlias": "link1",
      "tags": ["test"]
    },
    {
      "originalUrl": "https://example2.com",
      "tags": ["test"]
    }
  ]
}
```

### Get All URLs
```
GET /api/urls?page=1&limit=20&sortBy=createdAt&order=desc&search=example&tag=marketing
```

**Response:**
```json
{
  "success": true,
  "data": {
    "urls": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUrls": 100,
      "limit": 20
    },
    "overview": {
      "totalUrls": 100,
      "totalClicks": 5000,
      "activeUrls": 95,
      "avgClicksPerUrl": "50.00"
    }
  }
}
```

### Update URL
```
PUT /api/urls/:shortCode
Content-Type: application/json

{
  "tags": ["updated", "marketing"],
  "customDomain": "newdomain.com"
}
```

### Delete URL
```
DELETE /api/urls/:shortCode
DELETE /api/v1/url/:shortCode
```

**Response:**
```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345.67
}
```

## Rate Limiting

The API implements the following rate limits:

- General API: 100 requests per 15 minutes
- URL Creation: 5 requests per minute
- Batch Creation: 2 requests per 5 minutes
- QR Generation: 10 requests per minute

## Analytics Tracking

The service automatically tracks:

- Total clicks
- Click timestamps
- IP addresses
- User agents (device, browser, OS)
- Referrers
- Geographic location (requires GeoIP service)

## Testing

Use the included `test.html` file to test all endpoints in your browser:

```bash
open test.html
```

Or test Redis connection:
```bash
npm run test:redis
```

## Project Structure

```
url-shortner/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── controllers/
│   │   └── urlController.js
│   ├── models/
│   │   └── url.js
│   ├── routes/
│   │   ├── url.js
│   │   ├── urlRoutes.js
│   │   └── redirectRoute.js
│   ├── services/
│   │   ├── cacheService.js
│   │   ├── counterService.js
│   │   ├── qrService.js
│   │   └── analyticsService.js
│   ├── middlewares/
│   │   └── rateLimiter.js
│   └── utils/
│       └── base62.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `MONGO_URI`: MongoDB connection string
- `BASE_URL`: Base URL for shortened links
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (if required)
- `NODE_ENV`: Environment (development/production)
- `ALLOWED_ORIGINS`: CORS allowed origins

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 409: Conflict (duplicate alias)
- 410: Gone (expired URL)
- 429: Too Many Requests
- 500: Internal Server Error

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- URL sanitization
- Redis-based session storage

## Performance Optimization

- Redis caching for frequently accessed URLs
- Database indexing
- Connection pooling
- Graceful shutdown handling

## Deployment

### Railway Deployment

See [Railway_DEPLOYMENT.md](Railway_DEPLOYMENT.md) for detailed Railway deployment instructions.

Quick setup:
1. Set environment variables for production
2. Ensure MongoDB and Redis are accessible
3. Update `BASE_URL` to your domain
4. Start the application:
```bash
NODE_ENV=production npm start
```

## Brand Identity

**DaddyLnk** - Cut the noise. Keep the link.

A modern, professional URL shortener that simplifies link sharing while providing powerful analytics and customization options.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Author

GitHub: unknown07ps

## Support

For issues and questions, please open an issue on GitHub.