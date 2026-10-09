// Browser Web Speech API Service (STT and TTS)

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceService = {
  recognitionInstance: null as any,
  isListening: false,

  /**
   * Maps app language code to BCP 47 voice tag.
   */
  mapLanguageCode(lang: string): string {
    switch (lang) {
      case 'ta':
        return 'ta-IN';
      case 'hi':
        return 'hi-IN';
      case 'te':
        return 'te-IN';
      case 'ml':
        return 'ml-IN';
      default:
        return 'en-IN';
    }
  },

  /**
   * Checks if browser supports Speech Recognition.
   */
  isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  /**
   * Starts Speech-to-Text listening.
   */
  startListening(
    onResult: (transcript: string) => void,
    onError: (err: string) => void,
    onEnd: () => void,
    language = 'en'
  ): void {
    if (!this.isSpeechRecognitionSupported()) {
      onError('Browser Speech Recognition not supported. Please type your query.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognitionInstance = new SpeechRecognition();
      this.recognitionInstance.continuous = false;
      this.recognitionInstance.interimResults = false;
      this.recognitionInstance.lang = this.mapLanguageCode(language);

      this.recognitionInstance.onstart = () => {
        this.isListening = true;
      };

      this.recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      this.recognitionInstance.onerror = (event: any) => {
        this.isListening = false;
        onError(event.error || 'Speech recognition error.');
      };

      this.recognitionInstance.onend = () => {
        this.isListening = false;
        onEnd();
      };

      this.recognitionInstance.start();
    } catch (err) {
      this.isListening = false;
      onError((err as Error).message || 'Failed to start microphone.');
    }
  },

  /**
   * Stops Speech-to-Text listening.
   */
  stopListening(): void {
    if (this.recognitionInstance && this.isListening) {
      try {
        this.recognitionInstance.stop();
      } catch {
        // Ignore stop error
      }
    }
    this.isListening = false;
  },

  /**
   * Speaks out a plain-language summary using Text-to-Speech (TTS).
   */
  speak(text: string, language = 'en', onEnd?: () => void): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any active speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.mapLanguageCode(language);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      if (onEnd) {
        utterance.onend = onEnd;
      }

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('Text-to-speech failed:', err);
      return false;
    }
  },

  /**
   * Stops active speech synthesis.
   */
  stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },
};
