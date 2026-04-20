// ============================================================
//  VIEW: LOGIN
// ============================================================
function renderLogin() {
  var roles = ['customer', 'organizer', 'entry_staff'];
  var roleLabels = ['Customer', 'Organizer', 'Staff'];

  return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;background:var(--dark);">' +
    '<div class="grid-bg"></div>' +
    '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 700px 500px at 30% 50%,rgba(155,16,64,0.1) 0%,transparent 70%),radial-gradient(ellipse 500px 400px at 70% 40%,rgba(255,180,0,0.07) 0%,transparent 60%);pointer-events:none;"></div>' +

    '<div class="card" style="width:100%;max-width:420px;padding:36px;position:relative;z-index:1;background:rgba(255,255,255,0.06);backdrop-filter:blur(16px);">' +
      '<div style="text-align:center;margin-bottom:28px;">' +
        '<img src="' + LOGO + '" alt="Crowd Analyzing" style="height:50px;margin-bottom:16px;" />' +
        '<h1 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:22px;margin-bottom:6px;">Welcome Back</h1>' +
        '<p style="color:var(--muted);font-size:14px;">Sign in to continue to Crowd Analyzing</p>' +
      '</div>' +

      '<div style="margin-bottom:24px;">' +
        '<div class="tab-bar" id="role-tabs">' +
          roles.map(function(r, i) {
            return '<button type="button" class="tab-btn ' + (state.loginRole === r ? 'active' : '') + '" onclick="setLoginRole(\'' + r + '\')">' + roleLabels[i] + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<form onsubmit="doLogin(event)" id="login-form">' +
        '<div style="margin-bottom:16px;">' +
          '<label class="field-label">Email Address</label>' +
          '<input type="email" class="input-field" placeholder="you@example.com" required id="login-email" />' +
        '</div>' +

        '<div style="margin-bottom:24px;">' +
          '<label class="field-label">Password</label>' +
          '<input type="password" class="input-field" placeholder="********" required id="login-password" />' +
        '</div>' +

        '<button type="submit" class="btn-primary" style="width:100%;justify-content:center;font-size:15px;padding:14px;">Sign In</button>' +
      '</form>' +

      '<div style="text-align:center;margin-top:20px;display:flex;flex-direction:column;gap:10px;">' +
        '<button class="nav-link" style="font-size:13px;" onclick="showForgotPasswordInfo()">Forgot Password?</button>' +
        '<div style="font-size:13px;color:var(--muted);">Do not have an account? <button class="nav-link" style="display:inline;color:#9B1040;font-size:13px;" onclick="navigate(\'signup\')">Create Account</button></div>' +
      '</div>' +
    '</div>' +
  '</div>';
}


// ============================================================
//  LOGIN ROLE
// ============================================================
function setLoginRole(role) {
  state.loginRole = role;
  render();
}
window.setLoginRole = setLoginRole;


// ============================================================
//  FORGOT PASSWORD
// ============================================================
function showForgotPasswordInfo() {
  showToast('Password reset is not connected to the backend yet.', 'error');
}
window.showForgotPasswordInfo = showForgotPasswordInfo;


// ============================================================
//  LOGIN ACTION
// ============================================================
async function doLogin(e) {
  e.preventDefault();

  var email = document.getElementById('login-email').value.trim();
  var password = document.getElementById('login-password').value.trim();
  var role = state.loginRole || 'customer';

  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    var response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password,
        role: role
      })
    });

    var data = await response.json();

    if (!response.ok) {
      showToast(data.message || 'Login failed', 'error');
      return;
    }

    state.user = {
      id: data.user.id,
      name: data.user.full_name,
      email: data.user.email,
      role: data.user.role
    };

    state.realEvents = [];
    state.eventsLoaded = false;
    state.eventsLoading = false;

    if (typeof firebaseSignIn === 'function') firebaseSignIn(email, password);
    showToast('Welcome back, ' + state.user.name + '!', 'success');

    setTimeout(function() {
      if (state.user.role === 'organizer') {
        navigate('dashboard');
      } else if (state.user.role === 'entry_staff') {
        navigate('scan');
      } else {
        navigate('home');
      }
    }, 250);
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    showToast('Server error. Please try again.', 'error');
  }
}
window.doLogin = doLogin;
