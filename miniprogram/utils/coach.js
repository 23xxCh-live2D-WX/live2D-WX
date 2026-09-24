const QUESTIONS = [
  '请用一分钟介绍自己，并说说你为什么申请这个岗位。',
  '讲一次你遇到困难、但最终把事情推进下去的经历。',
  '讲一次你收到不同意见后，如何调整做法的经历。',
]

const PROBES = [
  '你提到的经历里，哪一项行动是你亲自完成的？结果如何验证？',
  '当时最难的一步是什么？你具体做了什么，而不是团队整体做了什么？',
  '对方提出了什么不同意见？你改变了哪一步，最终结果是什么？',
]

function validateAnswer(input) {
  const answer = String(input || '').trim()
  if (answer.length < 10) return { ok: false, message: '请至少写 10 个字，讲一个具体事实。' }
  if (answer.length > 800) return { ok: false, message: '回答最多 800 字。' }
  return { ok: true, answer }
}

function nextTurn(questionIndex, phase) {
  if (phase === 'main') return { questionIndex, phase: 'probe', done: false }
  if (questionIndex + 1 < QUESTIONS.length) {
    return { questionIndex: questionIndex + 1, phase: 'main', done: false }
  }
  return { questionIndex, phase: 'done', done: true }
}

module.exports = { QUESTIONS, PROBES, validateAnswer, nextTurn }
