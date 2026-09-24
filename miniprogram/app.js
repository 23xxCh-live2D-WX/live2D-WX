const { CLOUD_ENV_ID } = require('./config')

App({
  globalData: { cloudReady: false },
  onLaunch() {
    if (!CLOUD_ENV_ID || !wx.cloud) return
    wx.cloud.init({ env: CLOUD_ENV_ID })
    this.globalData.cloudReady = Boolean(wx.cloud.extend && wx.cloud.extend.AI)
  },
})
