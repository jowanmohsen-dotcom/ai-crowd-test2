async function loadNotifications(silent) {
  if (!state.user || !state.user.id) return;

  try {
    var response = await fetch('/api/notifications/' + state.user.id);
    var data = await response.json();

    if (!response.ok) {
      if (!silent) showToast(data.message || 'Failed to load notifications', 'error');
      return;
    }

    state.realNotifications = data;
    state.notificationsLoaded = true;

    if (state.view === 'notifications') {
      render();
    }

  } catch (error) {
    console.error('LOAD NOTIFICATIONS ERROR:', error);
    if (!silent) showToast('Server error loading notifications', 'error');
  }
}
window.loadNotifications = loadNotifications;

function startNotificationsPolling() {
  stopNotificationsPolling();
  state.notificationsPolling = setInterval(function () {
    loadNotifications(true);
  }, 10000);
}
window.startNotificationsPolling = startNotificationsPolling;

function stopNotificationsPolling() {
  if (state.notificationsPolling) {
    clearInterval(state.notificationsPolling);
    state.notificationsPolling = null;
  }
}
window.stopNotificationsPolling = stopNotificationsPolling;

function markAllNotificationsRead() {
  var items = state.realNotifications || [];
  state.realNotifications = items.map(function(n) {
    n.is_read = true;
    return n;
  });
  render();
}
window.markAllNotificationsRead = markAllNotificationsRead;

function renderNotifications() {
  var user = state.user;
  var items = state.realNotifications || [];
  var unread = items.filter(function(n) { return !n.is_read; }).length;
  var filter = state.notifFilter || 'all';

  var filtered = filter === 'all'
    ? items
    : items.filter(function(n) { return n.type === filter; });

  var content =
    '<div style="padding:32px;max-width:980px;margin:0 auto;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px;">' +
        '<div>' +
          '<h1 style="font-family:Montserrat,sans-serif;font-weight:900;font-size:28px;letter-spacing:-0.02em;margin-bottom:6px;">Notifications</h1>' +
          '<p style="font-size:13px;color:var(--muted);">' + unread + ' unread notifications</p>' +
        '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button class="btn-ghost" onclick="loadNotifications()">Refresh</button>' +
          '<button class="btn-ghost" onclick="markAllNotificationsRead()">Mark All Read</button>' +
        '</div>' +
      '</div>' +

      '<div class="tab-bar" style="margin-bottom:22px;flex-wrap:wrap;">' +
        '<button class="tab-btn ' + (filter === 'all' ? 'active' : '') + '" onclick="state.notifFilter=\'all\';render()">All</button>' +
        '<button class="tab-btn ' + (filter === 'ticket' ? 'active' : '') + '" onclick="state.notifFilter=\'ticket\';render()">Tickets</button>' +
        '<button class="tab-btn ' + (filter === 'update' ? 'active' : '') + '" onclick="state.notifFilter=\'update\';render()">Updates</button>' +
        '<button class="tab-btn ' + (filter === 'emergency' ? 'active' : '') + '" onclick="state.notifFilter=\'emergency\';render()">Emergency</button>' +
      '</div>' +

      (!filtered.length
        ? '<div class="card" style="padding:28px;text-align:center;">' +
            '<h3 style="font-family:Montserrat,sans-serif;font-weight:800;font-size:20px;margin-bottom:10px;">No Notifications</h3>' +
            '<p style="color:var(--muted);">There are no notifications in this category.</p>' +
          '</div>'
        : filtered.map(function(n) {
            var color = n.type === 'emergency' ? '#EF4444' : n.type === 'ticket' ? '#22C55E' : '#60A5FA';

            return '<div style="display:flex;gap:14px;align-items:flex-start;padding:18px;margin-bottom:14px;border:1px solid var(--border);border-radius:16px;background:rgba(255,255,255,0.04);">' +
              '<div style="width:4px;border-radius:999px;background:' + color + ';min-height:76px;"></div>' +
              '<div style="flex:1;">' +
                '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">' +
                  '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;">' + (n.title || 'Notification') + '</div>' +
                  (!n.is_read ? '<span style="width:8px;height:8px;border-radius:50%;background:#9B1040;display:inline-block;"></span>' : '') +
                '</div>' +
                '<div style="font-size:14px;color:var(--muted);margin-bottom:8px;line-height:1.7;">' + (n.message || '') + '</div>' +
                '<div style="font-size:12px;color:var(--muted);">' + (n.created_at || '') + '</div>' +
              '</div>' +
            '</div>';
          }).join('')) +
    '</div>';

  if (user && user.role === 'organizer') {
    return '<div class="org-layout">' +
      renderSidebar('notifications') +
      '<main class="org-main">' + content + '</main>' +
    '</div>';
  }

  return renderTopNav() + content;
}