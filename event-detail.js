// ============================================================
//  VIEW: EVENT DETAIL
// ============================================================
function renderDetail() {
  var id = state.params.id;
  var events = state.realEvents || [];

  if (!state.eventsLoaded && !state.eventsLoading && typeof loadEvents === 'function') {
    loadEvents();
  }

  if (state.eventsLoading && !events.length) {
    return renderTopNav() +
      '<div style="max-width:1160px;margin:0 auto;padding:32px;">' +
        '<div class="card" style="padding:32px;text-align:center;">' +
          '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:22px;margin-bottom:12px;">Loading Event...</h2>' +
          '<p style="color:var(--muted);">Please wait while the event loads from the database.</p>' +
        '</div>' +
      '</div>';
  }

  var ev = events.find(function(e) {
    return Number(e.id) === Number(id);
  }) || events[0];

  if (!ev) {
    return renderTopNav() +
      '<div style="max-width:1160px;margin:0 auto;padding:32px;">' +
        '<div class="card" style="padding:32px;text-align:center;">' +
          '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:22px;margin-bottom:12px;">No Event Found</h2>' +
          '<p style="color:var(--muted);">There are no real events available in the system.</p>' +
        '</div>' +
      '</div>';
  }

  var pct = ev.capacity > 0 ? Math.round((Number(ev.attendance_count || 0) / Number(ev.capacity || 0)) * 100) : 0;
  var category = ev.category || 'Event';
  var location = ev.location || 'Not provided';
  var organizer = ev.organizer_name || 'Organizer';
  var description = ev.description || 'No description available';
  var startTime = ev.start_time || 'Not provided';
  var endTime = ev.end_time || 'Not provided';
  var crowdLevel = (ev.crowd_level || 'low').toLowerCase();
  var remainingTickets = Math.max(Number(ev.capacity || 0) - Number(ev.tickets_sold || 0), 0);
  var revenue = Number(ev.ticket_price || 0) * Number(ev.tickets_sold || 0);
  var attendanceRate = Number(ev.tickets_sold || 0) > 0
    ? Math.round((Number(ev.attendance_count || 0) / Number(ev.tickets_sold || 0)) * 100)
    : 0;

  var infoItems = [
    ['Organizer', organizer],
    ['Location', location],
    ['City', ev.city || 'Not provided'],
    ['Start Date', ev.start_date || 'Not provided'],
    ['End Date', ev.end_date || ev.start_date || 'Not provided'],
    ['Start Time', startTime],
    ['End Time', endTime],
    ['Capacity', Number(ev.capacity || 0).toLocaleString() + ' attendees'],
    ['Tickets Sold', Number(ev.tickets_sold || 0).toLocaleString()],
    ['Current Attendance', Number(ev.attendance_count || 0).toLocaleString()]
  ];

  return renderTopNav() +
    '<div style="max-width:1160px;margin:0 auto;padding:32px;">' +
      '<button class="btn-ghost" style="margin-bottom:24px;" onclick="navigate(\'home\')">Back to Events</button>' +
      '<div style="position:relative;border-radius:20px;overflow:hidden;margin-bottom:36px;">' +
        '<div style="height:320px;background:linear-gradient(135deg,rgba(155,16,64,0.24),rgba(255,180,0,0.12),rgba(255,255,255,0.03));"></div>' +
        '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(13,12,26,0.9) 0%,rgba(13,12,26,0.3) 60%,transparent 100%);"></div>' +
        '<div style="position:absolute;bottom:28px;left:32px;">' +
          '<span class="badge badge-cat" style="margin-bottom:10px;">' + category + '</span>' +
          '<h1 style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:clamp(24px,4vw,42px);letter-spacing:-0.02em;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.5);">' + ev.name + '</h1>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 360px;gap:28px;align-items:start;">' +
        '<div>' +
          '<div class="card" style="padding:28px;margin-bottom:24px;">' +
            '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:18px;margin-bottom:18px;">Event Information</h2>' +
            '<p style="color:var(--muted);line-height:1.8;margin-bottom:24px;">' + description + '</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
              infoItems.map(function(item) {
                return '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:14px;">' +
                  '<div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-family:\'Montserrat\',sans-serif;font-weight:600;">' + item[0] + '</div>' +
                  '<div style="font-weight:500;font-size:14px;">' + item[1] + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="card" style="padding:28px;">' +
            '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:18px;margin-bottom:6px;">Live Event Snapshot</h2>' +
            '<p style="color:var(--muted);font-size:13px;margin-bottom:20px;">These values are calculated from the current database records for this event.</p>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">' +
              [
                ['Remaining Tickets', remainingTickets.toLocaleString()],
                ['Attendance Rate', attendanceRate + '%'],
                ['Ticket Price', '$' + Number(ev.ticket_price || 0).toFixed(2)],
                ['Revenue', '$' + revenue.toFixed(2)]
              ].map(function(item) {
                return '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:14px;">' +
                  '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-family:\'Montserrat\',sans-serif;font-weight:600;">' + item[0] + '</div>' +
                  '<div style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:20px;">' + item[1] + '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="position:sticky;top:80px;">' +
          '<div class="card" style="padding:24px;">' +
            '<div style="text-align:center;margin-bottom:20px;">' +
              '<div style="font-size:12px;color:var(--muted);font-family:\'Montserrat\',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Current Crowd Level</div>' +
              levelBadge(crowdLevel) +
              '<div style="margin-top:12px;"><span style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:42px;color:' + capBarColor(pct) + ';">' + pct + '%</span><span style="font-size:14px;color:var(--muted);"> capacity</span></div>' +
            '</div>' +
            '<div class="cap-bar-outer" style="height:10px;margin-bottom:20px;">' +
              '<div class="cap-bar-inner" style="width:' + pct + '%;background:' + capBarColor(pct) + ';"></div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--muted);">Tickets Sold</span><span style="font-weight:500;">' + Number(ev.tickets_sold || 0).toLocaleString() + '</span></div>' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--muted);">Current Attendance</span><span style="font-weight:500;">' + Number(ev.attendance_count || 0).toLocaleString() + '</span></div>' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--muted);">Capacity</span><span style="font-weight:500;">' + Number(ev.capacity || 0).toLocaleString() + '</span></div>' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--muted);">Available Tickets</span><span style="font-weight:500;">' + remainingTickets.toLocaleString() + '</span></div>' +
            '</div>' +
            '<button class="btn-primary" style="width:100%;justify-content:center;font-size:15px;padding:14px;" onclick="buyTicket(' + ev.id + ')">Buy Ticket</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}


// ============================================================
//  BUY TICKET
// ============================================================
function buyTicket(eventId) {
  if (!state.user || !state.user.id) {
    showToast('You must log in first to purchase a ticket', 'error');
    navigate('login');
    return;
  }

  openPaymentModal(eventId);
}

window.buyTicket = buyTicket;


// ============================================================
//  PAYMENT MODAL
// ============================================================
function openPaymentModal(eventId) {
  var existing = document.getElementById('payment-modal');
  if (existing) existing.remove();

  var modal =
    '<div id="payment-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:3000;">' +
      '<div class="card" style="width:100%;max-width:460px;padding:24px;">' +
        '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:22px;margin-bottom:18px;">Payment Details</h2>' +
        '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<div><label class="field-label">Cardholder Name</label><input type="text" class="input-field" id="pay-name" placeholder="Name on card" /></div>' +
          '<div><label class="field-label">Card Number</label><input type="text" class="input-field" id="pay-number" placeholder="1234 5678 9012 3456" /></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><label class="field-label">Expiry Date</label><input type="text" class="input-field" id="pay-expiry" placeholder="MM/YY" /></div>' +
            '<div><label class="field-label">CVV</label><input type="text" class="input-field" id="pay-cvv" placeholder="123" /></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;">' +
          '<button class="btn-ghost" onclick="closePaymentModal()">Cancel</button>' +
          '<button class="btn-primary" onclick="confirmPayment(' + eventId + ')">Confirm Payment</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', modal);
}

window.openPaymentModal = openPaymentModal;


function closePaymentModal() {
  var modal = document.getElementById('payment-modal');
  if (modal) modal.remove();
}

window.closePaymentModal = closePaymentModal;


// ============================================================
//  CONFIRM PAYMENT
// ============================================================
async function confirmPayment(eventId) {
  var cardName = document.getElementById('pay-name').value.trim();
  var cardNumber = document.getElementById('pay-number').value.trim();
  var expiry = document.getElementById('pay-expiry').value.trim();
  var cvv = document.getElementById('pay-cvv').value.trim();

  if (!cardName || !cardNumber || !expiry || !cvv) {
    showToast('Please fill in all payment fields', 'error');
    return;
  }

  try {
    var response = await fetch('/api/events/' + eventId + '/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: state.user.id
      })
    });

    var data = await response.json();

    if (!response.ok) {
      showToast(data.message || 'Payment failed', 'error');
      return;
    }

    closePaymentModal();
    showToast('Payment successful. Ticket confirmed!', 'success');
    await loadEvents();
  } catch (error) {
    console.error(error);
    showToast('Server error', 'error');
  }
}

window.confirmPayment = confirmPayment;
