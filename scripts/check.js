const assert = require('node:assert/strict')
const { QUESTIONS, PROBES, validateAnswer, nextTurn } = require('../miniprogram/utils/coach')

assert.equal(QUESTIONS.length, 3)
assert.equal(PROBES.length, QUESTIONS.length)
assert.equal(validateAnswer('太短').ok, false)
assert.equal(validateAnswer('a'.repeat(801)).ok, false)
assert.equal(validateAnswer('  我独立完成了需求访谈，并根据结果修改原型。  ').answer, '我独立完成了需求访谈，并根据结果修改原型。')

let turn = { questionIndex: 0, phase: 'main' }
let count = 0
do {
  turn = nextTurn(turn.questionIndex, turn.phase)
  count++
} while (!turn.done)
assert.equal(count, 6)

async function main() {
  let definition
  let route = ''
  const storage = {}
  global.getApp = () => ({ globalData: { cloudReady: false } })
  global.Page = (page) => { definition = page }
  global.wx = {
    getRecorderManager: () => null,
    setStorageSync: (key, value) => { storage[key] = value },
    getStorageSync: (key) => storage[key],
    redirectTo: ({ url }) => { route = url },
    navigateTo: ({ url }) => { route = url },
    showToast: ({ title }) => { throw new Error(title) },
  }

  require('../miniprogram/pages/interview/interview')
  const interviewDefinition = definition
  const interview = { ...definition, data: { ...definition.data }, setData(change) { Object.assign(this.data, change) } }
  interview.onLoad({ job: encodeURIComponent('产品经理'), mode: 'static', cloud: '0' })
  for (let i = 0; i < 6; i++) {
    interview.setData({ draft: `第${i + 1}轮：我独立收集用户反馈，修改页面后完成交付。` })
    await interview.submit()
  }
  assert.equal(storage.lastInterview.answers.length, 6)
  assert.equal(route, '/pages/report/report')

  require('../miniprogram/pages/report/report')
  const reportDefinition = definition
  const report = { ...definition, data: { ...definition.data }, setData(change) { Object.assign(this.data, change) } }
  await report.onLoad()
  assert.equal(report.data.questions.length, 3)
  assert.equal(report.data.questions[1].answer, storage.lastInterview.answers[2].answer)
  assert.equal(report.data.questions[1].probeAnswer, storage.lastInterview.answers[3].answer)
  assert.match(report.data.report, /固定练习提示/)
  const originalAnswers = JSON.stringify(storage.lastInterview.answers)
  let toast = ''
  wx.showToast = ({ title }) => { toast = title }
  report.selectRewrite({ currentTarget: { dataset: { index: '1' } } })
  report.onRewriteInput({ detail: { value: '重答：我亲自访谈三名用户，按反馈修改了页面流程，并交付可操作原型。' } })
  report.saveRewrite()
  assert.equal(storage.lastInterview.rewrites[1].answer, report.data.questions[1].rewrite)
  assert.equal(JSON.stringify(storage.lastInterview.answers), originalAnswers)
  const reopened = { ...reportDefinition, data: { ...reportDefinition.data }, setData: interview.setData }
  await reopened.onLoad()
  assert.equal(reopened.data.questions[1].rewrite, storage.lastInterview.rewrites[1].answer)
  require('../miniprogram/pages/index/index')
  const home = { ...definition, data: { ...definition.data }, setData: interview.setData }
  home.onShow()
  assert.equal(home.data.hasReport, true)
  home.viewLast()
  assert.equal(route, '/pages/report/report')
  const savedSession = storage.lastInterview
  reopened.selectRewrite({ currentTarget: { dataset: { index: '1' } } })
  reopened.onRewriteInput({ detail: { value: '第二次修改：我根据三名用户的反馈调整流程，并再次检查交付物。' } })
  const saveStorage = wx.setStorageSync
  wx.setStorageSync = () => { throw new Error('storage full') }
  reopened.saveRewrite()
  assert.match(toast, /保存失败/)
  assert.equal(storage.lastInterview, savedSession)
  assert.equal(reopened.data.rewriteIndex, 1)
  assert.match(reopened.data.rewriteDraft, /第二次修改/)
  reopened.selectRewrite({ currentTarget: { dataset: { index: '2' } } })
  assert.match(toast, /先保存或取消/)
  assert.equal(reopened.data.rewriteIndex, 1)
  assert.match(reopened.data.rewriteDraft, /第二次修改/)
  wx.setStorageSync = saveStorage
  reopened.selectRewrite({ currentTarget: { dataset: { index: '99' } } })
  assert.equal(reopened.data.rewriteIndex, 1)
  wx.showModal = ({ success }) => success({ confirm: true })
  wx.removeStorageSync = () => { throw new Error('storage unavailable') }
  reopened.clear()
  assert.match(toast, /删除失败/)
  assert.equal(storage.lastInterview, savedSession)
  wx.removeStorageSync = (key) => { delete storage[key] }
  reopened.clear()
  assert.equal(storage.lastInterview, undefined)
  assert.equal(route, '/pages/index/index')
  home.onShow()
  assert.equal(home.data.hasReport, false)

  const recorder = {
    onStop(callback) { this.stopped = callback },
    onError(callback) { this.failed = callback },
    start() { this.started = (this.started || 0) + 1 },
    stop() { this.stopped({ tempFilePath: 'temp.mp3', duration: 1500 }) },
  }
  wx.getRecorderManager = () => recorder
  wx.authorize = ({ success }) => success()
  const voiced = { ...interviewDefinition, data: { ...interviewDefinition.data }, setData: interview.setData }
  voiced.onLoad({ job: encodeURIComponent('产品经理'), mode: 'static', cloud: '0' })
  voiced.startRecord()
  assert.equal(voiced.data.recordState, 'recording')
  voiced.stopRecord()
  assert.equal(voiced.data.recordState, 'recorded')
  assert.equal(voiced.data.recordSeconds, 2)
  voiced.onUnload()

  const oldRecording = { ...interviewDefinition, data: { ...interviewDefinition.data }, setData: interview.setData }
  oldRecording.onLoad({ job: encodeURIComponent('产品经理'), cloud: '0' })
  oldRecording.startRecord()
  recorder.stop = () => {}
  oldRecording.onHide()
  assert.equal(oldRecording.data.recordState, 'processing')
  oldRecording.onUnload()
  const nextRecording = { ...interviewDefinition, data: { ...interviewDefinition.data }, setData: interview.setData }
  nextRecording.onLoad({ job: encodeURIComponent('产品经理'), cloud: '0' })
  nextRecording.startRecord()
  assert.equal(nextRecording.data.recordState, 'idle')
  recorder.stopped({ tempFilePath: 'old.mp3', duration: 2000 })
  assert.equal(nextRecording.voicePath, undefined)
  assert.equal(nextRecording.data.recordState, 'idle')
  nextRecording.startRecord()
  recorder.stopped({ tempFilePath: 'new.mp3', duration: 1000 })
  assert.equal(nextRecording.voicePath, 'new.mp3')
  nextRecording.onUnload()

  let authorization
  wx.authorize = ({ success }) => { authorization = success }
  const lateAuthorization = { ...interviewDefinition, data: { ...interviewDefinition.data }, setData: interview.setData }
  lateAuthorization.onLoad({ job: encodeURIComponent('产品经理'), cloud: '0' })
  lateAuthorization.startRecord()
  lateAuthorization.onHide()
  const starts = recorder.started
  authorization()
  assert.equal(recorder.started, starts)
  lateAuthorization.onUnload()

  storage.lastInterview = { ...savedSession, useCloud: true }
  let resolveReview
  global.getApp = () => ({ globalData: { cloudReady: true } })
  wx.cloud = { extend: { AI: { createModel: () => ({ generateText: () => new Promise((resolve) => { resolveReview = resolve }) }) } } }
  const abandoned = { ...reportDefinition, data: { ...reportDefinition.data }, setData: interview.setData }
  const pending = abandoned.onLoad()
  abandoned.onUnload()
  resolveReview({ choices: [{ message: { content: '迟到的云端复盘' } }] })
  await pending
  assert.equal(abandoned.data.report, '')
  console.log('interview flow: 6 turns, rewrite persistence/failure/deletion, recording ownership and late callback checks passed')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
