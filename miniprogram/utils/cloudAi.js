const { AI_MODEL } = require('../config')

function cloudReady() {
  return Boolean(getApp().globalData.cloudReady)
}

async function generate(system, user) {
  if (!cloudReady()) throw new Error('云开发未配置')
  const model = wx.cloud.extend.AI.createModel('cloudbase')
  const response = await model.generateText({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const text = response && response.choices && response.choices[0] &&
    response.choices[0].message && response.choices[0].message.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('模型未返回文本')
  return text.trim()
}

module.exports = { cloudReady, generate }
