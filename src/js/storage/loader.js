// loader.js — 统一 JSON 加载
export async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}
