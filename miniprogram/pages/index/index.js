const { cloudReady } = require('../../utils/cloudAi')

Page({
  data: {
    job: '',
    mode: 'animated',
    consent: false,
    cloudAvailable: false,
    hasReport: false,
  },
  onShow() {
    let session
    try { session = wx.getStorageSync('lastInterview') } catch (error) {}
    this.setData({ cloudAvailable: cloudReady(), hasReport: Boolean(session && Array.isArray(session.answers) && session.answers.length === 6) })
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
  viewLast() {
    wx.navigateTo({ url: '/pages/report/report' })
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
