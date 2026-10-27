import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, X } from 'lucide-react';
import { useToast } from '../store/ToastContext';

export interface VoiceSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

export default function VoiceSearchInput({
  value,
  onChange,
  placeholder = 'Швидкий пошук...',
  className = '',
  containerClassName = '',
  onClear,
  autoFocus
}: VoiceSearchInputProps) {
  const { showToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Ваш браузер не підтримує розпізнавання мови', 'error');
      return;
    }

    setIsListening(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'uk-UA';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.lang = 'uk-UA';
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed') {
        showToast('Помилка: Надайте дозвіл на використання мікрофону у браузері.', 'error');
      }
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = (finalTranscript || interimTranscript).trim();
      if (text) {
        onChange(text);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2.5 ${containerClassName}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/80 pointer-events-none" />
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder={isListening ? 'Слухаю... Говоріть для пошуку' : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-9 sm:pl-11 pr-8 sm:pr-9 py-2 bg-card dark:bg-muted/70 border border-border/80 shadow-xs rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/75 font-normal text-foreground ${className}`}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Очистити пошук"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={toggleListening}
        className={`w-8 h-8 sm:w-10 sm:h-10 border rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
          isListening
            ? 'bg-red-500 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
            : 'bg-card dark:bg-muted/70 border-border/80 hover:bg-muted text-muted-foreground shadow-xs'
        }`}
        title={isListening ? 'Зупинити голосовий ввід' : 'Голосовий ввід пошуку'}
      >
        {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>
    </div>
  );
}
