const { cloudReady } = require('../../utils/cloudAi')

Page({
  data: {
    job: '',
    mode: 'animated',
    consent: false,
    cloudAvailable: false,
  },
  onShow() {
    this.setData({ cloudAvailable: cloudReady() })
  },
  onJobInput(event) {
    this.setData({ job: event.detail.value })
  },
  onModeChange(event) {
    this.setData({ mode: event.currentTarget.dataset.mode })
  },
  onConsentChange(event) {
    this.setData({ consent: event.detail.value })
  },
  start() {
    const job = this.data.job.trim()
    if (job.length < 2 || job.length > 40) {
      wx.showToast({ title: '请输入 2–40 字目标岗位', icon: 'none' })
      return
    }
    const useCloud = this.data.cloudAvailable && this.data.consent
    wx.navigateTo({
      url: `/pages/interview/interview?job=${encodeURIComponent(job)}&mode=${this.data.mode}&cloud=${useCloud ? 1 : 0}`,
    })
  },
})
