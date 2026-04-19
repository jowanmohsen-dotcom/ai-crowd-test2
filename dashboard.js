// ============================================================
//  VIEW: DASHBOARD
// ============================================================
function renderDashboard() {
  if (!state.user || state.user.role !== 'organizer') {
    showToast('Access denied', 'error');
    navigate('home');
    return '';
  }

  if (!state.eventsLoaded && !state.eventsLoading) {
    loadDashboardData();
  }

  if (state.eventsLoading) {
    return '<div class="org-layout">' +
      renderSidebar('dashboard') +
      '<main class="org-main">' +
        '<div style="padding:32px;">' +
          '<div class="card" style="padding:32px;text-align:center;">' +
            '<h2 style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:22px;margin-bottom:12px;">Loading Dashboard...</h2>' +
            '<p style="color:var(--muted);">Please wait while events are loaded from the database.</p>' +
          '</div>' +
        '</div>' +
      '</main>' +
    '</div>';
  }

  var events = state.realEvents || [];
  var today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  var totalTickets = events.reduce(function(sum, ev) {
    return sum + Number(ev.tickets_sold || 0);
  }, 0);
  var totalAttendance = events.reduce(function(sum, ev) {
    return sum + Number(ev.attendance_count || 0);
  }, 0);
  var totalCapacity = events.reduce(function(sum, ev) {
    return sum + Number(ev.capacity || 0);
  }, 0);
  var occupancyRate = totalCapacity ? Math.round((totalAttendance / totalCapacity) * 100) : 0;
  var highEvents = events.filter(function(ev) {
    return (ev.crowd_level || '').toLowerCase() === 'high';
  });
  var activeAlerts = highEvents.length;
  var topForecastEvent = getTopForecastEvent(events);
  var averagePredictedPeak = events.length ? Math.round(events.reduce(function(sum, ev) {
    return sum + Number(ev.prediction && ev.prediction.predicted_peak_percent || 0);
  }, 0) / events.length) : 0;
  var topForecastPrediction = topForecastEvent && topForecastEvent.prediction ? topForecastEvent.prediction : null;
  var lastUpdatedText = state.dashboardLastUpdated
    ? new Date(state.dashboardLastUpdated).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      })
    : 'Waiting for live data';

  return '' +
    '<div class="org-layout">' +
      renderSidebar('dashboard') +
      '<main class="org-main">' +
        '<div style="padding:30px;">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px;">' +
            '<div>' +
              '<h1 style="font-family:\'Montserrat\',sans-serif;font-size:40px;font-weight:900;letter-spacing:-0.03em;margin-bottom:6px;">Dashboard</h1>' +
              '<div style="font-size:14px;color:var(--muted);">Today: ' + today + '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
              '<div style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:rgba(34,197,94,0.12);color:#7CFC98;font-size:12px;font-weight:800;border:1px solid rgba(124,252,152,0.2);">' +
                '<span style="width:8px;height:8px;border-radius:50%;background:#7CFC98;box-shadow:0 0 0 0 rgba(124,252,152,0.7);animation:livePulse 1.6s infinite;"></span>' +
                '<span>LIVE PREDICTION</span>' +
              '</div>' +
              '<div style="font-size:12px;color:var(--muted);">Updated: ' + lastUpdatedText + '</div>' +
              '<button class="btn-primary" onclick="navigate(\'notifications\')" style="padding:12px 18px;">View Notifications</button>' +
            '</div>' +
          '</div>' +

          '<div style="margin-bottom:20px;padding:16px 18px;border-radius:16px;border:1px solid rgba(255,120,120,0.35);background:linear-gradient(135deg,rgba(155,16,64,0.20),rgba(255,120,120,0.12));display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">' +
            '<div>' +
              '<div style="font-weight:800;color:#ff8b8b;font-size:16px;margin-bottom:4px;">AI Crowd Forecast</div>' +
              '<div style="color:#f5d6d6;font-size:14px;">' +
                (topForecastEvent
                  ? topForecastEvent.name + ' is predicted to peak at ' + Number(topForecastEvent.prediction.predicted_peak_percent || 0) + '% capacity.'
                  : 'Create events and collect ticket/attendance data to generate predictions.'
                ) +
              '</div>' +
            '</div>' +
            '<button class="btn-ghost" onclick="navigate(\'reports\')" style="border-color:rgba(255,255,255,0.15);">Open Reports</button>' +
          '</div>' +

          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px;">' +
            renderDashboardStat('TOTAL TICKETS SOLD', totalTickets.toLocaleString(), 'Tickets recorded in the database') +
            renderDashboardStat('CURRENT ATTENDANCE', totalAttendance.toLocaleString(), 'Entries scanned at the gate') +
            renderDashboardStat('AVG PREDICTED PEAK', averagePredictedPeak + '%', 'Average projected crowd peak across your events') +
            renderDashboardStat('ACTIVE ALERTS', String(activeAlerts), activeAlerts ? 'Events currently flagged as high density' : 'No active density alerts') +
          '</div>' +

          '<div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:18px;margin-bottom:20px;align-items:start;">' +
            '<div class="card" style="padding:18px;">' +
              '<h3 style="font-family:\'Montserrat\',sans-serif;font-size:22px;font-weight:800;margin-bottom:12px;">Current vs Predicted Crowd</h3>' +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;">' +
                '<div style="font-size:13px;color:var(--muted);">Current attendance compared with predicted peak attendance for each event.</div>' +
                '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);">' +
                  chartLegendSwatch('rgba(255,95,141,0.85)', 'Current') +
                  chartLegendSwatch('rgba(255,216,77,0.85)', 'Predicted peak') +
                '</div>' +
              '</div>' +
              '<div style="height:320px;"><canvas id="chart-attendance-timeline"></canvas></div>' +
            '</div>' +
            '<div class="card" style="padding:22px;">' +
              '<h3 style="font-family:\'Montserrat\',sans-serif;font-size:22px;font-weight:800;margin-bottom:12px;">Forecast Summary</h3>' +
              (topForecastEvent
                ? renderForecastSummary(topForecastEvent, occupancyRate)
                : '<p style="color:var(--muted);font-size:14px;">Predictions will appear here once real event data is available.</p>'
              ) +
            '</div>' +
          '</div>' +

          '<div class="card" style="padding:18px;margin-bottom:20px;">' +
            '<h3 style="font-family:\'Montserrat\',sans-serif;font-size:22px;font-weight:800;margin-bottom:14px;">Next 6 Hours Crowd Prediction</h3>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;">' +
              '<div style="font-size:13px;color:var(--muted);">' +
                (topForecastEvent
                  ? 'Live forecast for ' + topForecastEvent.name + ', based on current tickets, attendance, and event timing.'
                  : 'The hourly forecast will appear once live event data is available.'
                ) +
              '</div>' +
              (topForecastEvent
                ? '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                    miniLiveStat('Current', Number(topForecastEvent.attendance_count || 0).toLocaleString()) +
                    miniLiveStat('Next Hour', '+' + Number(topForecastPrediction && topForecastPrediction.next_hour_expected_entries || 0).toLocaleString()) +
                    miniLiveStat('Peak', Number(topForecastPrediction && topForecastPrediction.predicted_peak_percent || 0) + '%') +
                  '</div>'
                : ''
              ) +
            '</div>' +
            '<div style="height:300px;"><canvas id="chart-crowd-forecast"></canvas></div>' +
          '</div>' +

          '<div class="card" style="padding:0;overflow:hidden;">' +
            '<div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
              '<h3 style="font-family:\'Montserrat\',sans-serif;font-size:22px;font-weight:800;">Event Management</h3>' +
              '<button class="btn-primary" onclick="navigate(\'create\')">+ New Event</button>' +
            '</div>' +
            '<div style="overflow-x:auto;">' +
              '<table class="data-table">' +
                '<thead>' +
                  '<tr>' +
                    '<th>EVENT</th>' +
                    '<th>CURRENT</th>' +
                    '<th>PREDICTED PEAK</th>' +
                    '<th>FINAL ATTENDANCE</th>' +
                    '<th>CONFIDENCE</th>' +
                    '<th>ACTIONS</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
                  (events.length
                    ? events.map(function(ev) {
                        var prediction = ev.prediction || {};
                        return '<tr>' +
                          '<td><div style="font-weight:700;">' + (ev.name || 'Event') + '</div><div style="font-size:12px;color:var(--muted);">' + (ev.city || 'No city') + '</div></td>' +
                          '<td><div>' + Number(ev.attendance_count || 0).toLocaleString() + ' / ' + Number(ev.capacity || 0).toLocaleString() + '</div><div style="font-size:12px;color:var(--muted);">' + levelBadge((ev.crowd_level || 'low').toLowerCase()) + '</div></td>' +
                          '<td><div style="font-weight:700;">' + Number(prediction.predicted_peak_percent || 0) + '%</div><div style="font-size:12px;color:var(--muted);">' + (prediction.predicted_crowd_level || 'Unknown') + '</div></td>' +
                          '<td><div style="font-weight:700;">' + Number(prediction.predicted_final_attendance || 0).toLocaleString() + '</div><div style="font-size:12px;color:var(--muted);">+' + Number(prediction.next_hour_expected_entries || 0).toLocaleString() + ' next hour</div></td>' +
                          '<td>' + renderConfidencePill(prediction.forecast_confidence || 'Low') + '</td>' +
                          '<td><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn-ghost" onclick="navigate(\'edit\',{id:' + ev.id + '})">Edit</button><button class="btn-ghost" onclick="openEventReport(' + ev.id + ')">Report</button></div></td>' +
                        '</tr>';
                      }).join('')
                    : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">No events found.</td></tr>'
                  ) +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</main>' +
    '</div>';
}


// ============================================================
//  SMALL HELPERS
// ============================================================
function renderDashboardStat(label, value, meta) {
  return '<div class="card" style="padding:18px;">' +
    '<div style="font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--muted);text-transform:uppercase;margin-bottom:18px;">' + label + '</div>' +
    '<div style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:44px;line-height:1;margin-bottom:10px;">' + value + '</div>' +
    '<div style="font-size:14px;color:var(--muted);">' + meta + '</div>' +
  '</div>';
}

function renderConfidencePill(confidence) {
  var color = '#F59E0B';
  var bg = 'rgba(245,158,11,0.14)';

  if (confidence === 'High') {
    color = '#22C55E';
    bg = 'rgba(34,197,94,0.14)';
  } else if (confidence === 'Low') {
    color = '#EF4444';
    bg = 'rgba(239,68,68,0.14)';
  }

  return '<span style="padding:8px 12px;border-radius:999px;background:' + bg + ';color:' + color + ';font-size:12px;font-weight:800;border:1px solid rgba(255,255,255,0.08);">' + confidence + '</span>';
}

function chartLegendSwatch(color, label) {
  return '<span style="display:inline-flex;align-items:center;gap:7px;">' +
    '<span style="width:10px;height:10px;border-radius:3px;background:' + color + ';display:inline-block;"></span>' +
    '<span>' + label + '</span>' +
  '</span>';
}

function miniLiveStat(label, value) {
  return '<div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid var(--border);min-width:84px;">' +
    '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:2px;">' + label + '</div>' +
    '<div style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:15px;">' + value + '</div>' +
  '</div>';
}

function getTopForecastEvent(events) {
  if (!events.length) return null;

  return events.slice().sort(function(a, b) {
    return Number((b.prediction && b.prediction.predicted_peak_percent) || 0) - Number((a.prediction && a.prediction.predicted_peak_percent) || 0);
  })[0];
}

function renderForecastSummary(eventData, occupancyRate) {
  var prediction = eventData.prediction || {};

  return '' +
    '<div style="display:flex;flex-direction:column;gap:14px;">' +
      '<div>' +
        '<div style="font-size:12px;color:var(--muted);text-transform:uppercase;font-weight:700;letter-spacing:.06em;">Most at risk event</div>' +
        '<div style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:26px;margin-top:6px;">' + eventData.name + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        forecastMiniCard('Current Crowd', Number(eventData.attendance_count || 0).toLocaleString()) +
        forecastMiniCard('Predicted Peak', Number(prediction.predicted_peak_attendance || 0).toLocaleString()) +
        forecastMiniCard('Peak Capacity', Number(prediction.predicted_peak_percent || 0) + '%') +
        forecastMiniCard('Confidence', prediction.forecast_confidence || 'Low') +
      '</div>' +
      '<p style="color:var(--muted);line-height:1.7;margin:0;">' + (prediction.forecast_summary || 'Prediction summary is not available yet.') + '</p>' +
      '<div style="font-size:13px;color:var(--muted);">Portfolio occupancy right now: ' + occupancyRate + '%</div>' +
    '</div>';
}

function forecastMiniCard(label, value) {
  return '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:14px;">' +
    '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:6px;">' + label + '</div>' +
    '<div style="font-family:\'Montserrat\',sans-serif;font-weight:800;font-size:20px;">' + value + '</div>' +
  '</div>';
}


// ============================================================
//  DASHBOARD CHARTS
// ============================================================
function initDashboardCharts() {
  if (typeof Chart === 'undefined') return;

  var events = state.realEvents || [];
  if (!events.length) return;

  var labels = events.map(function(ev) { return ev.name || 'Event'; });
  var attendanceData = events.map(function(ev) { return Number(ev.attendance_count || 0); });
  var predictedPeakData = events.map(function(ev) {
    return Number(ev.prediction && ev.prediction.predicted_peak_attendance || 0);
  });

  var topForecastEvent = getTopForecastEvent(events);
  var hourlyLabels = topForecastEvent && topForecastEvent.prediction && Array.isArray(topForecastEvent.prediction.hourly_forecast)
    ? topForecastEvent.prediction.hourly_forecast.map(function(point) { return point.label; })
    : [];
  var hourlyPercentData = topForecastEvent && topForecastEvent.prediction && Array.isArray(topForecastEvent.prediction.hourly_forecast)
    ? topForecastEvent.prediction.hourly_forecast.map(function(point) { return Number(point.percent || 0); })
    : [];

  Chart.defaults.color = 'rgba(230,225,255,0.68)';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';

  var attendanceCanvas = document.getElementById('chart-attendance-timeline');
  if (attendanceCanvas) {
    if (chartReg.attendanceTimeline) {
      chartReg.attendanceTimeline.destroy();
    }

    chartReg.attendanceTimeline = new Chart(attendanceCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Current Attendance',
            data: attendanceData,
            backgroundColor: 'rgba(255,95,141,0.75)',
            borderRadius: 10
          },
          {
            label: 'Predicted Peak Attendance',
            data: predictedPeakData,
            backgroundColor: 'rgba(255,216,77,0.75)',
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + Number(context.parsed.y || 0).toLocaleString() + ' people';
              }
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              font: { size: 11 },
              maxRotation: 0,
              minRotation: 0
            },
            title: {
              display: true,
              text: 'Events',
              color: 'rgba(230,225,255,0.68)',
              font: { family: 'Montserrat', size: 11, weight: '700' }
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              font: { size: 11 },
              callback: function(v) { return Number(v).toLocaleString(); }
            },
            title: {
              display: true,
              text: 'People',
              color: 'rgba(230,225,255,0.68)',
              font: { family: 'Montserrat', size: 11, weight: '700' }
            }
          }
        }
      }
    });
  }

  var forecastCanvas = document.getElementById('chart-crowd-forecast');
  if (forecastCanvas && hourlyLabels.length) {
    if (chartReg.crowdForecast) {
      chartReg.crowdForecast.destroy();
    }

    var hourlyBarColors = hourlyPercentData.map(function(value) {
      if (value < 50) return 'rgba(34,197,94,0.9)';
      if (value < 80) return 'rgba(245,158,11,0.92)';
      return 'rgba(239,68,68,0.92)';
    });

    chartReg.crowdForecast = new Chart(forecastCanvas, {
      type: 'bar',
      data: {
        labels: hourlyLabels,
        datasets: [{
          label: topForecastEvent.name + ' forecast',
          data: hourlyPercentData,
          backgroundColor: hourlyBarColors,
          borderColor: hourlyBarColors,
          borderWidth: 1,
          borderRadius: 10,
          barThickness: 36,
          maxBarThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Predicted occupancy: ' + Number(context.parsed.y || 0) + '%';
              },
              afterLabel: function(context) {
                var value = Number(context.parsed.y || 0);
                if (value < 50) return 'Risk level: Low';
                if (value < 80) return 'Risk level: Medium';
                return 'Risk level: High';
              }
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { font: { size: 11 } },
            title: {
              display: true,
              text: 'Live Forecast Window',
              color: 'rgba(230,225,255,0.68)',
              font: { family: 'Montserrat', size: 11, weight: '700' }
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              font: { size: 11 },
              callback: function(v) { return v + '%'; }
            },
            title: {
              display: true,
              text: 'Predicted Occupancy',
              color: 'rgba(230,225,255,0.68)',
              font: { family: 'Montserrat', size: 11, weight: '700' }
            }
          }
        }
      }
    });
  }
}


// ============================================================
//  LOAD DASHBOARD DATA
// ============================================================
async function loadDashboardData() {
  return loadDashboardDataInternal(false, false);
}

async function loadDashboardDataSilently() {
  return loadDashboardDataInternal(true, true);
}

async function loadDashboardDataInternal(silent, preserveScroll) {
  if (state.eventsLoading) return;

  state.eventsLoading = true;

  try {
    if (!state.user || !state.user.id) {
      state.eventsLoading = false;
      if (!silent) showToast('User ID not found', 'error');
      return;
    }

    var response = await fetch('/api/organizer/events/' + state.user.id);
    var data = await response.json();

    if (!response.ok) {
      state.realEvents = [];
      state.eventsLoaded = true;
      state.eventsLoading = false;
      if (!silent) showToast(data.message || 'Failed to load events', 'error');
      render({ preserveScroll: preserveScroll });
      return;
    }

    state.realEvents = data;
    state.eventsLoaded = true;
    state.eventsLoading = false;
    state.dashboardLastUpdated = new Date().toISOString();
    render({ preserveScroll: preserveScroll });
  } catch (error) {
    console.error('DASHBOARD ERROR:', error);
    state.realEvents = [];
    state.eventsLoaded = true;
    state.eventsLoading = false;
    if (!silent) showToast('Server error loading dashboard', 'error');
    render({ preserveScroll: preserveScroll });
  }
}

function startDashboardPolling() {
  stopDashboardPolling();
  state.dashboardPolling = setInterval(function() {
    if (state.view === 'dashboard' && state.user && state.user.role === 'organizer') {
      loadDashboardDataSilently();
    }
  }, 5000);
}

function stopDashboardPolling() {
  if (state.dashboardPolling) {
    clearInterval(state.dashboardPolling);
    state.dashboardPolling = null;
  }
}

window.startDashboardPolling = startDashboardPolling;
window.stopDashboardPolling = stopDashboardPolling;


// ============================================================
//  OPEN REPORT
// ============================================================
function openEventReport(eventId) {
  state.reportFilters = state.reportFilters || {};
  state.reportFilters.eventId = String(eventId);
  navigate('reports');
}
window.openEventReport = openEventReport;
