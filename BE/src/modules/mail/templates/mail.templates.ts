export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );
}
export function emailFrame(title: string, message: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;line-height:1.6;color:#1b2420"><main style="max-width:560px;margin:auto;padding:24px"><h1 style="color:#1e7a4f">SanGo</h1><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><p>Trân trọng,<br>Đội ngũ SanGo</p></main></body></html>`;
}
