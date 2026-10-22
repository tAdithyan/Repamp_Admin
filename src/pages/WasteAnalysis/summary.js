export function summarizeWaste(rows, month) {
  const [year, number] = month.split('-').map(Number);
  const days = Array.from({length:new Date(Date.UTC(year, number, 0)).getUTCDate()}, (_, i) => ({day:`${month}-${String(i+1).padStart(2,'0')}`,weight:0,pickups:0,estimated:0}));
  const byDay = new Map(days.map(day => [day.day,day]));
  const categories = new Map();
  for (const row of rows) {
    const day = byDay.get(row.day);
    if (!day) continue;
    day.weight += Number(row.weight || 0); day.pickups += row.pickups; day.estimated += row.estimated;
    categories.set(row.wasteType, (categories.get(row.wasteType) || 0) + Number(row.weight || 0));
  }
  return { days, categories:[...categories].sort((a,b)=>b[1]-a[1]), total:days.reduce((sum,d)=>sum+d.weight,0), pickups:days.reduce((sum,d)=>sum+d.pickups,0), estimated:days.reduce((sum,d)=>sum+d.estimated,0) };
}

export function summarizeLocations(rows) {
  const districts = new Map();
  const panchayats = [], municipalities = [];
  let unknownPickups = 0;
  for (const row of rows) {
    const key = row.districtId || row.district || 'unknown';
    const district = districts.get(key) || { key, label: row.district || 'Unknown district', weight: 0, pickups: 0 };
    district.weight += Number(row.weight || 0);
    district.pickups += Number(row.pickups || 0);
    districts.set(key, district);
    const item = { key: key + ':' + row.type + ':' + row.localBody, label: row.localBody || 'Unknown local body', district: district.label, weight: Number(row.weight || 0), pickups: Number(row.pickups || 0) };
    if (row.type === 'panjayath') panchayats.push(item);
    else if (row.type === 'municipalaty') municipalities.push(item);
    else unknownPickups += item.pickups;
  }
  const sorted = items => items.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));
  return { districts: sorted([...districts.values()]), panchayats: sorted(panchayats), municipalities: sorted(municipalities), unknownPickups };
}
