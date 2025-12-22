type Recognition = SpeechRecognition | webkitSpeechRecognition

class VoiceService {
  private recognition: Recognition | null = null
  private isRecording = false

  private ensureRecognition(): Recognition {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) throw new Error('SpeechRecognition unavailable')
    if (!this.recognition) {
      this.recognition = new SR()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'en-US'
    }
    return this.recognition as Recognition
  }

  start(onResult: (text: string, isFinal: boolean) => void, onError?: (e: any) => void): void {
    const rec = this.ensureRecognition()
    if (this.isRecording) return
    this.isRecording = true
    let finalText = ''
    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const txt = res[0].transcript
        if (res.isFinal) {
          finalText += txt
          onResult(finalText, true)
        } else {
          onResult(finalText + txt, false)
        }
      }
    }
    rec.onerror = (e: any) => {
      this.isRecording = false
      onError && onError(e)
    }
    rec.onend = () => {
      this.isRecording = false
    }
    rec.start()
  }

  stop(): void {
    if (!this.recognition || !this.isRecording) return
    this.recognition.stop()
    this.isRecording = false
  }

  active(): boolean {
    return this.isRecording
  }
}

const voiceService = new VoiceService()
export default voiceService