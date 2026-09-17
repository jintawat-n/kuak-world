/* WebSocket client with auto-reconnect */
window.Net = (() => {
  let ws = null, token = null, handlers = {}, timer = null, closedByUs = false;
  function on(t, fn) { (handlers[t] = handlers[t] || []).push(fn); }
  function emit(t, m) { for (const fn of handlers[t] || []) { try { fn(m); } catch (e) { console.error('handler', t, e); } } }
  function connect(tok) {
    token = tok; closedByUs = false;
    if (ws) { try { ws.onclose = null; ws.close(); } catch {} }
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => { send({ t: 'auth', token }); emit('_open'); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } emit(m.t, m); emit('*', m); };
    ws.onclose = () => { emit('_close'); if (!closedByUs) timer = setTimeout(() => connect(token), 2000); };
    ws.onerror = () => {};
  }
  function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
  function close() { closedByUs = true; clearTimeout(timer); if (ws) ws.close(); }
  return { on, send, connect, close, get connected() { return ws && ws.readyState === 1; } };
})();
