interface Keystroke {
  char: string;
  timeOffset: number; // ms since start
  isCorrect: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  computedWpm: number;
  computedAccuracy: number;
  isFlagged: boolean;
  message?: string;
}

export function verifyKeystrokeLog(
  targetText: string,
  durationSeconds: number,
  clientWpm: number,
  clientAccuracy: number,
  keystrokeLog: Keystroke[]
): VerificationResult {
  if (!keystrokeLog || keystrokeLog.length === 0) {
    return {
      isValid: false,
      computedWpm: 0,
      computedAccuracy: 0,
      isFlagged: false,
      message: 'Empty keystroke log.'
    };
  }

  // 1. Reconstruct typed text and count total/correct keystrokes
  let typedBuffer = '';
  let correctKeystrokeCount = 0;
  let totalKeystrokeCount = keystrokeLog.length;

  for (const stroke of keystrokeLog) {
    if (stroke.isCorrect) {
      correctKeystrokeCount++;
    }

    if (stroke.char === 'Backspace') {
      if (typedBuffer.length > 0) {
        typedBuffer = typedBuffer.slice(0, -1);
      }
    } else {
      typedBuffer += stroke.char;
    }
  }

  // 2. Count final correct characters in the buffer matching the target text
  let correctChars = 0;
  for (let i = 0; i < typedBuffer.length; i++) {
    if (i < targetText.length && typedBuffer[i] === targetText[i]) {
      correctChars++;
    }
  }

  // 3. Compute WPM and CPM
  // WPM = (correct characters / 5) / (elapsed minutes)
  const elapsedMinutes = durationSeconds / 60;
  const computedWpm = elapsedMinutes > 0 ? (correctChars / 5) / elapsedMinutes : 0;
  
  // Accuracy = correct keystrokes / total keystrokes * 100
  const computedAccuracy = totalKeystrokeCount > 0 ? (correctKeystrokeCount / totalKeystrokeCount) * 100 : 0;

  // 4. Validate client values vs server recomputed values
  // We allow a small tolerance (e.g. 2 WPM and 2% accuracy) for floating point calculations/rounding
  const wpmDifference = Math.abs(clientWpm - computedWpm);
  const accuracyDifference = Math.abs(clientAccuracy - computedAccuracy);

  const isValid = wpmDifference <= 3.0 && accuracyDifference <= 3.0;
  
  // Impossible speed flag (> 250 WPM)
  const isFlagged = computedWpm > 250;

  return {
    isValid,
    computedWpm: Math.round(computedWpm * 100) / 100,
    computedAccuracy: Math.round(computedAccuracy * 100) / 100,
    isFlagged,
    message: isValid 
      ? undefined 
      : `Divergence detected. Client WPM: ${clientWpm}, Server WPM: ${computedWpm.toFixed(1)}. Client Accuracy: ${clientAccuracy}%, Server Accuracy: ${computedAccuracy.toFixed(1)}%.`
  };
}
