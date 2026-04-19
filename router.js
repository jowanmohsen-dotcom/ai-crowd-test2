// ============================================================
//  NAVIGATION
// ============================================================
function navigate(view, params) {
  params = params || {};

  state.view = view;
  state.params = params;

  history.pushState(
    { view: view, params: params },
    '',
    '#' + view
  );

  render();
}
window.navigate = navigate;


// ============================================================
//  RENDER ROUTER
// ============================================================
function render(options) {
  options = options || {};
  destroyAllCharts();

  if (state.view !== 'dashboard' && typeof stopDashboardPolling === 'function') {
    stopDashboardPolling();
  }

  var app = document.getElementById('app');
  var v = state.view;

  if (!app) {
    document.body.innerHTML = '<h1 style="color:white;padding:40px;">App container not found</h1>';
    return;
  }

  if (v === 'home') {
    app.innerHTML = renderHome();

  } else if (v === 'detail') {
    app.innerHTML = renderDetail();

  } else if (v === 'login') {
    app.innerHTML = renderLogin();

  } else if (v === 'signup') {
    app.innerHTML = renderSignup();

  } else if (v === 'notifications') {
    app.innerHTML = renderNotifications();

  } else if (v === 'dashboard') {
    if (!state.user || state.user.role !== 'organizer') {
      navigate('login');
      return;
    }
    app.innerHTML = renderDashboard();

    if (typeof startDashboardPolling === 'function') {
      startDashboardPolling();
    }

    setTimeout(function () {
      if (typeof initDashboardCharts === 'function') {
        initDashboardCharts();
      }
    }, 20);

  } else if (v === 'my-events') {
    if (!state.user || state.user.role !== 'organizer') {
      navigate('login');
      return;
    }

    app.innerHTML = renderMyEvents();

  } else if (v === 'reports') {
    if (!state.user || state.user.role !== 'organizer') {
      navigate('login');
      return;
    }

    app.innerHTML = renderReports();

    setTimeout(function () {
      if (typeof initReportsCharts === 'function') {
        initReportsCharts();
      }
    }, 20);

  } else if (v === 'create') {
    if (!state.user || state.user.role !== 'organizer') {
      navigate('login');
      return;
    }

    app.innerHTML = renderCreate();

  } else if (v === 'edit') {
    if (!state.user || state.user.role !== 'organizer') {
      navigate('login');
      return;
    }

    app.innerHTML = renderEdit();

  } else if (v === 'scan') {
    if (!state.user) {
      navigate('login');
      return;
    }

    app.innerHTML = renderScan();

  } else {
    app.innerHTML = renderHome();
  }

  if (!options.preserveScroll) {
    window.scrollTo(0, 0);
  }
}


// ============================================================
//  HANDLE BACK / FORWARD
// ============================================================
window.onpopstate = function(event) {
  if (event.state) {
    state.view = event.state.view;
    state.params = event.state.params || {};
    render();
  }
};


// ============================================================
//  BOOT
// ============================================================
if (window.location.hash) {
  state.view = window.location.hash.replace('#', '');
}

history.replaceState(
  { view: state.view, params: state.params },
  '',
  '#' + state.view
);

render();

if (typeof loadEvents === 'function') {
  loadEvents();
}
