export const queryKeys = {
  dashboard: ['dashboard'],
  pickups: ['pickups'],
  complaints: ['complaints'],
  contentPages: ['content-pages'],
  users: (params = {}) => ['users', params],
  bins: ['bins'],
  wastePrices: ['waste-prices'],
  shifts: ['shifts'],
  roles: ['roles'],
  permissions: ['permissions'],
  recurringPickups: ['recurring-pickups'],
  collections: (contractId) => ['recurring-pickups', contractId, 'collections'],
  invoices: (params = {}) => ['monthly-invoices', params],
  clientDashboard: ['client-portal', 'dashboard'],
  scannedBin: (token) => ['bins', 'scan', token],
};

