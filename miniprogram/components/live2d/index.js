// Cubism Core's embedded runtime needs atob; Mini Program JS does not always provide it.
if (typeof globalThis.atob !== 'function') {
  globalThis.atob = text => {
    const bytes = new Uint8Array(wx.base64ToArrayBuffer(text));
    let result = '';
    for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return result;
  };
}
const { start } = require('./renderer');

Component({
  options: { styleIsolation: 'isolated' },
  properties: {
    state: { type: String, value: 'idle' },
    size: { type: Number, value: 320 },
    model: { type: String, value: '' }
  },
  data: { rendered: false },
  lifetimes: {
    ready() {
      if (!this.properties.model) return;
      this._closed = false;
      this.createSelectorQuery().select('#modelCanvas').fields({ node: true, size: true }).exec(async ([res]) => {
        if (!res || !res.node || this._closed) return;
        try {
          const session = await start(res.node, res.width, res.height, this.properties.model, () => this.properties.state);
          if (this._closed) return session.stop();
          this._session = session;
          this.setData({ rendered: true });
        } catch (error) {
          console.info('Live2D local model unavailable:', error.message || error.errMsg || String(error));
        }
      });
    },
    detached() {
      this._closed = true;
      if (this._session) this._session.stop();
    }
  }
});
