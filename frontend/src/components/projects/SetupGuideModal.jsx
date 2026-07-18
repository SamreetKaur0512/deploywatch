import { useState } from 'react';
import { X, Copy, Check, BookOpen, Code, Database, Zap, Users } from 'lucide-react';
import { getBackendUrl } from '../../utils/backendUrl';
import './SetupGuideModal.css';
import { createPortal } from 'react-dom';

const BACKEND_URL = getBackendUrl();
const STEPS = ['Track Views', 'Ping Status', 'Track Logins', 'Manage Users'];

const buildLoginTrackingSamples = (trackingId) => ({
  react: `// 📂 TYPE A: Frontend Form Login (React / Vue / Angular)
const handleLoginSuccess = async (email, password) => {
  const res = await authAPI.login({ email, password });
  
  if (res.data.success) {
    // 🔍 CUSTOMIZABLE VARIABLE: Change 'res.data.user' to match your API response structure
    const currentUser = res.data.user; 

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    fetch('https://deploywatch.onrender.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: '${trackingId}', // 🔒 FIXED: Do not change
        utmSource: 'login',          // 🔒 FIXED: Do not change
        
        // 🛠️ CUSTOMIZABLE FIELDS: 
        // - Change 'currentUser' to your own object name if different
        // - Change '.username' or '.name' to match your user properties
        visitorName: currentUser?.username || currentUser?.name || 'Anonymous User',
        
        // - Change '.email' to match your user email property
        visitorEmail: currentUser?.email || 'no-email@deploywatch.com'
      })
    }).catch(() => {});
    
    // Your existing navigation logic...
  }
};`,

  googleReact: `// 📂 TYPE B: Frontend Google Login / OAuth (React / Vue / Angular)
const handleGoogleSuccess = (credentialResponse) => {
  // Decode JWT token (Using jwt-decode library)
  // 🔍 CUSTOMIZABLE VARIABLE: Change 'googleUser' to whatever your decoded object variable is named
  const googleUser = jwt_decode(credentialResponse.credential); 

  // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
  fetch('https://deploywatch.onrender.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: '${trackingId}', // 🔒 FIXED: Do not change
      utmSource: 'google_login',   // 🔒 FIXED: Do not change
      
      // 🛠️ CUSTOMIZABLE FIELDS:
      // - Change 'googleUser' to match your decoded object variable (e.g., res, profile)
      // - ⚠️ NOTE: '.name', '.given_name', and '.email' are standard Google OAuth keys. No need to change them.
      visitorName: googleUser?.name || googleUser?.given_name || 'Google User',
      visitorEmail: googleUser?.email || ''
    })
  }).catch(() => {});
};`,

  node: `// 📂 TYPE A: Backend Controller Login (Node.js / Express)
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  // 🔍 CUSTOMIZABLE VARIABLE: Change 'User' and 'dbUser' to match your Mongoose/Sequelize model variables
  const dbUser = await User.findOne({ email });

  if (dbUser && (await dbUser.matchPassword(password))) {
    
    // 🚀 COPY & PASTE THIS TRACKING CODE HERE (Before sending response):
    await fetch('https://deploywatch.onrender.com/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: '${trackingId}', // 🔒 FIXED: Do not change
        utmSource: 'login',          // 🔒 FIXED: Do not change
        
        // 🛠️ CUSTOMIZABLE FIELDS:
        // - Change 'dbUser' to your own fetched user object variable (e.g., user, row)
        // - Change '.name' or '.username' to match your Database Schema columns
        visitorName: dbUser.name || dbUser.username || 'Anonymous Backend User',
        
        // - Change '.email' to match your Database Schema email column
        visitorEmail: dbUser.email || ''
      })
    }).catch(() => {});

    res.json({ success: true, token: generateToken(dbUser._id) });
  }
};`,

  googleNode: `// 📂 TYPE B: Backend Google Login / Passport Callback (Node.js / Express)
app.get('/auth/google/callback', passport.authenticate('google'), async (req, res) => {
  // 🔍 CUSTOMIZABLE VARIABLE: Change 'googleProfile' to your own variable name (e.g., user, profile)
  const googleProfile = req.user; 

  // 🚀 COPY & PASTE THIS TRACKING CODE HERE (Before redirecting):
  await fetch('https://deploywatch.onrender.com/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId: '${trackingId}', // 🔒 FIXED: Do not change
      utmSource: 'google_login',   // 🔒 FIXED: Do not change
      
      // 🛠️ CUSTOMIZABLE FIELDS:
      // - Change 'googleProfile' to match your passport user variable name (e.g., req.user)
      // - ⚠️ NOTE: Passport Google Strategy standard profile keys are '.displayName' and '.emails[0].value'. Only modify if using a custom strategy profile mapper.
      visitorName: googleProfile.displayName || googleProfile.name?.givenName || 'Google User',
      visitorEmail: googleProfile.emails?.[0]?.value || ''
    })
  }).catch(() => {});

  res.redirect('/dashboard');
});`,

  php: `// 📂 TYPE A: Backend Form Login (PHP / Laravel)
public function login(Request $request) {
    if (Auth::attempt($request->only('email', 'password'))) {
        // 🔍 CUSTOMIZABLE VARIABLE: Change '$laravelUser' to your preferred variable name (e.g., $user)
        $laravelUser = Auth::user(); 

        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        $payload = [
            'trackingId'   => '${trackingId}', // 🔒 FIXED: Do not change
            'utmSource'    => 'login',          // 🔒 FIXED: Do not change
            
            // 🛠️ CUSTOMIZABLE FIELDS:
            // - Change '$laravelUser' to match your user variable
            // - Change '->name' or '->username' to match your Eloquent Model attributes / SQL table columns
            'visitorName'  => $laravelUser->name ?? $laravelUser->username ?? 'Anonymous PHP User',
            
            // - Change '->email' to match your user model email column
            'visitorEmail' => $laravelUser->email ?? ''
        ];

        try {
            $ch = curl_init('https://deploywatch.onrender.com/api/analytics/track');
            curl_setopt_array($ch, [
                CURLPOST => true,
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
    // 🔍 CUSTOMIZABLE VARIABLE: Change '$googleUser' to your preferred variable (e.g., $user, $rawUser)
    $googleUser = Socialite::driver('google')->user();

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    $payload = [
        'trackingId'   => '${trackingId}', // 🔒 FIXED: Do not change
        'utmSource'    => 'google_login',   // 🔒 FIXED: Do not change
        
        // 🛠️ CUSTOMIZABLE FIELDS:
        // - Change '$googleUser' to match your Socialite user object variable
        // - ⚠️ NOTE: '->getName()' and '->getEmail()' are standard Laravel Socialite methods for Google. No need to change them.
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
    # 🔍 CUSTOMIZABLE VARIABLE: Change 'user' if your authentication returns a different variable name
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)

        # 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        try:
            requests.post(
                'https://deploywatch.onrender.com/api/analytics/track',
                json={
                    'trackingId': '${trackingId}', # 🔒 FIXED: Do not change
                    'utmSource': 'login',          # 🔒 FIXED: Do not change
                    
                    # 🛠️ CUSTOMIZABLE FIELDS:
                    # - Change 'user' to match your authenticated user instance variable
                    # - Change 'username' or 'first_name' to match your Custom User Model fields
                    'visitorName': getattr(user, 'username', 'Python User'),
                    
                    # - Change 'email' to match your Custom User Model email field
                    'visitorEmail': getattr(user, 'email', ''),
                },
                timeout=2,
            )
        except Exception:
            pass`,

  googlePython: `# 📂 TYPE B: Backend Google Login / Auth OAuth (Python / Django / Flask)
import requests

def google_callback(request):
    # 🔍 CUSTOMIZABLE VARIABLE: Change 'profile' to match your oauth profile dictionary name (e.g., user_data, res)
    profile = google_auth.get_user_profile(request)

    # 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    try:
        requests.post(
            'https://deploywatch.onrender.com/api/analytics/track',
            json={
                'trackingId': '${trackingId}', # 🔒 FIXED: Do not change
                'utmSource': 'google_login',   # 🔒 FIXED: Do not change
                
                # 🛠️ CUSTOMIZABLE FIELDS:
                # - Change 'profile' to match your own dictionary variable name
                # - ⚠️ NOTE: 'name' and 'email' are standard string keys returned by Google UserInfo API. Do not change them.
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
    // 🔍 CUSTOMIZABLE VARIABLE: Change 'javaUser' to your local Entity class object name (e.g., user, account)
    User javaUser = userService.authenticate(req.getEmail(), req.getPassword());
    
    if (javaUser != null) {
        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        Map<String, String> payload = Map.of(
            "trackingId", "${trackingId}", // 🔒 FIXED: Do not change
            "utmSource", "login",          // 🔒 FIXED: Do not change
            
            // 🛠️ CUSTOMIZABLE FIELDS:
            // - Change 'javaUser' to match your authenticated Entity instance name
            // - Change '.getName()' or '.getUsername()' to match your Entity getter methods
            "visitorName", javaUser.getName() == null ? "Java User" : javaUser.getName(),
            
            // - Change '.getEmail()' to match your Entity email getter method
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
    // 🔍 CUSTOMIZABLE VARIABLE: Change 'oauth2User' to your preferred casted variable name
    OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    Map<String, String> payload = Map.of(
        "trackingId", "${trackingId}", // 🔒 FIXED: Do not change
        "utmSource", "google_login",   // 🔒 FIXED: Do not change
        
        // 🛠️ CUSTOMIZABLE FIELDS:
        // - Change 'oauth2User' to match your Principal variable name
        // - ⚠️ NOTE: Spring Security maps standard Google token claims to "name" and "email". Do not change these string parameters.
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
        // 🔍 CUSTOMIZABLE VARIABLE: Change 'netUser' to your local Identity User variable (e.g., user, appUser)
        var netUser = await _userManager.FindByEmailAsync(model.Email);

        // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
        try {
            await httpClient.PostAsJsonAsync(
                "https://deploywatch.onrender.com/api/analytics/track",
                new {
                    trackingId = "${trackingId}", // 🔒 FIXED: Do not change
                    utmSource = "login",          // 🔒 FIXED: Do not change
                    
                    // 🛠️ CUSTOMIZABLE FIELDS:
                    // - Change 'netUser' to match your application user object variable
                    // - Change '.UserName' or '.FullName' to match your Identity standard/custom property columns
                    visitorName = netUser.UserName ?? "C# User",
                    
                    // - Change '.Email' to match your user email property column
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
    // 🔍 CUSTOMIZABLE VARIABLE: Change 'googleClaims' to your local ClaimsPrincipal instance variable name
    var googleClaims = info.Principal;

    // 🚀 COPY & PASTE THIS TRACKING CODE HERE:
    try {
        await httpClient.PostAsJsonAsync(
            "https://deploywatch.onrender.com/api/analytics/track",
            new {
                trackingId = "${trackingId}", // 🔒 FIXED: Do not change
                utmSource = "google_login",   // 🔒 FIXED: Do not change
                
                // 🛠️ CUSTOMIZABLE FIELDS:
                // - Change 'googleClaims' to match your ClaimsPrincipal instance name
                // - ⚠️ NOTE: ClaimTypes.Name and ClaimTypes.Email are standard .NET security definitions that extract Google's standard payload. No need to change them.
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

  return createPortal(
    <div className="modal-overlay setup-guide-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
                Works with languages and frameworks that can serve HTML (so you can include a script tag).
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
                    ['HTML / PHP',              'index.html or index.php → before </body>'],
                    ['React (Vite)',            'index.html in your PROJECT ROOT (⚠️ NOT public/index.html — Vite ignores that file as a template) → before </body>'],
                    ['React (Create React App)','public/index.html → before </body>'],
                    ['Next.js',                 'pages/_document.js → in <body> section'],
                    ['Vue (Vite) / Nuxt',       'index.html in your PROJECT ROOT (⚠️ NOT public/index.html) → before </body>'],
                    ['Vue (Vue CLI)',           'public/index.html → before </body>'],
                    ['Angular',                 'src/index.html → before </body>'],
                    ['Django / Flask',          'base.html template → before </body>'],
                    ['Laravel',                 'resources/views/layouts/app.blade.php → before </body>'],
                    ['Any other',               'Main HTML template file → before </body>'],
                  ].map(([lang, where]) => (
                    <div key={lang} className="sgm-info-row">
                      <span className="sgm-info-lang">{lang}</span>
                      <span className="sgm-info-where">{where}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--yellow)', marginTop: '0.6rem', lineHeight: 1.5 }}>
                  ⚠️ <strong>Not sure if your project uses Vite?</strong> If you ran <code>npm create vite@latest</code>
                  or your project has a <code>vite.config.js</code> file, it's Vite — use the <strong>project root</strong> index.html,
                  not the one inside <code>public/</code>. Pasting it in the wrong file means the script never ends up in your
                  built/deployed site and views will never be counted.
                </p>
              </div>

              <div className="sgm-note">
                🔁 <strong>How views are counted:</strong> Opening your site counts as 1 view. If that same person logs in a
                few seconds/minutes later, it does <strong>not</strong> add a 2nd view — it's still the same visit.
                A new view only counts if the same device comes back after <strong>30+ minutes</strong>.
                So if 2 different people log in from the same device within 30 minutes, that's just <strong>1 view</strong>, not 2 —
                same rule for every project, with or without login.This 30-minute rule is based on the device/browser/Network, not the account.
            
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
    </div>,
    document.body
  );
};

export default SetupGuideModal;