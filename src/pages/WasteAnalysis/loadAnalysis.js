export function locationsFromPickups(pickups, districts, month) {
  const names = new Map(districts.map(d => [String(d._id || d.id), d.districtName]));
  const groups = new Map();
  for (const pickup of pickups) {
    const date = new Date(pickup.completedAt ?? pickup.updatedAt).getTime();
    if (pickup.status !== 'completed' || !Number.isFinite(date) ||
        new Date(date + 330 * 60000).toISOString().slice(0, 7) !== month) continue;
    const customer = pickup.customerId || {};
    const districtId = customer.district?._id || customer.district?.id || customer.district || null;
    const district = customer.district?.districtName || names.get(String(districtId)) || 'Unknown district';
    const type = customer.localbodytype || 'unknown';
    const localBody = (customer.localbody || '').trim();
    const key = JSON.stringify([districtId, type, localBody]);
    const row = groups.get(key) || { districtId, district, type, localBody, weight: 0, pickups: 0 };
    row.weight += Number(pickup.weight || 0);
    row.pickups += 1;
    groups.set(key, row);
  }
  return [...groups.values()];
}

export async function loadAnalysis(api, month, signal) {
  const { data: { data } } = await api.get('/v1/dashboard/waste-analysis', { params: { month }, signal });
  if (Array.isArray(data.locations)) return data;
  try {
    // Older deployed analytics endpoints only return daily totals.
    const [pickups, districts] = await Promise.all([
      api.get('/v1/pickups/status/completed', { signal }),
      api.get('/v1/locations/districts', { signal }),
    ]);
    if (!Array.isArray(pickups.data.data) || !Array.isArray(districts.data)) throw new Error('Invalid area response');
    const locations = locationsFromPickups(pickups.data.data, districts.data, month);
    const count = locations.reduce((sum, row) => sum + row.pickups, 0);
    const expected = data.rows.reduce((sum, row) => sum + Number(row.pickups || 0), 0);
    const weight = locations.reduce((sum, row) => sum + row.weight, 0);
    const expectedWeight = data.rows.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    if (count !== expected || Math.abs(weight - expectedWeight) > 0.01) throw new Error('Area totals do not match');
    return { ...data, locations };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ...data, areaError: true };
  }
}
