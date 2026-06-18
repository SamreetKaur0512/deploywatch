# 🚀 DeployWatch

A full-stack MERN SaaS platform to monitor your deployed projects, track who views them, and get real-time notifications.

---

## 📁 Project Structure

```
DeployWatch/
├── backend/     ← Node.js + Express + MongoDB + Socket.io
└── frontend/    ← React.js (Vite) + Recharts + Socket.io client
```

---

## ⚙️ Setup & Run (Step by Step)

### Step 1 — Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/deploywatch
JWT_SECRET=any_long_random_string_change_this
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

> 💡 Free MongoDB: https://www.mongodb.com/atlas → Create free M0 cluster → Get connection string

```bash
npm run dev
# Server runs at http://localhost:5000
```

---

### Step 2 — Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Open `.env` and fill in:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

```bash
npm run dev
# App runs at http://localhost:5173
```

---

## 🌐 Deployment

### Backend → Render (Free)
1. Push `/backend` to GitHub
2. Go to render.com → New Web Service
3. Connect repo, set **Build Command**: `npm install`, **Start Command**: `node src/server.js`
4. Add all environment variables from `.env`
5. Deploy → copy your backend URL

### Frontend → Vercel (Free)
1. Push `/frontend` to GitHub
2. Go to vercel.com → New Project → Import repo
3. Add environment variables:
   - `VITE_API_URL` = `https://your-backend.render.com/api`
   - `VITE_SOCKET_URL` = `https://your-backend.render.com`
4. Deploy!

---

## 📡 API Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/me` | GET | Yes | Current user |
| `/api/auth/update-profile` | PUT | Yes | Update name/avatar |
| `/api/auth/change-password` | PUT | Yes | Change password |
| `/api/projects` | GET/POST | Yes | List / Add projects |
| `/api/projects/:id` | GET/PUT/DELETE | Yes | Single project |
| `/api/projects/:id/ping` | POST | Yes | Manual ping |
| `/api/projects/:id/analytics` | GET | Yes | Project analytics |
| `/api/analytics/track` | POST | No | Track a view (public) |
| `/api/analytics/dashboard` | GET | Yes | Dashboard stats |
| `/api/analytics/views` | GET | Yes | Paginated views |
| `/api/analytics/rankings` | GET | Yes | Projects by views |
| `/api/notifications` | GET | Yes | Get notifications |
| `/api/notifications/read-all` | PUT | Yes | Mark all read |
| `/api/notifications/delete-all` | DELETE | Yes | Clear all |
| `/api/notifications/:id/read` | PUT | Yes | Mark one read |
| `/api/notifications/:id` | DELETE | Yes | Delete one |
| `/api/admin/stats` | GET | Admin | Platform stats |
| `/api/admin/users` | GET | Admin | All users |
| `/api/admin/users/:id` | GET/PUT/DELETE | Admin | Manage user |

---

## 🔌 Tracking Script

Add this to any deployed project to track views in DeployWatch.

### Universal install (recommended)

Use only the hosted DeployWatch tracking script from Settings. Replace `YOUR_TRACKING_ID_HERE` with your actual project tracking ID:

```html
<script src="https://your-backend.render.com/tracking.js" data-tracking-id="YOUR_TRACKING_ID_HERE" async></script>
```

This single script is enough for plain HTML sites and server-rendered apps.

### React / SPA integration

If your project is a React single-page app, add the script tag to your top-level HTML file and, if you use client-side routing, call `window.deployWatchTrackView()` after internal route changes:

```html
<script src="https://your-backend.render.com/tracking.js" data-tracking-id="YOUR_TRACKING_ID_HERE" async></script>
```

If you want to capture additional page views in the same SPA session, call:

```js
window.deployWatchTrackView();
```


If your app uses React Router or another client-side router, send tracking on route changes as well so views register without a full browser refresh.

```jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();

  useEffect(() => {
    fetch('https://your-backend.render.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: 'dw_YOUR_PROJECT_ID',
        referrer: document.referrer,
        utmSource: new URLSearchParams(window.location.search).get('ref') || ''
      })
    }).catch(() => {});
  }, [location.pathname]);

  return <YourApp />;
}
```

- Every call to `/api/analytics/track` adds one total view to the project.
- If the visitor has never been recorded for that project before, it also adds one unique view.
- Calling tracking after a user logs in or on first visit counts as a valid view event.

If you see `Cannot read properties of null (reading 'useEffect')`, it means `useEffect` was not imported from React.

> Get your `trackingId` from the Projects page on your dashboard.

💡 **Recruiter Tip:** Use `https://your-project.vercel.app?ref=linkedin` on your resume.
When someone clicks it, you get a special "Recruiter Visit" notification!

---

## � Developer Integration Guides

Detailed step-by-step instructions for adding DeployWatch tracking to your project, including view tracking, visitor data, and user management.

### What DeployWatch automatically collects on each view:
- ✅ **Timestamp** (`viewedAt`)
- ✅ **Device** (Mobile, Tablet, Desktop)
- ✅ **Browser** (Chrome, Firefox, Safari, Edge, etc.)
- ✅ **Country & City** (from IP address)
- ✅ **Referrer URL** (where visitor came from)
- ✅ **UTM source** (query params like `?ref=linkedin`)
- ✅ **Visitor name & email** (optional, if you send it)
- ✅ **Unique visitor detection** (first-time IP gets marked unique)

---

### React / Next.js — Complete Setup

**Step 1: Add tracking on initial load**
```jsx
// In App.jsx or _app.js
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    fetch('https://your-backend.render.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: 'dw_YOUR_PROJECT_ID', // Get this from Projects page
        referrer: document.referrer,
        utmSource: new URLSearchParams(window.location.search).get('ref') || ''
      })
    }).catch(() => {});
  }, []); // Runs once on app load

  return <YourApp />;
}
```

**Step 2: Add tracking on every route change (important for SPAs!)**
```jsx
// In App.jsx with React Router
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();

  useEffect(() => {
    fetch('https://your-backend.render.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: 'dw_YOUR_PROJECT_ID',
        referrer: document.referrer,
        utmSource: new URLSearchParams(window.location.search).get('ref') || ''
      })
    }).catch(() => {});
  }, [location.pathname]); // Runs every time route changes

  return <YourApp />;
}
```

**Step 3: Track visitor name & email after login**
```jsx
// After successful login/register
const trackUserLogin = (user) => {
  fetch('https://your-backend.render.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: 'dw_YOUR_PROJECT_ID',
      utmSource: 'login', // Mark this as a login event
      visitorName: user.name || '',
      visitorEmail: user.email || ''
    })
  }).catch(() => {});
};

// Call after login:
// trackUserLogin({ name: 'John Doe', email: 'john@example.com' });
```

**Step 4: Connect user database for management (MongoDB example)**
1. Go to your DeployWatch dashboard → Projects page
2. Click **🔒 Creds** on your project
3. Select **MongoDB**
4. Enter your MongoDB connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/yourdb
   ```
5. Enter collection name: `users` (or whatever you named it)
6. Click **Save**
7. Click **Users** button to see/manage all users

---

### Vue / Nuxt — Complete Setup

**Step 1: Add tracking on mount**
```vue
<!-- In App.vue -->
<script>
export default {
  mounted() {
    fetch('https://your-backend.render.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: 'dw_YOUR_PROJECT_ID',
        referrer: document.referrer,
        utmSource: new URLSearchParams(window.location.search).get('ref') || ''
      })
    }).catch(() => {});
  }
}
</script>
```

**Step 2: Add tracking on route changes (Nuxt)**
```js
// In nuxt.config.js or middleware
export default {
  router: {
    middleware: ['trackingMiddleware']
  }
}

// In middleware/trackingMiddleware.js
export default function ({ route }) {
  fetch('https://your-backend.render.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: 'dw_YOUR_PROJECT_ID',
      referrer: document.referrer,
      utmSource: new URLSearchParams(window.location.search).get('ref') || ''
    })
  }).catch(() => {});
}
```

**Step 3: Track user on login**
```vue
<script>
export default {
  methods: {
    async handleLogin(user) {
      // Your login logic...
      
      // Track the login
      await fetch('https://your-backend.render.com/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId: 'dw_YOUR_PROJECT_ID',
          utmSource: 'login',
          visitorName: user.name,
          visitorEmail: user.email
        })
      });
    }
  }
}
</script>
```

---

### Angular — Complete Setup

**Step 1: Add tracking in ngOnInit**
```typescript
// In app.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  ngOnInit() {
    this.trackView();
  }

  trackView() {
    const data = {
      trackingId: 'dw_YOUR_PROJECT_ID',
      referrer: document.referrer,
      utmSource: new URLSearchParams(window.location.search).get('ref') || ''
    };

    fetch('https://your-backend.render.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  }
}
```

**Step 2: Add tracking on route changes**
```typescript
// In app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.trackView();
      }
    });
  }

  trackView() {
    const data = {
      trackingId: 'dw_YOUR_PROJECT_ID',
      referrer: document.referrer,
      utmSource: new URLSearchParams(window.location.search).get('ref') || ''
    };

    fetch('https://your-backend.render.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  }
}
```

**Step 3: Track user login**
```typescript
trackUserLogin(user: any) {
  fetch('https://your-backend.render.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: 'dw_YOUR_PROJECT_ID',
      utmSource: 'login',
      visitorName: user.name || '',
      visitorEmail: user.email || ''
    })
  }).catch(() => {});
}
```

---

### PHP / Laravel — Complete Setup

**Step 1: Create a helper function**
```php
<?php
// In app/Helpers/DeployWatchHelper.php (or similar)

function trackDeployWatch($visitorName = '', $visitorEmail = '') {
    $trackingId = 'dw_YOUR_PROJECT_ID'; // Get from DeployWatch dashboard
    $backendUrl = 'https://your-backend.render.com';

    $data = [
        'trackingId'   => $trackingId,
        'referrer'     => $_SERVER['HTTP_REFERER'] ?? '',
        'utmSource'    => $_GET['ref'] ?? '',
        'visitorName'  => $visitorName,
        'visitorEmail' => $visitorEmail
    ];

    $ch = curl_init($backendUrl . '/api/analytics/track');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}
?>
```

**Step 2: Call tracking on page load**
```php
<?php
// In your base controller or layout
require_once 'app/Helpers/DeployWatchHelper.php';

// Call on every page load
trackDeployWatch();
?>
```

**Step 3: Track user login**
```php
<?php
// After successful login
$user = Auth::user();

trackDeployWatch($user->name, $user->email);
?>
```

**Step 4: Connect database for user management**
1. Go to DeployWatch dashboard → Projects page
2. Click **🔒 Creds**
3. Select **MySQL** or **PostgreSQL**
4. Enter connection details:
   ```
   Host: your-db-host.com
   Port: 3306
   Username: root
   Password: your_password
   Database: your_db_name
   ```
5. Enter table name: `users`
6. Click **Save** → **Users** to manage

---

### Python / Django — Complete Setup

**Step 1: Create tracking function**
```python
# In your Django app, create utils.py
import requests
import threading
from django.conf import settings

def track_view(request, visitor_name='', visitor_email=''):
    """Track a view asynchronously"""
    
    def send_tracking():
        try:
            requests.post(
                'https://your-backend.render.com/api/analytics/track',
                json={
                    'trackingId': 'dw_YOUR_PROJECT_ID',
                    'referrer': request.META.get('HTTP_REFERER', ''),
                    'utmSource': request.GET.get('ref', ''),
                    'visitorName': visitor_name,
                    'visitorEmail': visitor_email
                },
                timeout=2
            )
        except Exception as e:
            pass  # Silently fail
    
    # Send in background thread (non-blocking)
    thread = threading.Thread(target=send_tracking)
    thread.daemon = True
    thread.start()
```

**Step 2: Add middleware to track on every request**
```python
# In settings.py, add to MIDDLEWARE
MIDDLEWARE = [
    # ... other middleware
    'your_app.middleware.DeployWatchMiddleware',
]

# In your_app/middleware.py
from .utils import track_view

class DeployWatchMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        track_view(request)  # Track before response
        response = self.get_response(request)
        return response
```

**Step 3: Track user login**
```python
# In your login view
from django.contrib.auth import authenticate, login
from your_app.utils import track_view

def login_view(request):
    if request.method == 'POST':
        user = authenticate(username=request.POST['username'], password=request.POST['password'])
        if user:
            login(request, user)
            track_view(request, visitor_name=user.first_name, visitor_email=user.email)
            return redirect('dashboard')
    return render(request, 'login.html')
```

**Step 4: Connect MySQL/PostgreSQL database**
1. Go to DeployWatch → Projects page
2. Click **🔒 Creds**
3. Select **MySQL** or **PostgreSQL**
4. Enter credentials
5. Enter table name: `auth_user` (default Django) or your custom table
6. Click **Save** → **Users**

---

### Node.js / Express — Complete Setup

**Step 1: Create tracking middleware**
```javascript
// In middleware/deploywatch.js
const fetch = require('node-fetch');

const trackDeployWatch = async (req, res, next) => {
  const trackingId = 'dw_YOUR_PROJECT_ID';
  const backendUrl = 'https://your-backend.render.com';
  
  const visitorName = req.user?.name || '';
  const visitorEmail = req.user?.email || '';

  try {
    fetch(`${backendUrl}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: trackingId,
        referrer: req.headers.referer || '',
        utmSource: req.query.ref || '',
        visitorName: visitorName,
        visitorEmail: visitorEmail
      })
    }).catch(() => {}); // Fire and forget
  } catch (e) {}

  next();
};

module.exports = trackDeployWatch;
```

**Step 2: Add middleware to Express app**
```javascript
// In app.js or server.js
const trackDeployWatch = require('./middleware/deploywatch');

app.use(trackDeployWatch); // Add on every request
```

**Step 3: Track user login explicitly**
```javascript
app.post('/login', async (req, res) => {
  // Your login logic...
  const user = await User.findOne({ email: req.body.email });

  if (user) {
    // Track the login
    fetch('https://your-backend.render.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: 'dw_YOUR_PROJECT_ID',
        utmSource: 'login',
        visitorName: user.name,
        visitorEmail: user.email
      })
    }).catch(() => {});

    req.login(user, (err) => {
      res.json({ success: true });
    });
  }
});
```

**Step 4: Connect MongoDB**
1. Go to DeployWatch → Projects page
2. Click **🔒 Creds**
3. Select **MongoDB**
4. Enter connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/yourdb
   ```
5. Enter collection name: `users`
6. Click **Save** → **Users**

---

### HTML / Vanilla JS — Complete Setup

**Step 1: Add to index.html before </body>**
```html
<script>
(function() {
  const trackingId = 'dw_YOUR_PROJECT_ID';
  const backendUrl = 'https://your-backend.render.com';

  function trackView(visitorName = '', visitorEmail = '') {
    fetch(backendUrl + '/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: trackingId,
        referrer: document.referrer,
        utmSource: new URLSearchParams(window.location.search).get('ref') || '',
        visitorName: visitorName,
        visitorEmail: visitorEmail
      })
    }).catch(function(){});
  }

  // Track on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackView);
  } else {
    trackView();
  }

  // Expose function for login tracking
  window.trackUserLogin = function(name, email) {
    trackView(name, email);
  };
})();
</script>
```

**Step 2: Track user login**
```html
<script>
function handleLogin(user) {
  // Your login logic...
  
  // Then call tracking
  window.trackUserLogin(user.name, user.email);
}
</script>
```

---

## 📊 What You'll See in DeployWatch Analytics

After integrating tracking:

**Dashboard shows:**
- Total Views (every tracking call)
- Unique Visitors (first-time IPs only)
- Views Today, This Week, by Month
- Device breakdown (Mobile, Tablet, Desktop)
- Browser breakdown (Chrome, Firefox, Safari, etc.)
- Country distribution (top 10)
- Recruiter visits (UTM sources like `?ref=linkedin`)

**Analytics page shows each visit with:**
- Visitor name & email (if tracked)
- Location (country, city)
- Device & browser
- Referrer URL
- Timestamp (exactly when visited)
- Whether it was a unique visitor

**User Management shows:**
- All users from your project's database
- Name, email, role, created date, last login
- Edit, block, or delete any user

---

## ⚠️ Common Integration Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read properties of null (reading 'useEffect')` | Missing import | Add `import { useEffect } from 'react';` to top of file |
| Views not increasing | Tracking not called on route changes | Add dependency array: `useEffect(() => {...}, [location.pathname])` |
| Visitor name/email empty | Not passed to tracking call | Pass user object: `visitorName: user?.name \|\| ''` |
| Database credentials not saved | Encryption error | Make sure connection string is correct, test connection first |
| User management shows "No users" | Wrong collection/table name | Click 🔒 Creds and verify collection name matches your DB |

---

## �🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React.js (Vite), React Router, Recharts, Socket.io client, Lucide icons |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Real-time | Socket.io |
| Scheduling | node-cron (auto ping every 10 min) |
| Geo | geoip-lite (country/city from IP) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 🧑‍💻 Features

- ✅ Public landing page
- ✅ JWT Auth (Register / Login / Change password)
- ✅ Add projects from any platform (Vercel, Render, Netlify, etc.)
- ✅ Auto URL ping every 10 minutes (cron job)
- ✅ Manual ping button on each project
- ✅ View tracking with country, city, device, browser
- ✅ Recruiter detection via UTM tags
- ✅ Real-time Socket.io notifications
- ✅ Notification bell with unread count
- ✅ Mark read / delete notifications
- ✅ Analytics dashboard with charts
- ✅ Project rankings by views
- ✅ Admin panel — manage all users
- ✅ Settings — profile, password, tracking snippet
- ✅ Error log tracking on failed pings

---

## 🔐 Part 6 — Encrypted Credentials & User Management

### How Encryption Works
- All credentials (MongoDB URI, GitHub/Vercel tokens) are encrypted **in your browser** using AES-256-GCM (Web Crypto API)
- DeployWatch servers only store **encrypted ciphertext** — never plain text
- Even DeployWatch owner cannot read your MongoDB URI or tokens

### What DeployWatch CAN see about you:
- ✅ Your name & email
- ✅ Your project names & live URLs
- ✅ View counts & project status (public info)

### What DeployWatch CANNOT see:
- ❌ Your MongoDB URI or database password
- ❌ Your GitHub/Vercel tokens
- ❌ Your project users' passwords
- ❌ Any secret credentials

### Project User Management
1. Go to **Projects** page
2. Click **🔒 Creds** on any project
3. Add your MongoDB URI (encrypted in browser before sending)
4. Set collection name (default: "users")
5. Click **Users** button → manage your project's users

### User Management Features
- 👁️ View all users (passwords always hidden)
- ✏️ Edit name & role
- 🚫 Block / ✅ Unblock users
- 🗑️ Delete users
- 🔍 Search by name or email

### New API Endpoints (Part 6)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/projects/:id/credentials` | PUT | Save encrypted credentials |
| `/api/projects/:id/credentials` | GET | Get encrypted credentials |
| `/api/projects/:id/credentials` | DELETE | Remove credentials |
| `/api/projects/:id/users/fetch` | POST | Fetch project users |
| `/api/projects/:id/users/:uid/update` | POST | Update user |
| `/api/projects/:id/users/:uid/block` | POST | Block/unblock user |
| `/api/projects/:id/users/:uid/delete` | POST | Delete user |
