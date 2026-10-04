const { generate } = require('../../utils/cloudAi')
const { validateAnswer } = require('../../utils/coach')

const DEMO_REVIEW = '这是一份固定练习提示，不是 AI 评分。\n\n做得好：你已经完成一整场问答。\n\n下一步：回看每题，标出具体场景、你本人采取的行动和可核实的结果；如果只有“我们完成了项目”，请补上你的个人贡献。\n\n重答建议：选最不满意的一题，先用一句话说结论，再用两三句讲事实。'

Page({
  data: { job: '', questions: [], report: '', loading: true, aiGenerated: false, duration: 0, rewriteIndex: -1, rewriteDraft: '' },
  async onLoad() {
    let session
    try { session = wx.getStorageSync('lastInterview') } catch (error) {
      wx.showToast({ title: '无法读取本机回答，请重试', icon: 'none' })
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    if (!session || !Array.isArray(session.answers) || session.answers.length !== 6 ||
      session.answers.some((item) => !item || typeof item.question !== 'string' || typeof item.answer !== 'string')) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    this.active = true
    this.session = session
    const questions = []
    for (let i = 0; i < session.answers.length; i += 2) {
      const rewrite = session.rewrites && session.rewrites[i / 2]
      questions.push({
        question: session.answers[i].question,
        answer: session.answers[i].answer,
        probe: session.answers[i + 1].question,
        probeAnswer: session.answers[i + 1].answer,
        rewrite: rewrite && validateAnswer(rewrite.answer).ok ? rewrite.answer : '',
      })
    }
    const duration = Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000))
    this.setData({ job: session.job, questions, duration })
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
    if (this.active) this.setData({ report, aiGenerated, loading: false })
  },
  selectRewrite(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(index) || index < 0 || index >= this.data.questions.length) return
    const current = this.data.rewriteIndex
    if (index === current) return
    if (current >= 0 && this.data.rewriteDraft !== this.data.questions[current].rewrite) {
      wx.showToast({ title: '先保存或取消当前重答，再切换题目', icon: 'none' })
      return
    }
    this.setData({ rewriteIndex: index, rewriteDraft: this.data.questions[index].rewrite })
  },
  onRewriteInput(event) {
    this.setData({ rewriteDraft: event.detail.value })
  },
  saveRewrite() {
    const index = this.data.rewriteIndex
    if (!this.session || !Number.isInteger(index) || index < 0 || index >= this.data.questions.length) return
    const result = validateAnswer(this.data.rewriteDraft)
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }
    const session = {
      ...this.session,
      rewrites: { ...this.session.rewrites, [index]: { answer: result.answer, savedAt: Date.now() } },
    }
    try {
      wx.setStorageSync('lastInterview', session)
    } catch (error) {
      wx.showToast({ title: '保存失败，重答仍在输入框中，请重试', icon: 'none' })
      return
    }
    this.session = session
    this.setData({ questions: this.data.questions.map((item, i) => i === index ? { ...item, rewrite: result.answer } : item), rewriteIndex: -1, rewriteDraft: '' })
    wx.showToast({ title: '重答已保存在本机', icon: 'success' })
  },
  cancelRewrite() {
    this.setData({ rewriteIndex: -1, rewriteDraft: '' })
  },
  restart() {
    this.active = false
    wx.redirectTo({ url: '/pages/index/index' })
  },
  clear() {
    wx.showModal({
      title: '删除本次回答？',
      content: '删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('lastInterview')
          } catch (error) {
            wx.showToast({ title: '删除失败，请重试', icon: 'none' })
            return
          }
          this.active = false
          wx.redirectTo({ url: '/pages/index/index' })
        }
      },
    })
  },
  onUnload() {
    this.active = false
  },
})
