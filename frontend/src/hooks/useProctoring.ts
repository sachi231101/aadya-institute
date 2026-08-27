import { useEffect, useRef, useState, useCallback } from 'react';
import { useRecordProctoringEvent } from './useExamAttempts';
import type { ProctoringEventPayload } from '@/services/exam-attempts.api';

interface ProctoringConfig {
  attemptId: string;
  proctoringEnabled: boolean;
  fullscreenRequired: boolean;
  maxWarnings: number;
  tabSwitchDetection: boolean;
  windowBlurDetection: boolean;
  fullscreenExitDetection: boolean;
  keyboardShortcutDetection: boolean;
  copyPasteDetection: boolean;
  rightClickDetection: boolean;
  networkGracePeriodSeconds: number;
  initialViolationCount?: number;
  initialWarningCount?: number;
  isTerminated?: boolean;
}

export interface ProctoringState {
  isFullscreen: boolean;
  isOffline: boolean;
  warningModalOpen: boolean;
  warningNumber: number;
  warningTitle: string;
  warningMessage: string;
  isTerminated: boolean;
  terminationReason: string | null;
  violationCount: number;
  maxWarnings: number;
  proctoringStatus: 'ACTIVE' | 'WARNING' | 'TERMINATED' | 'OFFLINE' | 'DISABLED';
  reEnterFullscreen: () => Promise<void>;
  dismissWarningModal: () => void;
}

export const useProctoring = (config: ProctoringConfig): ProctoringState => {
  const {
    attemptId,
    proctoringEnabled,
    fullscreenRequired,
    maxWarnings = 3,
    tabSwitchDetection = true,
    windowBlurDetection = true,
    fullscreenExitDetection = true,
    keyboardShortcutDetection = true,
    copyPasteDetection = true,
    rightClickDetection = false,
    initialViolationCount = 0,
    initialWarningCount = 0,
    isTerminated: initialIsTerminated = false,
  } = config;

  const recordEventMutation = useRecordProctoringEvent(attemptId);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);
  const [warningNumber, setWarningNumber] = useState<number>(initialWarningCount);
  const [warningTitle, setWarningTitle] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [isTerminated, setIsTerminated] = useState<boolean>(initialIsTerminated);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState<number>(initialViolationCount);

  // Client-side 5-second sliding debounce reference
  const lastEventTimeRef = useRef<number>(0);
  const isTerminatedRef = useRef<boolean>(initialIsTerminated);
  isTerminatedRef.current = isTerminated;

  // Request Fullscreen
  const reEnterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      // Browser or user gesture requirement
    }
  }, []);

  const dismissWarningModal = useCallback(() => {
    if (isTerminatedRef.current) return;
    setWarningModalOpen(false);
    if (fullscreenRequired && !document.fullscreenElement) {
      reEnterFullscreen();
    }
  }, [fullscreenRequired, reEnterFullscreen]);

  // Dispatch proctoring event to backend
  const dispatchEvent = useCallback(
    async (eventType: ProctoringEventPayload['eventType'], message: string, metadata?: Record<string, unknown>) => {
      if (!proctoringEnabled || isTerminatedRef.current) return;

      const now = Date.now();
      // Client 5-second debounce window to prevent duplicate multi-firing
      if (now - lastEventTimeRef.current < 5000) {
        return;
      }
      lastEventTimeRef.current = now;

      const clientEventId = `${eventType}-${now}-${Math.random().toString(36).substring(2, 7)}`;

      try {
        const res = await recordEventMutation.mutateAsync({
          eventType,
          clientEventId,
          occurredAt: new Date(now).toISOString(),
          metadata,
        });

        const data = res.data;
        if (!data) return;

        setViolationCount(data.violationCount);
        setWarningNumber(data.warningNumber || data.violationCount);

        if (data.attemptStatus === 'TERMINATED') {
          setIsTerminated(true);
          isTerminatedRef.current = true;
          setTerminationReason(data.terminationReason || 'MAX_PROCTORING_VIOLATIONS');
          setWarningTitle('Examination Terminated');
          setWarningMessage(
            'Your examination has been automatically terminated because the maximum number of proctoring violations (3 of 3) was reached.'
          );
          setWarningModalOpen(true);
        } else if (data.warning) {
          const currentWarning = data.warningNumber || 1;
          setWarningTitle(`⚠ Proctoring Warning (${currentWarning} of ${data.maxViolations || 3})`);
          setWarningMessage(
            currentWarning >= (data.maxViolations || 3) - 1
              ? `${message} Leaving the examination window again will terminate your examination.`
              : `${message} Please stay on the examination screen in fullscreen mode.`
          );
          setWarningModalOpen(true);
        }
      } catch {
        // Handled silently to avoid breaking exam flow
      }
    },
    [proctoringEnabled, recordEventMutation]
  );

  // ─── 1. Fullscreen Change Listener ──────────────────────────────────────────
  useEffect(() => {
    if (!proctoringEnabled || !fullscreenExitDetection || isTerminated) return;

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      if (!isNowFullscreen && !isTerminatedRef.current) {
        dispatchEvent('FULLSCREEN_EXIT', 'You exited fullscreen mode.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [proctoringEnabled, fullscreenExitDetection, isTerminated, dispatchEvent]);

  // ─── 2. Visibility / Tab Switch Listener ────────────────────────────────────
  useEffect(() => {
    if (!proctoringEnabled || !tabSwitchDetection || isTerminated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isTerminatedRef.current) {
        dispatchEvent('TAB_SWITCH', 'You switched browser tabs or minimized the examination window.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [proctoringEnabled, tabSwitchDetection, isTerminated, dispatchEvent]);

  // ─── 3. Window Blur Listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!proctoringEnabled || !windowBlurDetection || isTerminated) return;

    const handleWindowBlur = () => {
      if (!isTerminatedRef.current) {
        dispatchEvent('WINDOW_BLUR', 'The examination window lost focus.');
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [proctoringEnabled, windowBlurDetection, isTerminated, dispatchEvent]);

  // ─── 4. Keyboard Shortcuts & Copy/Paste Block ───────────────────────────────
  useEffect(() => {
    if (!proctoringEnabled || isTerminated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTerminatedRef.current) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // DevTools Inspection Keys
      if (
        e.key === 'F12' ||
        (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (isCtrlOrMeta && key === 'u')
      ) {
        e.preventDefault();
        dispatchEvent('DEVTOOLS_ATTEMPT', 'Developer inspection shortcut detected.', { key: e.key });
        return;
      }

      // Copy / Cut / Paste / Print / Select All
      if (copyPasteDetection && isCtrlOrMeta && ['c', 'v', 'x', 'p'].includes(key)) {
        e.preventDefault();
        if (key === 'c' || key === 'x') {
          dispatchEvent('COPY_ATTEMPT', 'Clipboard copy action detected.');
        } else if (key === 'v') {
          dispatchEvent('PASTE_ATTEMPT', 'Clipboard paste action detected.');
        } else {
          dispatchEvent('KEYBOARD_SHORTCUT', `Prohibited shortcut (Ctrl+${key.toUpperCase()}) detected.`);
        }
        return;
      }

      // Prohibited general shortcuts
      if (keyboardShortcutDetection && isCtrlOrMeta && ['a', 's', 'r'].includes(key)) {
        if (key === 's' || key === 'r') e.preventDefault();
        dispatchEvent('KEYBOARD_SHORTCUT', `Prohibited keyboard action (Ctrl+${key.toUpperCase()}) detected.`);
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (copyPasteDetection && !isTerminatedRef.current) {
        e.preventDefault();
        dispatchEvent('COPY_ATTEMPT', 'Copying examination text is prohibited.');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (copyPasteDetection && !isTerminatedRef.current) {
        e.preventDefault();
        dispatchEvent('PASTE_ATTEMPT', 'Pasting external content is prohibited.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [proctoringEnabled, isTerminated, keyboardShortcutDetection, copyPasteDetection, dispatchEvent]);

  // ─── 5. Right-Click Context Menu ────────────────────────────────────────────
  useEffect(() => {
    if (!proctoringEnabled || !rightClickDetection || isTerminated) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      dispatchEvent('RIGHT_CLICK', 'Right-click context menu is disabled during the examination.');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [proctoringEnabled, rightClickDetection, isTerminated, dispatchEvent]);

  // ─── 6. Network Offline / Online State ──────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      if (proctoringEnabled && !isTerminatedRef.current) {
        dispatchEvent('NETWORK_DISCONNECT', 'Network connection was lost. Reconnecting...');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [proctoringEnabled, dispatchEvent]);

  const proctoringStatus = !proctoringEnabled
    ? 'DISABLED'
    : isTerminated
    ? 'TERMINATED'
    : isOffline
    ? 'OFFLINE'
    : warningModalOpen
    ? 'WARNING'
    : 'ACTIVE';

  return {
    isFullscreen,
    isOffline,
    warningModalOpen,
    warningNumber,
    warningTitle,
    warningMessage,
    isTerminated,
    terminationReason,
    violationCount,
    maxWarnings,
    proctoringStatus,
    reEnterFullscreen,
    dismissWarningModal,
  };
};
