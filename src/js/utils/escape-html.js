// escape-html.js — XSS防护: 转义HTML特殊字符
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(str) { return String(str ?? '').replace(/[&<>"']/g, c => ENTITIES[c]); }
