import { useState } from 'react';
import { X, Copy, Check, BookOpen, Code, Database, Zap, Users } from 'lucide-react';
import './SetupGuideModal.css';

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const STEPS = ['Track Views', 'Ping Status', 'Track Logins', 'Manage Users'];

// 🎯 ਹਰ ਇੱਕ ਲੈਂਗੁਏਜ ਲਈ ਬਿਲਕੁਲ ਆਜ਼ਾਦ, ਪੂਰਾ ਅਤੇ ਕਲੀਅਰ ਕੋਡ ਪੇਲੋਡ
const buildLoginTrackingSamples = (trackingId) => ({
  react: `// 📂 PASTE THIS: Inside your Login/Register Form Submit Handler (Frontend React/Vue)
// 🔍 WHERE TO FIND VARIABLES: Look at your login API response object (e.g., res.data.user)

const handleLoginSuccess = async (email, password) => {
  const res = await authAPI.login({ email, password });
  
  if (res.data.success) {
    const currentUser = res.data.user; // Your logged-in user object

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    fetch('https://deploywatch.onrender.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: '${trackingId}',
        utmSource: 'login',
        // ⚠️ BEFORE PASTING: Change 'currentUser.username/email' to match your API response fields
        visitorName: currentUser?.username || currentUser?.name || 'Anonymous User',
        visitorEmail: currentUser?.email || 'no-email@deploywatch.com'
      })
    }).catch(() => {});
    
    // Your existing login navigation/state logic...
  }
};`,

  html: `<script>
function onLoginSuccess(userObject) {
  // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
  fetch('https://deploywatch.onrender.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: '${trackingId}',
      utmSource: 'login',
      // ⚠️ BEFORE PASTING: Map these to your form input values or JavaScript user object fields
      visitorName: userObject.name || document.getElementById('username').value || 'Guest',
      visitorEmail: userObject.email || document.getElementById('email').value || ''
    })
  }).catch(() => {});
}
</script>`,

  node: `// 📂 PASTE THIS: Inside your Backend Login Controller (authController.js / route handler)
// 🔍 WHERE TO FIND VARIABLES: From the user object fetched from MongoDB/SQL database after password matches

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const dbUser = await User.findOne({ email });

  if (dbUser && (await dbUser.matchPassword(password))) {
    
    // 🚀 COPY & PASTE THIS TRACKING CODE HERE (Before sending response):
    await fetch('https://deploywatch.onrender.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: '${trackingId}',
        utmSource: 'login',
        // ⚠️ BEFORE PASTING: Change 'dbUser.name/email' to match your Database Schema columns
        visitorName: dbUser.name || dbUser.username || 'Anonymous Backend User',
        visitorEmail: dbUser.email || ''
      })
    }).catch(() => {});

    // Send JWT token or Session response...
    res.json({ success: true, token: generateToken(dbUser._id) });
  }
};`,

  php: `// 📂 PASTE THIS: Inside your Laravel LoginController or PHP custom authentication script
// 🔍 WHERE TO FIND VARIABLES: From Laravel's Auth::user() helper or your Custom $_SESSION['user']

public function login(Request $request) {
    if (Auth::attempt($request->only('email', 'password'))) {
        $laravelUser = Auth::user(); // Your logged-in user model

        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        $payload = [
            'trackingId'   => '${trackingId}',
            'utmSource'    => 'login',
            // ⚠️ BEFORE PASTING: Change ->name/email to match your Users table columns
            'visitorName'  => $laravelUser->name ?? $laravelUser->username ?? 'Anonymous PHP User',
            'visitorEmail' => $laravelUser->email ?? ''
        ];

        try {
            $ch = curl_init('https://deploywatch.onrender.com/api/analytics/track');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 2,
            ]);
            curl_exec($ch);
            curl_close($ch);
        } catch (\\Throwable $e) {}

        return redirect()->intended('dashboard');
    }
}`,

  python: `# 📂 PASTE THIS: Inside your Django views.py or Flask login route handler
# 🔍 WHERE TO FIND VARIABLES: From Django's 'request.user' or authenticated user instance

from django.contrib.auth import authenticate, login
import requests

def user_login(request):
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)

        # 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        try:
            requests.post(
                'https://deploywatch.onrender.com/api/analytics/track',
                json={
                    'trackingId': '${trackingId}',
                    'utmSource': 'login',
                    # ⚠️ BEFORE PASTING: Adjust fields according to your Custom User Model properties
                    'visitorName': getattr(user, 'username', getattr(user, 'first_name', 'Python User')),
                    'visitorEmail': getattr(user, 'email', ''),
                },
                timeout=2,
            )
        except Exception:
            pass`,

  java: `// 📂 PASTE THIS: Inside your Spring Boot Web Security SuccessHandler or Auth Controller
// 🔍 WHERE TO FIND VARIABLES: From Spring Security Principal context or your Database entity class

@PostMapping("/api/auth/login")
public ResponseEntity<?> loginUser(@RequestBody LoginRequest req) {
    User javaUser = userService.authenticate(req.getEmail(), req.getPassword());
    
    if (javaUser != null) {
        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        Map<String, String> payload = Map.of(
            "trackingId", "${trackingId}",
            "utmSource", "login",
            // ⚠️ BEFORE PASTING: Change .getName()/.getEmail() to match your Entity class getters
            "visitorName", javaUser.getName() == null ? "Java User" : javaUser.getName(),
            "visitorEmail", javaUser.getEmail() == null ? "" : javaUser.getEmail()
        );

        try {
            new RestTemplate().postForObject("https://deploywatch.onrender.com/api/analytics/track", payload, String.class);
        } catch (Exception e) {}
    }
    return ResponseEntity.ok(new AuthResponse("Success"));
}`,

  dotnet: `// 📂 PASTE THIS: Inside your ASP.NET Core Identity controller or minimal API endpoint
// 🔍 WHERE TO FIND VARIABLES: From Microsoft.AspNetCore.Identity ApplicationUser object

[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginModel model)
{
    var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, false, false);
    if (result.Succeeded)
    {
        var netUser = await _userManager.FindByEmailAsync(model.Email);

        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        try {
            await httpClient.PostAsJsonAsync(
                "https://deploywatch.onrender.com/api/analytics/track",
                new {
                    trackingId = "${trackingId}",
                    utmSource = "login",
                    // ⚠️ BEFORE PASTING: Change netUser.UserName/Email to match your IdentityUser Schema fields
                    visitorName = netUser.UserName ?? "C# User",
                    visitorEmail = netUser.Email ?? ""
                }
            );
        } catch (Exception) {}
    }
    return Ok();
}`,
});

const SetupGuideModal = ({ project, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(null);

  const tid = project?.trackingId || 'dw_YOUR_TRACKING_ID';
  const liveUrl = project?.liveUrl || 'https://your-project.com';
  const dbType = project?.dbType || 'none';

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const trackingScript = `<script
  src="${BACKEND_URL}/tracking.js"
  data-tracking-id="${tid}"
  async>
</script>`;

  const loginTrackingSamples = buildLoginTrackingSamples(tid);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sgm-box">
        {/* Header */}
        <div className="sgm-header">
          <div className="sgm-title-row">
            <BookOpen size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <h2 className="sgm-title">Setup Guide</h2>
              <p className="sgm-subtitle">{project?.name} · {project?.platform}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Step tabs */}
        <div className="sgm-tabs">
          {STEPS.map((s, i) => (
            <button key={i} className={`sgm-tab ${activeStep === i ? 'sgm-tab--active' : ''}`}
              onClick={() => setActiveStep(i)}>
              <span className="sgm-tab-num">{i + 1}</span>
              <span className="sgm-tab-label">{s}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="sgm-body">

          {/* ── Step 1: Track Views ── */}
          {activeStep === 0 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon"><Zap size={20} /></div>
              <h3 className="sgm-step-title">Add Tracking Script</h3>
              <p className="sgm-step-desc">
                Paste this single line in your project's main HTML file just before <code>&lt;/body&gt;</code>.
                Works with <strong>any language or framework</strong>.
              </p>

              <div className="sgm-code-block">
                <div className="sgm-code-label">
                  <Code size={12} /> Copy and paste into your <code>index.html</code>
                </div>
                <pre className="sgm-code mono">{trackingScript}</pre>
                <button className="sgm-copy-btn" onClick={() => copyText(trackingScript, 'main')}>
                  {copied === 'main' ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Script</>}
                </button>
              </div>

              <div className="sgm-info-box">
                <div className="sgm-info-title">📍 Where exactly to paste:</div>
                <div className="sgm-info-grid">
                  {[
                    ['HTML / PHP',       'index.html or index.php → before </body>'],
                    ['React',            'public/index.html → before </body>'],
                    ['Next.js',          'pages/_document.js → in <body> section'],
                    ['Vue / Nuxt',       'index.html or app.html → before </body>'],
                    ['Angular',          'src/index.html → before </body>'],
                    ['Django / Flask',   'base.html template → before </body>'],
                    ['Laravel',          'resources/views/layouts/app.blade.php → before </body>'],
                    ['Any other',        'Main HTML template file → before </body>'],
                  ].map(([lang, where]) => (
                    <div key={lang} className="sgm-info-row">
                      <span className="sgm-info-lang">{lang}</span>
                      <span className="sgm-info-where">{where}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Ping Status ── */}
          {activeStep === 1 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                <Zap size={20} />
              </div>
              <h3 className="sgm-step-title">Check Project Status</h3>
              <p className="sgm-step-desc">
                DeployWatch automatically checks if your project is live or down every <strong>10 minutes</strong>.
              </p>

              <div className="sgm-steps-list">
                {[
                  ['1', 'Go to Projects page', 'Find your project card'],
                  ['2', 'Click "Ping" button', `Instantly checks if ${liveUrl} is responding`],
                  ['3', 'See the result', 'Status updates instantly with live logs']
                ].map(([num, title, desc]) => (
                  <div className="sgm-list-item" key={num}>
                    <span className="sgm-list-num">{num}</span>
                    <div>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Track Logins ── */}
          {activeStep === 2 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>
                <Users size={20} />
              </div>
              <h3 className="sgm-step-title">Track Login Name & Email</h3>
              <p className="sgm-step-desc">
                Find your project's language below. Copy and paste the tracking snippet <strong>exactly inside your login success function</strong>.
              </p>

              <div className="sgm-info-box" style={{ borderColor: 'var(--accent)' }}>
                <div className="sgm-info-title" style={{ color: 'var(--accent)' }}>🛠️ Universal Customization Rules:</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.4rem 0', lineHeight: '1.5' }}>
                  1. Keep the <code>trackingId</code> exactly as shown — it links to your dashboard.<br />
                  2. <strong>Do NOT blindly paste:</strong> Change the placeholder fields (like <code>user.name</code> or <code>user.email</code>) to match your database or API response variable properties.
                </div>
              </div>

              <div className="sgm-code-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                {[
                  ['React / Vue / Angular (Frontend JavaScript)', loginTrackingSamples.react, 'login-react'],
                  ['Vanilla HTML / JavaScript (Frontend)', loginTrackingSamples.html, 'login-html'],
                  ['Node.js / Express (Backend)', loginTrackingSamples.node, 'login-node'],
                  ['PHP / Laravel (Backend)', loginTrackingSamples.php, 'login-php'],
                  ['Python / Django / Flask (Backend)', loginTrackingSamples.python, 'login-python'],
                  ['Java / Spring Boot (Backend)', loginTrackingSamples.java, 'login-java'],
                  ['C# / .NET (Backend)', loginTrackingSamples.dotnet, 'login-dotnet'],
                ].map(([label, sample, key]) => (
                  <div className="sgm-code-block" key={key} style={{ borderLeft: '3px solid var(--purple)' }}>
                    <div className="sgm-code-label" style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                      <Code size={12} /> {label}
                    </div>
                    <pre className="sgm-code mono" style={{ fontSize: '0.78rem', maxHeight: '300px', overflowY: 'auto' }}>{sample}</pre>
                    <button className="sgm-copy-btn" onClick={() => copyText(sample, key)}>
                      {copied === key ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Code Block</>}
                    </button>
                  </div>
                ))}
              </div>

              <div className="sgm-note" style={{ marginTop: '1.5rem' }}>
                💡 <strong>How to find your project fields:</strong> Run a search in your codebase for commands like <code>console.log(response)</code> or <code>print(user)</code> inside your login routes to inspect your user properties.
              </div>
            </div>
          )}

          {/* ── Step 4: Manage Users ── */}
          {activeStep === 3 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>
                <Database size={20} />
              </div>
              <h3 className="sgm-step-title">Manage Your Project's Users</h3>
              <p className="sgm-step-desc">
                Connect your project's database to view, edit, block, or delete your users — directly from DeployWatch.
              </p>

              <div className="sgm-steps-list">
                <div className="sgm-list-item">
                  <span className="sgm-list-num">1</span>
                  <div>
                    <strong>Click "🔒 Creds" on your project card</strong>
                    <p>A modal will open to add your database credentials</p>
                  </div>
                </div>
                <div className="sgm-list-item">
                  <span className="sgm-list-num">2</span>
                  <div>
                    <strong>Select your database type</strong>
                    <p>MongoDB · MySQL · PostgreSQL · Firebase · Supabase</p>
                  </div>
                </div>
                <div className="sgm-list-item">
                  <span className="sgm-list-num">3</span>
                  <div>
                    <strong>Enter connection details</strong>
                    <p>Your credentials are <strong>encrypted in your browser</strong> — DeployWatch servers never see them</p>
                  </div>
                </div>
              </div>

              {dbType !== 'none' && (
                <div className="sgm-tip">
                  ✅ Your project is configured with <strong>{dbType}</strong> database.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer navigation */}
        <div className="sgm-footer">
          <button className="btn btn-secondary btn-sm" disabled={activeStep === 0}
            onClick={() => setActiveStep(s => s - 1)}>← Previous</button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Step {activeStep + 1} of {STEPS.length}
          </span>
          {activeStep < STEPS.length - 1
            ? <button className="btn btn-primary btn-sm" onClick={() => setActiveStep(s => s + 1)}>Next →</button>
            : <button className="btn btn-primary btn-sm" onClick={onClose}>Done ✓</button>
          }
        </div>
      </div>
    </div>
  );
};

export default SetupGuideModal;
