import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceAssistant(options: {
  voiceEnabled: boolean;
  speechRate: number;
  onFinalTranscript?: (text: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(!options.voiceEnabled);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speechPulse, setSpeechPulse] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pulseIntervalRef = useRef<number | null>(null);
  const onFinalRef = useRef(options.onFinalTranscript);

  useEffect(() => {
    onFinalRef.current = options.onFinalTranscript;
  }, [options.onFinalTranscript]);

  useEffect(() => {
    setIsMuted(!options.voiceEnabled);
  }, [options.voiceEnabled]);

  const stopPulse = useCallback(() => {
    if (pulseIntervalRef.current !== null) {
      window.clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    setSpeechPulse(0);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    stopPulse();
  }, [stopPulse]);

  const speak = useCallback(
    (text: string) => {
      if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      window.speechSynthesis.cancel();
      stopPulse();

      const cleanText = text.replace(/[*_`#]/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = Math.min(1.4, Math.max(0.75, options.speechRate || 1.0));
      utterance.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /en-(in|gb|us)/i.test(v.lang) && /natural|neural|google|samantha|rishi/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        pulseIntervalRef.current = window.setInterval(() => {
          setSpeechPulse(0.35 + Math.random() * 0.65);
        }, 90);
      };

      utterance.onboundary = () => {
        setSpeechPulse(0.65 + Math.random() * 0.35);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        stopPulse();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        stopPulse();
      };

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, options.speechRate, stopPulse]
  );

  const togglePauseSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!isSpeaking) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      pulseIntervalRef.current = window.setInterval(() => {
        setSpeechPulse(0.35 + Math.random() * 0.65);
      }, 90);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
      stopPulse();
    }
  }, [isPaused, isSpeaking, stopPulse]);

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    );

  const ttsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const startListening = useCallback(() => {
    setVoiceError(null);
    if (!speechSupported) {
      setVoiceError(
        'Voice input is unavailable in this browser. Please type your message below.'
      );
      return;
    }
    stopSpeaking();

    const SpeechCtor = ((window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as new () => SpeechRecognitionLike;

    try {
      const recognition = new SpeechCtor();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;

      let finalText = '';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += chunk + ' ';
          } else {
            interim += chunk;
          }
        }
        setInterimTranscript((finalText + interim).trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission was denied. You can enable it in browser settings or type instead.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Hold or click the microphone and try again.');
        } else {
          setVoiceError(`Voice input error (${event.error}). Please type your message.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const committed = finalText.trim();
        if (committed) {
          setInterimTranscript('');
          onFinalRef.current?.(committed);
        }
      };

      recognitionRef.current = recognition;
      setInterimTranscript('');
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError('Unable to start microphone input in this browser.');
    }
  }, [speechSupported, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    isPaused,
    isMuted,
    setIsMuted,
    interimTranscript,
    setInterimTranscript,
    voiceError,
    clearVoiceError: () => setVoiceError(null),
    speechPulse,
    speechSupported,
    ttsSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    togglePauseSpeech,
  };
}
