// ============================================================
//  VIEW: ENTRY STAFF (SCANNER)
// ============================================================
function renderScan() {
  var events = state.realEvents || [];

  if (!state.eventsLoaded && !state.eventsLoading && typeof loadEvents === 'function') {
    loadEvents();
  }

  if (state.eventsLoading && !events.length) {
    return '<div style="min-height:100vh;background:var(--dark);display:flex;align-items:center;justify-content:center;padding:24px;">' +
      '<div class="card" style="max-width:520px;padding:32px;text-align:center;">' +
        '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:22px;margin-bottom:12px;">Loading Events...</h2>' +
        '<p style="color:var(--muted);">Please wait while the scanner loads real event data.</p>' +
      '</div>' +
    '</div>';
  }

  if (!events.length) {
    return '<div style="min-height:100vh;background:var(--dark);display:flex;align-items:center;justify-content:center;padding:24px;">' +
      '<div class="card" style="max-width:520px;padding:32px;text-align:center;">' +
        '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:22px;margin-bottom:12px;">No Real Events Available</h2>' +
        '<p style="color:var(--muted);margin-bottom:20px;">The scanner only works with events loaded from the database.</p>' +
        '<button class="btn-primary" onclick="navigate(\'home\')">Back to Home</button>' +
      '</div>' +
    '</div>';
  }

  var selectedEventId = (state.params && state.params.scanEvent !== undefined)
    ? parseInt(state.params.scanEvent, 10)
    : (events[0] ? events[0].id : null);

  var currentEvent = events.find(function(e) {
    return Number(e.id) === Number(selectedEventId);
  }) || events[0];

  var attendanceCount = currentEvent ? Number(currentEvent.attendance_count || 0) : 0;
  var ticketsSold = currentEvent ? Number(currentEvent.tickets_sold || 0) : 0;
  var remainingEntries = currentEvent ? Math.max(Number(currentEvent.capacity || 0) - attendanceCount, 0) : 0;
  var evName = currentEvent ? currentEvent.name : 'Select Event';

  return '<div style="min-height:100vh;background:var(--dark);display:flex;flex-direction:column;">' +
    '<header style="background:var(--dark2);border-bottom:1px solid var(--border);padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<img src="' + LOGO + '" alt="Crowd Analyzing" style="height:32px;" />' +
        '<div style="width:1px;height:24px;background:var(--border);"></div>' +
        '<div><div style="font-family:\'Montserrat\',sans-serif;font-weight:700;font-size:13px;">Entry Staff Portal</div><div style="font-size:11px;color:var(--muted);">' + evName + '</div></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme" id="theme-btn">' + (document.documentElement.getAttribute('data-theme') === 'light' ? '\u2600\uFE0F' : '\uD83C\uDF19') + '</button>' +
        '<button class="btn-ghost" style="font-size:12px;" onclick="state.user=null;navigate(\'login\')">Logout</button>' +
      '</div>' +
    '</header>' +
    '<main style="flex:1;display:flex;flex-direction:column;align-items:center;padding:32px 24px;gap:24px;max-width:640px;margin:0 auto;width:100%;">' +
      '<div style="width:100%;">' +
        '<label class="field-label">Current Event</label>' +
        '<select class="input-field" style="font-size:14px;" onchange="state.params = state.params || {}; state.params.scanEvent=this.value; navigate(\'scan\', state.params)">' +
          events.map(function(e) {
            return '<option value="' + e.id + '" ' + (Number(e.id) === Number(selectedEventId) ? 'selected' : '') + '>' + e.name + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="scan-area" style="width:100%;max-width:380px;aspect-ratio:1;border:3px solid rgba(155,16,64,0.5);border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(155,16,64,0.04);position:relative;overflow:hidden;">' +
        '<div style="position:absolute;inset:0;background:radial-gradient(circle,rgba(155,16,64,0.06) 0%,transparent 70%);pointer-events:none;"></div>' +
        '<div style="position:absolute;top:12px;left:12px;width:24px;height:24px;border-top:3px solid #9B1040;border-left:3px solid #9B1040;border-radius:4px 0 0 0;"></div>' +
        '<div style="position:absolute;top:12px;right:12px;width:24px;height:24px;border-top:3px solid #9B1040;border-right:3px solid #9B1040;border-radius:0 4px 0 0;"></div>' +
        '<div style="position:absolute;bottom:12px;left:12px;width:24px;height:24px;border-bottom:3px solid #9B1040;border-left:3px solid #9B1040;border-radius:0 0 0 4px;"></div>' +
        '<div style="position:absolute;bottom:12px;right:12px;width:24px;height:24px;border-bottom:3px solid #9B1040;border-right:3px solid #9B1040;border-radius:0 0 4px 0;"></div>' +
        '<div style="font-family:\'Montserrat\',sans-serif;font-weight:700;font-size:14px;letter-spacing:0.12em;color:rgba(155,16,64,0.8);">SCANNER READY</div>' +
        '<div style="font-size:12px;color:var(--muted);text-align:center;max-width:240px;">Enter a real ticket code generated from a purchased ticket.</div>' +
      '</div>' +
      '<div style="width:100%;">' +
        '<label class="field-label">Ticket Code</label>' +
        '<div style="display:flex;gap:10px;">' +
          '<input type="text" class="input-field" id="ticket-input" placeholder="e.g. TKT-0001" style="font-size:16px;font-family:\'Montserrat\',sans-serif;font-weight:700;letter-spacing:0.08em;text-align:center;" onkeydown="if(event.key===\'Enter\')validateTicket()" />' +
          '<button class="btn-primary" style="white-space:nowrap;" onclick="validateTicket()">Validate</button>' +
        '</div>' +
      '</div>' +
      '<div id="scan-result" style="width:100%;"></div>' +
      '<div style="width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" id="scan-stats">' +
        [
          { label:'Tickets Sold', val: ticketsSold, color: '#9B1040' },
          { label:'Attendance', val: attendanceCount, color: '#22C55E' },
          { label:'Remaining', val: remainingEntries, color: '#F59E0B' }
        ].map(function(s) {
          return '<div class="stat-card" style="text-align:center;padding:16px;">' +
            '<div style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:28px;color:' + s.color + ';margin-bottom:4px;">' + s.val + '</div>' +
            '<div style="font-size:12px;color:var(--muted);font-family:\'Montserrat\',sans-serif;font-weight:600;">' + s.label + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</main>' +
  '</div>';
}


// ============================================================
//  SCAN ACTION
// ============================================================
async function validateTicket() {
  var input = document.getElementById('ticket-input');
  if (!input) return;

  var code = input.value.trim().toUpperCase();
  var resultEl = document.getElementById('scan-result');
  var events = state.realEvents || [];
  var selectedEventId = (state.params && state.params.scanEvent !== undefined)
    ? parseInt(state.params.scanEvent, 10)
    : (events[0] ? events[0].id : null);
  var staffId = state.user && state.user.id ? state.user.id : null;

  if (!code) {
    showToast('Please enter a ticket code', 'error');
    return;
  }

  if (!selectedEventId) {
    showToast('Please select an event', 'error');
    return;
  }

  if (!staffId) {
    showToast('Staff user not found', 'error');
    return;
  }

  try {
    var response = await fetch('/api/events/' + selectedEventId + '/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        ticket_code: code
      })
    });

    var data = await response.json();
    var html = '';

    if (response.ok) {
      state.realEvents = events.map(function(ev) {
        if (Number(ev.id) !== Number(selectedEventId)) return ev;
        return Object.assign({}, ev, {
          attendance_count: data.attendance_count
        });
      });

      html =
        '<div style="background:rgba(34,197,94,0.1);border:2px solid rgba(34,197,94,0.4);border-radius:14px;padding:20px;text-align:center;">' +
        '<div style="font-size:40px;margin-bottom:8px;">OK</div>' +
        '<div style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:20px;color:#22C55E;margin-bottom:4px;">VALID TICKET</div>' +
        '<div style="font-family:\'Montserrat\',sans-serif;font-weight:700;font-size:14px;margin-bottom:12px;">' + data.ticket_code + ' - ' + data.customer_name + '</div>' +
        '<div style="font-size:13px;color:var(--muted);">Attendance: ' + data.attendance_count + ' | Crowd Level: ' + data.crowd_level + '</div>' +
        '</div>';

      showToast('Entry recorded successfully!', 'success');
    } else if (response.status === 409) {
      html =
        '<div style="background:rgba(245,158,11,0.1);border:2px solid rgba(245,158,11,0.4);border-radius:14px;padding:20px;text-align:center;">' +
        '<div style="font-size:40px;margin-bottom:8px;">!</div>' +
        '<div style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:20px;color:#F59E0B;margin-bottom:4px;">ALREADY USED</div>' +
        '<div style="font-size:13px;color:var(--muted);">' + (data.message || 'This ticket was already scanned') + '</div>' +
        '</div>';

      showToast(data.message || 'Ticket already used', 'error');
    } else {
      html =
        '<div style="background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.4);border-radius:14px;padding:20px;text-align:center;">' +
        '<div style="font-size:40px;margin-bottom:8px;">X</div>' +
        '<div style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:20px;color:#EF4444;margin-bottom:4px;">INVALID TICKET</div>' +
        '<div style="font-size:13px;color:var(--muted);">' + (data.message || 'Ticket not found') + '</div>' +
        '</div>';

      showToast(data.message || 'Invalid ticket', 'error');
    }

    if (resultEl) resultEl.innerHTML = html;
    renderScanStats(selectedEventId);

    input.value = '';
    input.focus();
  } catch (error) {
    console.error(error);
    showToast('Server error', 'error');
  }
}


// ============================================================
//  SCAN STATS
// ============================================================
function renderScanStats(selectedEventId) {
  var statsEl = document.getElementById('scan-stats');
  if (!statsEl) return;

  var eventData = (state.realEvents || []).find(function(ev) {
    return Number(ev.id) === Number(selectedEventId);
  });

  var attendanceCount = eventData ? Number(eventData.attendance_count || 0) : 0;
  var ticketsSold = eventData ? Number(eventData.tickets_sold || 0) : 0;
  var remainingEntries = eventData ? Math.max(Number(eventData.capacity || 0) - attendanceCount, 0) : 0;

  statsEl.innerHTML = [
    { label:'Tickets Sold', val: ticketsSold, color: '#9B1040' },
    { label:'Attendance', val: attendanceCount, color: '#22C55E' },
    { label:'Remaining', val: remainingEntries, color: '#F59E0B' }
  ].map(function(s) {
    return '<div class="stat-card" style="text-align:center;padding:16px;">' +
      '<div style="font-weight:900;font-size:28px;color:' + s.color + ';">' + s.val + '</div>' +
      '<div style="font-size:12px;color:var(--muted);">' + s.label + '</div>' +
    '</div>';
  }).join('');
}

window.validateTicket = validateTicket;
