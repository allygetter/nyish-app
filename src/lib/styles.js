export const COLORS = {
  cream: '#FFFDF8',
  creamDark: '#F5F0E8',
  brown: '#6B3A28',
  brownLight: '#8B5E3C',
  brownDark: '#4A2518',
  gold: '#C9A227',
  goldLight: '#D4B84A',
  goldMuted: '#B8956A',
  green: '#2D6A4F',
  red: '#9B2335',
  blue: '#2B4C7E',
  text: '#6B3A28',
  textLight: '#9B7B6B',
  textMuted: '#B8A090',
  border: '#E8DDD0',
  cardBg: '#FFFFFF',
  shadow: '0 2px 12px rgba(107,58,40,0.08)',
  shadowHover: '0 4px 20px rgba(107,58,40,0.12)',
};

export const FONTS = {
  display: "'Fraunces', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
};

export const AVATAR_COLORS = [
  '#6B3A28', '#8B5E3C', '#C9A227', '#2D6A4F',
  '#2B4C7E', '#9B2335', '#7B5BA0', '#4A7C59',
];

export function getAvatarColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function formatCurrency(amount) {
  if (amount == null) return 'KES 0';
  return 'KES ' + Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
