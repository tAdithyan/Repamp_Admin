const colors = ['#009e73', '#2563eb', '#e69f00', '#9333ea', '#dc4b5a', '#0891b2', '#854d0e', '#64748b'];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const number = value => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function chartSvg({ title, month, rows, type }) {
  const width = 1400;
  const columns = 12;
  const chartHeight = type === 'bar' ? Math.max(1, Math.ceil(rows.length / columns)) * 320 : 340;
  // Include every full area name in the key, including off-screen chart entries.
  const labels = rows.map((row, index) => {
    const text = `${index + 1}. ${row.label}${row.district ? ` (${row.district})` : ''} — ${number(row.weight)} kg · ${row.pickups} pickups`;
    return text.match(/.{1,110}(?:\s|$)|.{1,110}/gu) || [text];
  });
  const height = 160 + chartHeight + labels.reduce((sum, lines) => sum + lines.length * 24 + 10, 0);
  const text = (x, y, value, size = 16, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(value)}</text>`;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif" fill="#122b35">`, text(40, 45, title, 26), text(40, 76, `${month} · Collected weight (kg) · ${type} chart`)];
  const maximum = Math.max(0, ...rows.map(row => row.weight));
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  if (type === 'bar') {
    rows.forEach((row, index) => {
      const x = 90 + (index % columns) * 108;
      const baseline = 340 + Math.floor(index / columns) * 320;
      const barHeight = maximum > 0 ? row.weight / maximum * 200 : 0;
      parts.push(`<path d="M${x - 35},${baseline}h80" stroke="#d9e3e1"/>`, `<rect x="${x - 20}" y="${baseline - barHeight}" width="42" height="${barHeight}" rx="4" fill="#009e73"/>`, text(x, baseline - barHeight - 10, number(row.weight), 13, 'text-anchor="middle"'), text(x, baseline + 25, index + 1, 13, 'text-anchor="middle"'));
    });
  } else if (total > 0) {
    let angle = -Math.PI / 2;
    rows.forEach((row, index) => {
      if (row.weight <= 0) return;
      const end = angle + row.weight / total * Math.PI * 2;
      const fill = colors[index % colors.length];
      if (row.weight === total) parts.push(`<circle cx="700" cy="265" r="145" fill="${fill}"/>`);
      else parts.push(`<path d="M700,265 L${700 + 145 * Math.cos(angle)},${265 + 145 * Math.sin(angle)} A145,145 0 ${end - angle > Math.PI ? 1 : 0},1 ${700 + 145 * Math.cos(end)},${265 + 145 * Math.sin(end)} Z" fill="${fill}"/>`);
      angle = end;
    });
    if (type === 'donut') parts.push('<circle cx="700" cy="265" r="76" fill="white"/>', text(700, 270, `${number(total)} kg`, 20, 'text-anchor="middle"'));
  } else parts.push(text(40, 160, 'No collected weight to show as proportions.'));
  let y = 125 + chartHeight;
  labels.forEach((lines, index) => {
    parts.push(`<rect x="40" y="${y - 13}" width="12" height="12" rx="2" fill="${type === 'bar' ? '#009e73' : colors[index % colors.length]}"/>`);
    lines.forEach(line => { parts.push(text(64, y, line)); y += 24; });
    y += 10;
  });
  parts.push('</g></svg>');
  return { svg: parts.join(''), width, height };
}
