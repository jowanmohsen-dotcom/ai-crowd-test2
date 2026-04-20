if (typeof LOGO === 'undefined') {
  var LOGO = 'brand_assets/logo.png';
}

// ============================================================
//  TOP NAV
// ============================================================
function renderTopNav() {
  var user = state.user;

  return '' +
  '<header style="position:sticky;top:0;z-index:1000;background:rgba(10,10,30,0.72);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);" class="top-nav-header">' +
    '<div style="max-width:1280px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;">' +

      '<div style="display:flex;align-items:center;gap:16px;">' +
        '<button onclick="navigate(\'home\')" style="background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center;">' +
          '<img src="' + LOGO + '" alt="logo" style="width:72px;height:72px;object-fit:contain;display:block;" />' +
        '</button>' +

        '<nav style="display:flex;align-items:center;gap:10px;">' +
          '<button onclick="navigate(\'home\')" style="background:rgba(155,16,64,0.12);border:1px solid rgba(155,16,64,0.2);color:var(--text);padding:8px 14px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">Home</button>' +
          '<button onclick="scrollToEvents()" style="background:none;border:none;color:var(--text);font-size:14px;font-weight:600;cursor:pointer;">Events</button>' +
        '</nav>' +
      '</div>' +

      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<div style="position:relative;">' +
          '<input class="input-field" placeholder="Search events..." style="width:240px;height:40px;padding-left:36px;font-size:13px;" value="' + (state.searchQuery || '') + '" oninput="setSearch(this.value)" />' +
          '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted);">🔎</span>' +
        '</div>' +

        '<button id="theme-btn" class="icon-btn" style="position:relative;z-index:2000;" onclick="toggleTheme()" title="Toggle theme">' + (document.documentElement.getAttribute('data-theme') === 'light' ? '☀️' : '🌙') + '</button>' +

        (user
          ? '<div style="display:flex;align-items:center;gap:8px;">' +
              '<div onclick="goToUserMainPage()" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:999px;background:rgba(255,255,255,0.04);cursor:pointer;">' +
                '<div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#9B1040,#96620A);color:#fff;font-weight:800;">' +
                  ((user.name || 'U').charAt(0).toUpperCase()) +
                '</div>' +
                '<div style="line-height:1.1;">' +
                  '<div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:12px;color:#fff;">' + (user.name || 'User') + '</div>' +
                  '<div style="font-size:11px;color:var(--muted);text-transform:capitalize;">' + (user.role || '') + '</div>' +
                '</div>' +
              '</div>' +
              '<button class="btn-ghost" onclick="logout()">Logout</button>' +
            '</div>'
          : '<button class="btn-ghost" onclick="navigate(\'login\')">Login</button>' +
            '<button class="btn-primary" onclick="navigate(\'signup\')">Sign Up</button>') +
      '</div>' +

    '</div>' +
  '</header>';
}


function scrollToEvents() {
  if (state.view !== 'home') {
    navigate('home');
    setTimeout(function() {
      var el = document.getElementById('events-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  } else {
    var el = document.getElementById('events-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
window.scrollToEvents = scrollToEvents;

function goToUserMainPage() {
  if (!state.user) {
    navigate('home');
    return;
  }

  if (state.user.role === 'organizer') {
    navigate('dashboard');
  } else if (state.user.role === 'entry_staff') {
    navigate('scan');
  } else {
    navigate('home');
  }
}
window.goToUserMainPage = goToUserMainPage;
function logout() {
  if (typeof firebaseSignOut === 'function') firebaseSignOut();
  state.user = null;
  navigate('home');

  setTimeout(function () {
    if (typeof loadEvents === 'function') {
      loadEvents();
    }
  }, 50);
}
window.logout = logout;

// ============================================================
//  ORGANIZER SIDEBAR
// ============================================================
// ============================================================
//  ORGANIZER SIDEBAR (WITH HOME AT BOTTOM)
// ============================================================
function renderSidebar(active) {
  var user = state.user || {};

  function item(view, label, icon) {
    var isActive = active === view;

    return '' +
      '<button onclick="navigate(\'' + view + '\')" style="' +
        'width:100%;display:flex;align-items:center;gap:12px;' +
        'padding:14px 16px;margin-bottom:10px;border-radius:14px;' +
        'border:' + (isActive ? '1px solid rgba(255,255,255,0.10)' : '1px solid transparent') + ';' +
        'background:' + (isActive ? 'linear-gradient(135deg,#9B1040,#96620A)' : 'transparent') + ';' +
        'color:#fff;cursor:pointer;font-size:14px;font-weight:700;text-align:left;' +
      '">' +
        '<span style="font-size:16px;">' + icon + '</span>' +
        '<span>' + label + '</span>' +
      '</button>';
  }

  return '' +
    '<aside class="org-sidebar" style="' +
      'width:260px;min-width:260px;' +
      'background:rgba(255,255,255,0.03);' +
      'border-right:1px solid rgba(255,255,255,0.08);' +
      'display:flex;flex-direction:column;justify-content:space-between;' +
      'padding:22px 16px;height:100vh;position:sticky;top:0;' +
    '">' +

      // ===== TOP =====
      '<div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:26px;padding:6px 8px;">' +
          '<img src="' + LOGO + '" alt="logo" style="width:42px;height:42px;object-fit:contain;" />' +
        '</div>' +

        item('dashboard', 'Dashboard', '📊') +
        item('my-events', 'My Events', '📅') +
        item('create', 'Create Event', '➕') +
        item('notifications', 'Notifications', '🔔') +
        item('reports', 'Reports', '📄') +
      '</div>' +

      // ===== BOTTOM =====
      '<div>' +

        // profile card
        '<div style="' +
          'display:flex;align-items:center;gap:10px;' +
          'padding:14px 12px;border:1px solid rgba(255,255,255,0.08);' +
          'border-radius:18px;background:rgba(255,255,255,0.04);margin-bottom:12px;' +
        '">' +
          '<div style="' +
            'width:38px;height:38px;border-radius:50%;' +
            'display:flex;align-items:center;justify-content:center;' +
            'background:linear-gradient(135deg,#9B1040,#96620A);' +
            'color:#fff;font-weight:800;' +
          '">' +
            ((user.name || 'U').charAt(0).toUpperCase()) +
          '</div>' +

          '<div style="min-width:0;">' +
            '<div style="font-family:Montserrat,sans-serif;font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
              (user.name || 'User') +
            '</div>' +
            '<div style="font-size:12px;color:var(--muted);text-transform:capitalize;">' +
              (user.role || '') +
            '</div>' +
          '</div>' +
        '</div>' +

        // HOME BUTTON
        '<button onclick="navigate(\'home\')" style="' +
          'width:100%;padding:12px 16px;margin-bottom:10px;border-radius:14px;' +
          'border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.04);' +
          'color:#fff;font-weight:700;cursor:pointer;text-align:left;' +
        '">🏠 Home</button>' +

        // LOGOUT BUTTON
        '<button onclick="logout()" style="' +
          'width:100%;padding:12px 16px;border-radius:14px;' +
          'border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.04);' +
          'color:#fff;font-weight:700;cursor:pointer;text-align:left;' +
        '">🚪 Logout</button>' +

      '</div>' +
    '</aside>';
}