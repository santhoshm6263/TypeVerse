import { useState, useEffect, useRef, useCallback } from 'react';

export interface KeystrokeLog {
  char: string;
  timeOffset: number; // milliseconds from start
  isCorrect: boolean;
}

interface UseTypingEngineProps {
  text: string;
  mode: 'words' | 'sentences' | 'paragraph' | 'numbers' | 'symbols' | 'custom';
  durationLimit: number; // in seconds (e.g. 15, 30, 60, 120)
  wordLimit?: number; // alternative limit (number of words)
  soundOn: boolean;
  onComplete?: (result: {
    wpm: number;
    accuracy: number;
    durationSeconds: number;
    keystrokeLog: KeystrokeLog[];
    mistakes: number;
    backspaces: number;
    charactersTyped: number;
  }) => void;
}

// Synthesize retro cyberpunk typing sounds using Web Audio API
const playSynthSound = (type: 'keypress' | 'error' | 'success' | 'complete') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'keypress') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.setValueAtTime(120, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'complete') {
      // Arpeggio
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start();
      osc.stop(now + 0.4);
    }
  } catch (e) {
    // Audio Context blocked or not supported
  }
};

export const useTypingEngine = ({
  text,
  durationLimit,
  wordLimit,
  soundOn,
  onComplete
}: UseTypingEngineProps) => {
  const [typedText, setTypedText] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [durationSeconds, setDurationSeconds] = useState(wordLimit ? 0 : durationLimit);
  const [wpm, setWpm] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [mistakes, setMistakes] = useState(0);
  const [backspaces, setBackspaces] = useState(0);

  const keystrokeLogRef = useRef<KeystrokeLog[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const textRef = useRef(text);
  
  // Keep text ref in sync
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const resetTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTypedText('');
    setIsActive(false);
    setIsPaused(false);
    setIsCompleted(false);
    setDurationSeconds(wordLimit ? 0 : durationLimit);
    setWpm(0);
    setCpm(0);
    setAccuracy(100);
    setMistakes(0);
    setBackspaces(0);
    keystrokeLogRef.current = [];
    startTimeRef.current = null;
  }, [durationLimit, wordLimit]);

  const completeTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsCompleted(true);

    if (soundOn) playSynthSound('complete');

    // Calculate final metrics
    const finalElapsed = wordLimit
      ? durationSeconds
      : durationLimit - durationSeconds;
    
    const elapsedMinutes = finalElapsed > 0 ? finalElapsed / 60 : 0.01;
    
    // Count exact matching characters
    let correctChars = 0;
    const currentTyped = typedText;
    const target = textRef.current;
    
    for (let i = 0; i < currentTyped.length; i++) {
      if (i < target.length && currentTyped[i] === target[i]) {
        correctChars++;
      }
    }

    const finalWpm = (correctChars / 5) / elapsedMinutes;
    const finalCpm = correctChars / elapsedMinutes;
    
    const correctKeystrokes = keystrokeLogRef.current.filter(k => k.isCorrect).length;
    const totalKeystrokes = keystrokeLogRef.current.length;
    const finalAccuracy = totalKeystrokes > 0 ? (correctKeystrokes / totalKeystrokes) * 100 : 100;

    const roundedWpm = Math.round(finalWpm * 100) / 100;
    const roundedAccuracy = Math.round(finalAccuracy * 100) / 100;

    setWpm(roundedWpm);
    setCpm(Math.round(finalCpm));
    setAccuracy(roundedAccuracy);

    if (onComplete) {
      onComplete({
        wpm: roundedWpm,
        accuracy: roundedAccuracy,
        durationSeconds: finalElapsed || 1,
        keystrokeLog: keystrokeLogRef.current,
        mistakes,
        backspaces,
        charactersTyped: totalKeystrokes
      });
    }
  }, [typedText, durationSeconds, durationLimit, wordLimit, mistakes, backspaces, soundOn, onComplete]);

  // Handle countdown/timer ticks
  useEffect(() => {
    if (isActive && !isPaused && !isCompleted) {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => {
          if (wordLimit) {
            // Count UP for word-limit practice
            return prev + 1;
          } else {
            // Count DOWN for time-limit practice
            if (prev <= 1) {
              completeTest();
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, isCompleted, wordLimit, completeTest]);

  // Recalculate WPM/Accuracy on the fly
  useEffect(() => {
    if (!isActive || typedText.length === 0) return;

    const finalElapsed = wordLimit
      ? durationSeconds
      : durationLimit - durationSeconds;
    
    const elapsedMinutes = finalElapsed > 0 ? finalElapsed / 60 : 0.01;
    
    let correctChars = 0;
    const target = textRef.current;
    for (let i = 0; i < typedText.length; i++) {
      if (i < target.length && typedText[i] === target[i]) {
        correctChars++;
      }
    }

    const currentWpm = (correctChars / 5) / elapsedMinutes;
    setWpm(Math.round(currentWpm * 100) / 100);
    setCpm(Math.round(correctChars / elapsedMinutes));

    const correctKeystrokes = keystrokeLogRef.current.filter(k => k.isCorrect).length;
    const totalKeystrokes = keystrokeLogRef.current.length;
    setAccuracy(totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 10000) / 100 : 100);
  }, [typedText, durationSeconds, durationLimit, wordLimit, isActive]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isCompleted || isPaused) return;

    const targetTextStr = textRef.current;
    if (!targetTextStr) return;

    // Ignore systemic helper keys
    if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== 'Enter') {
      return;
    }

    // Prevent default scrolling keys
    if (e.key === ' ' || e.key === 'Backspace' || e.key === 'Tab') {
      e.preventDefault();
    }

    // Initialize test start time
    if (!isActive) {
      setIsActive(true);
      startTimeRef.current = Date.now();
    }

    const timeOffset = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    const currentIndex = typedText.length;

    if (e.key === 'Backspace') {
      setBackspaces(prev => prev + 1);
      
      if (typedText.length > 0) {
        setTypedText(prev => prev.slice(0, -1));
        
        keystrokeLogRef.current.push({
          char: 'Backspace',
          timeOffset,
          isCorrect: true
        });
        
        if (soundOn) playSynthSound('keypress');
      }
    } else {
      // Map Enter key to newline or space representation
      const charTyped = e.key === 'Enter' ? '\n' : e.key;

      // Check if correct
      const isCorrect = currentIndex < targetTextStr.length && charTyped === targetTextStr[currentIndex];

      if (!isCorrect) {
        setMistakes(prev => prev + 1);
        if (soundOn) playSynthSound('error');
      } else {
        if (soundOn) playSynthSound('success');
      }

      const updatedTyped = typedText + charTyped;
      setTypedText(updatedTyped);

      keystrokeLogRef.current.push({
        char: charTyped,
        timeOffset,
        isCorrect
      });

      // Check if text fully typed
      if (updatedTyped.length >= targetTextStr.length) {
        completeTest();
      }
    }
  }, [typedText, isActive, isCompleted, isPaused, soundOn, completeTest]);

  const pauseTest = useCallback(() => {
    if (isActive && !isPaused) {
      setIsPaused(true);
    }
  }, [isActive, isPaused]);

  const resumeTest = useCallback(() => {
    if (isActive && isPaused) {
      setIsPaused(false);
      // Adjust start time to ignore pause duration
      startTimeRef.current = Date.now() - (keystrokeLogRef.current[keystrokeLogRef.current.length - 1]?.timeOffset || 0);
    }
  }, [isActive, isPaused]);

  const skipWord = useCallback(() => {
    if (!isActive || isCompleted || isPaused) return;

    // Find next space character index
    const target = textRef.current;
    const currentIndex = typedText.length;
    const remainingText = target.slice(currentIndex);
    const spaceOffset = remainingText.indexOf(' ');

    if (spaceOffset !== -1) {
      const skipLength = spaceOffset + 1; // skip up to and including space
      const skippedPortion = target.slice(currentIndex, currentIndex + skipLength);
      
      setTypedText(prev => prev + skippedPortion);
      
      const timeOffset = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      
      // Log skips as incorrect strokes so accuracy is impacted fairly
      for (const char of skippedPortion) {
        keystrokeLogRef.current.push({
          char,
          timeOffset,
          isCorrect: false
        });
      }
      setMistakes(prev => prev + skipLength);
    } else {
      // No more spaces, skip to end
      const remainingPortion = target.slice(currentIndex);
      setTypedText(target);
      const timeOffset = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      for (const char of remainingPortion) {
        keystrokeLogRef.current.push({
          char,
          timeOffset,
          isCorrect: false
        });
      }
      setMistakes(prev => prev + remainingPortion.length);
      completeTest();
    }
  }, [typedText, isActive, isCompleted, isPaused, completeTest]);

  return {
    typedText,
    isActive,
    isPaused,
    isCompleted,
    durationSeconds,
    wpm,
    cpm,
    accuracy,
    mistakes,
    backspaces,
    keystrokeLog: keystrokeLogRef.current,
    handleKeyDown,
    resetTest,
    pauseTest,
    resumeTest,
    skipWord
  };
};
