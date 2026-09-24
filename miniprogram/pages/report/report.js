const { generate } = require('../../utils/cloudAi')

const DEMO_REVIEW = '这是一份固定练习提示，不是 AI 评分。\n\n做得好：你已经完成一整场问答。\n\n下一步：回看每题，标出具体场景、你本人采取的行动和可核实的结果；如果只有“我们完成了项目”，请补上你的个人贡献。\n\n重答建议：选最不满意的一题，先用一句话说结论，再用两三句讲事实。'

Page({
  data: { job: '', answers: [], report: '', loading: true, aiGenerated: false, duration: 0 },
  async onLoad() {
    const session = wx.getStorageSync('lastInterview')
    if (!session || !Array.isArray(session.answers) || !session.answers.length) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    const duration = Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000))
    this.setData({ job: session.job, answers: session.answers, duration })
    let report = DEMO_REVIEW
    let aiGenerated = false
    if (session.useCloud) {
      try {
        report = await generate(
          '你是模拟面试练习教练。只根据求职者实际回答复盘，不编造经历，不预测录用结果，不做心理诊断。按“做得好、下一步、重答建议”三段写，合计不超过240字。',
          `目标岗位：${session.job}\n问答：${JSON.stringify(session.answers)}`
        )
        aiGenerated = true
      } catch (error) {
        report = DEMO_REVIEW + '\n\n云端复盘暂不可用，已显示固定提示。'
      }
    }
    this.setData({ report, aiGenerated, loading: false })
  },
  restart() {
    wx.redirectTo({ url: '/pages/index/index' })
  },
  clear() {
    wx.showModal({
      title: '删除本次回答？',
      content: '删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('lastInterview')
          wx.redirectTo({ url: '/pages/index/index' })
        }
      },
    })
  },
})
