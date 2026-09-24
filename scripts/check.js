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
  global.Page = (page) => { definition = page }
  global.wx = {
    getRecorderManager: () => null,
    setStorageSync: (key, value) => { storage[key] = value },
    getStorageSync: (key) => storage[key],
    redirectTo: ({ url }) => { route = url },
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
  const report = { ...definition, data: { ...definition.data }, setData(change) { Object.assign(this.data, change) } }
  await report.onLoad()
  assert.equal(report.data.answers.length, 6)
  assert.match(report.data.report, /固定练习提示/)

  const recorder = {
    onStop(callback) { this.stopped = callback },
    onError(callback) { this.failed = callback },
    start() { this.started = true },
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
  console.log('interview flow: 6 turns, local report and recording passed')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
