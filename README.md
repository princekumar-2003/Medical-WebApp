# 🏥 MediCare Pro — Full-Stack Doctor Appointment Booking

A professional, production-ready doctor appointment booking platform with a **Node.js + Express backend**, **SQLite database**, **JWT authentication**, and a stunning frontend.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16 or higher
- **npm** v8 or higher

### 1. Install & Run

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start the server
npm start
```

The app will be available at: **http://localhost:5000**

### 2. Demo Login
| Field    | Value               |
|----------|---------------------|
| Email    | demo@medicare.com   |
| Password | password123         |

---

## 📁 Project Structure

```
medicare-pro/
├── server/                  # Backend (Node.js + Express)
│   ├── server.js            # Main entry point
│   ├── package.json         # Dependencies
│   ├── .env.example         # Environment config template
│   ├── db/
│   │   └── database.js      # SQLite setup + seeding
│   ├── middleware/
│   │   └── auth.js          # JWT middleware
│   └── routes/
│       ├── auth.js          # Login, register, profile
│       ├── appointments.js  # Full appointment CRUD
│       ├── doctors.js       # Doctor listing + availability
│       └── health.js        # Records, prescriptions, vitals, notifications
│
└── public/                  # Frontend (served as static files)
    ├── index.html           # Main HTML app shell
    ├── css/
    │   └── styles.css       # Complete stylesheet
    └── js/
        ├── api.js           # All API calls
        ├── utils.js         # Shared utilities
        ├── auth.js          # Login/register logic
        ├── app.js           # App shell, dashboard, navigation
        ├── booking.js       # 4-step booking flow
        ├── doctors.js       # Doctors page + modal
        └── pages.js         # Appointments, records, vitals, profile
```

---

## ✨ Features

### 🔐 Authentication
- JWT-based secure login & registration
- bcrypt password hashing
- Protected API routes
- Auto-login on page refresh (token in localStorage)
- Change password from Settings

### 📅 Appointment Booking
- 4-step guided booking flow
- Doctor selection with specialty filters
- Interactive calendar with available dates
- Real-time slot availability check (prevents double-booking)
- Patient details form with pre-fill from profile
- Fee breakdown with GST calculation
- Confirmation with instant notification

### 👨‍⚕️ Doctor Management
- 8 pre-seeded specialist doctors
- Filter by specialty, availability, rating
- Live search by name or specialty
- Doctor profile modal with bio, education, slots
- Quick-book from any doctor card
- Rating system that updates doctor's average

### 📋 Appointment Management
- View upcoming, completed, cancelled appointments
- Cancel upcoming appointments
- Reschedule (cancel + rebook flow)
- Rate completed appointments (1-5 stars + review)
- Ratings update doctor's live average rating

### 🗂️ Medical Records
- Add lab reports, X-rays, doctor's notes, vaccinations
- View all records with type icons
- Delete records
- Download placeholder (ready for file upload integration)

### 💊 Prescriptions
- View active and completed prescriptions
- Request refills (decrements refill count)
- PDF download placeholder
- Auto-notification on refill request

### ❤️ Health Vitals
- Display latest: heart rate, BP, temperature, BMI, SpO₂, glucose
- Log new vitals with timestamp
- History tracking (last 30 entries)

### 🔔 Notifications
- Auto-generated for: bookings, cancellations, refills, welcome
- Unread badge on bell icon
- Mark all as read on panel open
- Delete individual notifications

### 👤 Profile & Settings
- View and edit full personal profile
- Blood group, DOB, gender, address
- Toggle notification preferences
- Change password
- Language/region settings

---

## 🔌 API Reference

### Auth
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | /api/auth/login       | Login              |
| POST   | /api/auth/register    | Register           |
| GET    | /api/auth/me          | Get current user   |
| PUT    | /api/auth/profile     | Update profile     |
| PUT    | /api/auth/change-password | Change password |

### Doctors
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/doctors                    | List all doctors         |
| GET    | /api/doctors/:id                | Get single doctor        |
| GET    | /api/doctors/:id/availability   | Get slot availability    |
| GET    | /api/doctors/specialties/list   | List all specialties     |

### Appointments
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/appointments               | List appointments        |
| GET    | /api/appointments/upcoming      | Get upcoming (dashboard) |
| GET    | /api/appointments/stats         | Dashboard stats          |
| POST   | /api/appointments               | Book appointment         |
| PUT    | /api/appointments/:id/cancel    | Cancel appointment       |
| POST   | /api/appointments/:id/rate      | Rate appointment         |

### Health
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/records                    | List medical records     |
| POST   | /api/records                    | Add record               |
| DELETE | /api/records/:id                | Delete record            |
| GET    | /api/prescriptions              | List prescriptions       |
| POST   | /api/prescriptions/refill/:id   | Request refill           |
| GET    | /api/vitals/latest              | Latest vitals            |
| POST   | /api/vitals                     | Log new vitals           |
| GET    | /api/notifications              | List notifications       |
| PUT    | /api/notifications/read-all     | Mark all read            |

---

## 🛠️ Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Backend    | Node.js, Express.js                |
| Database   | SQLite (via better-sqlite3)        |
| Auth       | JWT (jsonwebtoken) + bcryptjs      |
| Frontend   | Vanilla JS (ES6+), HTML5, CSS3     |
| Fonts      | Cormorant Garamond + DM Sans       |
| HTTP       | Fetch API                          |

---

## 🔒 Security Features
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens expire in 7 days
- All API routes protected with auth middleware
- SQL injection prevented via parameterised queries
- CORS configured for origin control

---

## 🌱 Production Deployment

```bash
# Set environment variables
NODE_ENV=production
JWT_SECRET=your_very_secure_random_secret_here
PORT=5000

# Install production dependencies only
npm install --production

# Start
npm start
```

For production, consider:
- Replacing SQLite with PostgreSQL or MySQL
- Adding rate limiting (express-rate-limit)
- Adding Helmet.js for security headers
- Using PM2 for process management
- Setting up HTTPS with Let's Encrypt

---

## 📝 License
MIT — Free to use and modify.
