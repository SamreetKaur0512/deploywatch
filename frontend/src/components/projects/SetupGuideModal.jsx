import { useState } from 'react';
import { X, Copy, Check, BookOpen, Code, Database, Zap, Users } from 'lucide-react';
import './SetupGuideModal.css';

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const STEPS = ['Track Views', 'Ping Status', 'Track Logins', 'Manage Users'];

const buildLoginTrackingSamples = (trackingId) => ({
  react: `// 📂 TYPE A: Frontend Form Login (React / Vue / Angular)
// 🔍 WHERE TO FIND VARIABLES: Inside your login API response object (e.g., res.data.user)

const handleLoginSuccess = async (email, password) => {
  const res = await authAPI.login({ email, password });
  
  if (res.data.success) {
    const currentUser = res.data.user; 

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    fetch('https://deploywatch.onrender.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: '${trackingId}',
        utmSource: 'login',
        visitorName: currentUser?.username || currentUser?.name || 'Anonymous User',
        visitorEmail: currentUser?.email || 'no-email@deploywatch.com'
      })
    }).catch(() => {});
    
    // Your existing navigation logic...
  }
};`,

  googleReact: `// 📂 TYPE B: Frontend Google Login / OAuth (React / Vue / Angular)
// 🔍 WHERE TO FIND VARIABLES: Decode Google's credential response JWT token to get profile data

const handleGoogleSuccess = (credentialResponse) => {
  // Decode JWT token (Using jwt-decode library)
  const googleUser = jwt_decode(credentialResponse.credential); 

  // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
  fetch('https://deploywatch.onrender.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: '${trackingId}',
      utmSource: 'google_login',
      visitorName: googleUser?.name || googleUser?.given_name || 'Google User',
      visitorEmail: googleUser?.email || ''
    })
  }).catch(() => {});
};`,

  node: `// 📂 TYPE A: Backend Controller Login (Node.js / Express)
// 🔍 WHERE TO FIND VARIABLES: From the user object fetched from MongoDB/SQL database

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
        visitorName: dbUser.name || dbUser.username || 'Anonymous Backend User',
        visitorEmail: dbUser.email || ''
      })
    }).catch(() => {});

    res.json({ success: true, token: generateToken(dbUser._id) });
  }
};`,

  googleNode: `// 📂 TYPE B: Backend Google Login / Passport Callback (Node.js / Express)
// 🔍 WHERE TO FIND VARIABLES: Passport.js automatically passes user profile in req.user

app.get('/auth/google/callback', passport.authenticate('google'), async (req, res) => {
  const googleProfile = req.user; 

  // 🚀 COPY & PASTE THIS TRACKING CODE HERE (Before redirecting):
  await fetch('https://deploywatch.onrender.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: '${trackingId}',
      utmSource: 'google_login',
      visitorName: googleProfile.displayName || googleProfile.name?.givenName || 'Google User',
      visitorEmail: googleProfile.emails?.[0]?.value || ''
    })
  }).catch(() => {});

  res.redirect('/dashboard');
});`,

  php: `// 📂 TYPE A: Backend Form Login (PHP / Laravel)
public function login(Request $request) {
    if (Auth::attempt($request->only('email', 'password'))) {
        $laravelUser = Auth::user(); 

        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        $payload = [
            'trackingId'   => '${trackingId}',
            'utmSource'    => 'login',
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

  googlePhp: `// 📂 TYPE B: Backend Google Login / Socialite OAuth (PHP / Laravel)
public function handleGoogleCallback() {
    $googleUser = Socialite::driver('google')->user();

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    $payload = [
        'trackingId'   => '${trackingId}',
        'utmSource'    => 'google_login',
        'visitorName'  => $googleUser->getName() ?? 'Google User',
        'visitorEmail' => $googleUser->getEmail() ?? ''
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
}`,

  python: `# 📂 TYPE A: Backend Form Login (Python / Django / Flask)
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
                    'visitorName': getattr(user, 'username', 'Python User'),
                    'visitorEmail': getattr(user, 'email', ''),
                },
                timeout=2,
            )
        except Exception:
            pass`,

  googlePython: `# 📂 TYPE B: Backend Google Login / Auth OAuth (Python / Django / Flask)
import requests

def google_callback(request):
    profile = google_auth.get_user_profile(request)

    # 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    try:
        requests.post(
            'https://deploywatch.onrender.com/api/analytics/track',
            json={
                'trackingId': '${trackingId}',
                'utmSource': 'google_login',
                'visitorName': profile.get('name', 'Google User'),
                'visitorEmail': profile.get('email', ''),
            },
            timeout=2
        )
    except Exception:
        pass`,

  java: `// 📂 TYPE A: Backend Form Login (Java / Spring Boot)
@PostMapping("/api/auth/login")
public ResponseEntity<?> loginUser(@RequestBody LoginRequest req) {
    User javaUser = userService.authenticate(req.getEmail(), req.getPassword());
    
    if (javaUser != null) {
        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        Map<String, String> payload = Map.of(
            "trackingId", "${trackingId}",
            "utmSource", "login",
            "visitorName", javaUser.getName() == null ? "Java User" : javaUser.getName(),
            "visitorEmail", javaUser.getEmail() == null ? "" : javaUser.getEmail()
        );

        try {
            new RestTemplate().postForObject("https://deploywatch.onrender.com/api/analytics/track", payload, String.class);
        } catch (Exception e) {}
    }
    return ResponseEntity.ok("Success");
}`,

  googleJava: `// 📂 TYPE B: Backend Google Login / Spring Security OAuth2 (Java / Spring Boot)
@GetMapping("/login/oauth2/code/google")
public void onGoogleLoginSuccess(Authentication authentication) {
    OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    Map<String, String> payload = Map.of(
        "trackingId", "${trackingId}",
        "utmSource", "google_login",
        "visitorName", oauth2User.getAttribute("name") != null ? oauth2User.getAttribute("name") : "Google User",
        "visitorEmail", oauth2User.getAttribute("email") != null ? oauth2User.getAttribute("email") : ""
    );

    try {
        new RestTemplate().postForObject("https://deploywatch.onrender.com/api/analytics/track", payload, String.class);
    } catch (Exception e) {}
}`,

  dotnet: `// 📂 TYPE A: Backend Form Login (C# / .NET Core Identity)
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
                    visitorName = netUser.UserName ?? "C# User",
                    visitorEmail = netUser.Email ?? ""
                }
            );
        } catch (Exception) {}
    }
    return Ok();
}`,

  googleDotnet: `// 📂 TYPE B: Backend Google Login / External Authentication (C# / .NET Core)
[HttpGet("google-response")]
public async Task<IActionResult> GoogleCallback() {
    var info = await _signInManager.GetExternalLoginInfoAsync();
    var googleClaims = info.Principal;

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    try {
        await httpClient.PostAsJsonAsync(
            "https://deploywatch.onrender.com/api/analytics/track",
            new {
                trackingId = "${trackingId}",
                utmSource = "google_login",
                visitorName = googleClaims.FindFirstValue(ClaimTypes.Name) ?? "Google User",
                visitorEmail = googleClaims.FindFirstValue(ClaimTypes.Email) ?? ""
            }
        );
    } catch (Exception) {}

    return RedirectToLocal("/Dashboard");
}`
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
                Find your project's architecture below. Copy and paste the tracking snippet <strong>exactly inside your login success block</strong>.
              </p>

              <div className="sgm-info-box" style={{ borderColor: 'var(--accent)' }}>
                <div className="sgm-info-title" style={{ color: 'var(--accent)' }}>🛠️ Universal Customization Rules:</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.4rem 0', lineHeight: '1.6' }}>
                  1. 📌 <strong>Fixed Keys (Left Side):</strong> Keep <code>trackingId</code>, <code>utmSource</code>, <code>visitorName</code>, and <code>visitorEmail</code> exactly as shown. Do NOT change them.
                  <br /><br />
                  2. 🔑 <strong>For Normal Login (Type A):</strong> You <u>MUST CHANGE</u> both the main user object and the sub-fields (e.g., change <code>dbUser.name</code> to your own <code>variable.column_name</code>) to match your custom database schema.
                  <br /><br />
                  3. 🌐 <strong>For Google Login (Type B):</strong> Only change the main response object name (e.g., change <code>googleUser</code> to <code>profile</code> or <code>res</code>). The sub-fields <code>.name</code> and <code>.email</code> are standard Google properties and should usually stay the same.
                  <br /><br />
                  4. 🔍 <strong>Debugging Tip:</strong> If unsure what your login system or Google OAuth returns, use <code>console.log()</code> or <code>print()</code> to inspect variables before pasting.
                </div>
              </div>

              <div className="sgm-code-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                {[
                  ['React / Vue / Angular (Normal Login - Frontend)', loginTrackingSamples.react, 'login-react'],
                  ['React / Vue / Angular (Google Login / OAuth - Frontend)', loginTrackingSamples.googleReact, 'login-google-react'],
                  ['Node.js / Express (Normal Login - Backend)', loginTrackingSamples.node, 'login-node'],
                  ['Node.js / Express (Google Login / Passport Callback)', loginTrackingSamples.googleNode, 'login-google-node'],
                  ['PHP / Laravel (Normal Form Login)', loginTrackingSamples.php, 'login-php'],
                  ['PHP / Laravel (Google Login / Socialite OAuth)', loginTrackingSamples.googlePhp, 'login-google-php'],
                  ['Python / Django / Flask (Normal Form Login)', loginTrackingSamples.python, 'login-python'],
                  ['Python / Django / Flask (Google Login / Auth OAuth)', loginTrackingSamples.googlePython, 'login-google-python'],
                  ['Java / Spring Boot (Normal Form Login)', loginTrackingSamples.java, 'login-java'],
                  ['Java / Spring Boot (Google Login / OAuth2 Context)', loginTrackingSamples.googleJava, 'login-google-java'],
                  ['C# / .NET Core (Normal Identity Login)', loginTrackingSamples.dotnet, 'login-dotnet'],
                  ['C# / .NET Core (Google Login / ClaimsPrincipal)', loginTrackingSamples.googleDotnet, 'login-google-dotnet'],
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
