// ============================================================
//  HELPERS
// ============================================================
var LOGO = 'brand_assets/logo.png';

function showToast(msg, type) {
  type = type || 'success';
  var c = document.getElementById('toast-container');
  var t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = '<span>' + (type === 'success' ? '&#10003;' : '&#10005;') + '</span><span>' + msg + '</span>';
  c.appendChild(t);
  setTimeout(function() { t.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(function() { t.remove(); }, 320); }, 3000);
}
window.showToast = showToast;

function levelBadge(level) {
  var map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };
  var labels = { low: 'Low', medium: 'Medium', high: 'High' };
  return '<span class="badge ' + (map[level] || 'badge-info') + '">\u25cf ' + (labels[level] || level) + '</span>';
}

function capBarColor(pct) {
  if (pct < 50) return '#22C55E';
  if (pct < 75) return '#F59E0B';
  return '#EF4444';
}

function notifIcon(type, sev) {
  if (type === 'emergency') return '\uD83D\uDEA8';
  if (type === 'crowd') return sev === 'high' ? '\u26A0\uFE0F' : '\uD83D\uDCCA';
  return '\u2139\uFE0F';
}

function notifColor(sev) {
  if (sev === 'critical') return '#EF4444';
  if (sev === 'high') return '#F59E0B';
  return '#60A5FA';
}

// load real events from backend
async function loadRealEvents() {
  try {
    var response = await fetch('/api/events');
    var data = await response.json();

    if (!response.ok) {
      showToast('Failed to load events', 'error');
      return [];
    }

    // save real events in state
    state.realEvents = data;
    return data;

  } catch (error) {
    console.error(error);
    showToast('Server error while loading events', 'error');
    return [];
  }
}

window.loadRealEvents = loadRealEvents;