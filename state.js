// ============================================================
//  STATE
// ============================================================
var state = {
  user: null,
  view: 'home',
  params: {},
  notifFilter: 'all',
  catFilter: 'all',
  searchQuery: '',
  loginRole: 'customer',

  // events
  realEvents: [],
  eventsLoaded: false,
  eventsLoading: false,
  dashboardPolling: null,
  dashboardLastUpdated: null,

  // reports
  reportFilters: {
    eventId: '',
    start: '',
    end: ''
  },
  currentReport: null
};
var savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-mode');
}


// ============================================================
//  CHART REGISTRY
// ============================================================
var chartReg = {};

function destroyAllCharts() {
  Object.keys(chartReg).forEach(function(k) {
    try {
      chartReg[k].destroy();
    } catch (e) {}
    delete chartReg[k];
  });
}
