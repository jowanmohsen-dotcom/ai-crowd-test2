// ============================================================
//  FIREBASE REAL-TIME CROWD / ATTENDANCE UPDATES
// ============================================================
var _realtimeSubscribed = false;

function subscribeToRealtimeUpdates() {
  if (typeof fbDb === 'undefined' || _realtimeSubscribed) return;
  _realtimeSubscribed = true;

  fbDb.ref('events').on('child_changed', function(snapshot) {
    var data = snapshot.val();
    var eventId = snapshot.key;
    _updateEventCardDOM(eventId, data);
  });

  console.log('[Firebase] Subscribed to real-time event updates');
}

function _updateEventCardDOM(eventId, data) {
  var crowdEl  = document.getElementById('crowd-'  + eventId);
  var capBarEl = document.getElementById('capbar-' + eventId);
  var capPctEl = document.getElementById('cappct-' + eventId);

  if (crowdEl && typeof levelBadge === 'function') {
    crowdEl.innerHTML = levelBadge((data.crowd_level || 'low').toLowerCase());
  }

  if (capBarEl && data.capacity > 0) {
    var pct = Math.round((Number(data.attendance_count || 0) / Number(data.capacity)) * 100);
    capBarEl.style.width = pct + '%';
    capBarEl.style.background = typeof capBarColor === 'function' ? capBarColor(pct) : '#22C55E';
    if (capPctEl) capPctEl.textContent = pct + '%';
  }
}

function unsubscribeRealtimeUpdates() {
  if (typeof fbDb !== 'undefined') {
    fbDb.ref('events').off();
    _realtimeSubscribed = false;
  }
}

window.subscribeToRealtimeUpdates  = subscribeToRealtimeUpdates;
window.unsubscribeRealtimeUpdates  = unsubscribeRealtimeUpdates;
