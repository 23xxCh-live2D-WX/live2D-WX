const { QUESTIONS, PROBES, validateAnswer, nextTurn } = require('../../utils/coach')
const { generate } = require('../../utils/cloudAi')

let activePage = null
let recorderBound = false

Page({
  data: {
    job: '',
    mode: 'animated',
    useCloud: false,
    questionIndex: 0,
    phase: 'main',
    turnNumber: 1,
    prompt: QUESTIONS[0],
    draft: '',
    answers: [],
    busy: false,
    avatarState: 'speaking',
    notice: '',
    recordState: 'idle',
    recordSeconds: 0,
  },
  onLoad(options) {
    let job = ''
    try { job = decodeURIComponent(options.job || '').trim().slice(0, 40) } catch (error) {}
    if (job.length < 2) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    this.startedAt = Date.now()
    this.aiUsed = false
    this.recorder = wx.getRecorderManager && wx.getRecorderManager()
    if (this.recorder) {
      activePage = this
      if (!recorderBound) {
        this.recorder.onStop((res) => {
          if (!activePage) return
          activePage.voicePath = res.tempFilePath
          activePage.setData({ recordState: activePage.voicePath ? 'recorded' : 'idle', recordSeconds: Math.round(res.duration / 1000) })
        })
        this.recorder.onError(() => {
          if (!activePage) return
          activePage.setData({ recordState: 'idle' })
          wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
        })
        recorderBound = true
      }
    }
    this.setData({
      job,
      mode: options.mode === 'static' ? 'static' : 'animated',
      useCloud: options.cloud === '1',
    })
  },
  onDraftInput(event) {
    this.setData({ draft: event.detail.value, avatarState: 'listening' })
  },
  startRecord() {
    if (!this.recorder || this.data.recordState === 'recording') return
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.stopPlayback()
        this.voicePath = ''
        this.setData({ recordState: 'recording', recordSeconds: 0, avatarState: 'listening' })
        try {
          this.recorder.start({ duration: 60000, format: 'mp3' })
        } catch (error) {
          this.setData({ recordState: 'idle' })
          wx.showToast({ title: '无法启动录音', icon: 'none' })
        }
      },
      fail: () => wx.showToast({ title: '请同意隐私提示并允许麦克风', icon: 'none' }),
    })
  },
  stopRecord() {
    if (this.data.recordState !== 'recording') return
    this.setData({ recordState: 'processing', avatarState: 'thinking' })
    this.recorder.stop()
  },
  playRecord() {
    if (!this.voicePath) return
    this.stopPlayback()
    this.audio = wx.createInnerAudioContext()
    this.audio.onEnded(() => this.stopPlayback())
    this.audio.onError(() => {
      this.stopPlayback()
      wx.showToast({ title: '播放失败，请重录', icon: 'none' })
    })
    this.audio.src = this.voicePath
    this.audio.play()
  },
  stopPlayback() {
    if (!this.audio) return
    this.audio.stop()
    this.audio.destroy()
    this.audio = null
  },
  async submit() {
    if (this.data.busy) return
    if (this.data.recordState === 'recording' || this.data.recordState === 'processing') {
      wx.showToast({ title: '先结束本轮录音', icon: 'none' })
      return
    }
    const result = validateAnswer(this.data.draft)
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }
    const { questionIndex, phase, prompt, answers, useCloud } = this.data
    const updated = answers.concat({ question: prompt, answer: result.answer })
    const next = nextTurn(questionIndex, phase)
    this.stopPlayback()
    this.voicePath = ''
    this.setData({ busy: true, avatarState: 'thinking', draft: '', notice: '', recordState: 'idle', recordSeconds: 0 })

    if (next.done) {
      try {
        wx.setStorageSync('lastInterview', {
          job: this.data.job,
          mode: this.data.mode,
          useCloud,
          aiUsed: this.aiUsed,
          answers: updated,
          startedAt: this.startedAt,
          endedAt: Date.now(),
        })
      } catch (error) {
        this.setData({ busy: false, draft: result.answer, avatarState: 'listening' })
        wx.showToast({ title: '保存失败，请检查本机空间后重试', icon: 'none' })
        return
      }
      wx.redirectTo({ url: '/pages/report/report' })
      return
    }

    let nextPrompt = QUESTIONS[next.questionIndex]
    let notice = ''
    if (next.phase === 'probe') {
      nextPrompt = PROBES[questionIndex]
      if (useCloud) {
        try {
          const text = await generate(
            '你是中国应届生模拟面试官。只提出一个具体、礼貌的追问，不评分，不编造求职者经历，不询问敏感信息。最多60字。',
            `目标岗位：${this.data.job}\n原问题：${QUESTIONS[questionIndex]}\n求职者回答：${result.answer}`
          )
          nextPrompt = text.split('\n')[0].slice(0, 100)
          this.aiUsed = true
        } catch (error) {
          notice = '云端追问暂不可用，已切换为固定追问。'
        }
      }
    }
    this.setData({
      answers: updated,
      questionIndex: next.questionIndex,
      phase: next.phase,
      turnNumber: updated.length + 1,
      prompt: nextPrompt,
      busy: false,
      avatarState: 'speaking',
      notice,
    })
  },
  exit() {
    wx.showModal({
      title: '结束本次练习？',
      content: '尚未完成的回答不会保留。',
      success: (res) => { if (res.confirm) wx.navigateBack() },
    })
  },
  onHide() {
    if (this.data.recordState === 'recording') this.recorder.stop()
    this.stopPlayback()
  },
  onUnload() {
    if (activePage === this) activePage = null
    this.stopPlayback()
  },
})
