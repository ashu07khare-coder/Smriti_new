import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  Pill,
  Sparkles,
  Square,
  Trash2,
  Users,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Language } from '@/games/shared';

export type NotificationType = 'medicine' | 'exercise' | 'family' | 'care' | 'general';

export interface SmritiNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationCenterProps {
  language: Language;
}

const typeConfig: Record<NotificationType, { icon: LucideIcon; color: string; bg: string }> = {
  medicine: { icon: Pill, color: '#bc6b43', bg: '#fae5ce' },
  exercise: { icon: Sparkles, color: '#287d9e', bg: '#deedf4' },
  family: { icon: Users, color: '#299B78', bg: '#dcefe8' },
  care: { icon: Heart, color: '#E57B4F', bg: '#fce4dc' },
  general: { icon: Bell, color: '#6c867e', bg: '#e8efeb' },
};

const languageCodeMap: Record<Language, string> = {
  Assamese: 'as-IN',
  Bodo: 'brx-IN',
  Khasi: 'en-IN',
  Mizo: 'en-IN',
  Manipuri: 'en-IN',
  Nagamese: 'en-IN',
  Hindi: 'hi-IN',
  English: 'en-US',
};

const mockNotifications: Omit<SmritiNotification, 'id' | 'timestamp' | 'read'>[] = [
  { type: 'medicine', title: 'Medicine reminder', message: 'Time for your BP tablet. Tap the checkmark when you have taken it.' },
  { type: 'family', title: 'Voice message from Bina', message: 'Your daughter Bina sent a good morning voice message. Tap to listen.' },
  { type: 'exercise', title: 'Brain exercise ready', message: 'A gentle memory exercise is waiting for you. It takes about five minutes.' },
  { type: 'care', title: 'Gentle check-in suggested', message: 'Aita finished 4 of 5 activities today. A little nudge might be nice.' },
  { type: 'family', title: 'Photo added by Rohan', message: 'Your grandson Rohan added a new family photo for the memory game.' },
  { type: 'general', title: 'New language pack available', message: 'A Mizo content pack is ready to download over Wi-Fi.' },
];

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `notif-${idCounter}`;
}

export function NotificationCenter({ language }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SmritiNotification[]>(() => [
    { ...mockNotifications[0], id: makeId(), timestamp: Date.now() - 120000, read: false },
    { ...mockNotifications[1], id: makeId(), timestamp: Date.now() - 600000, read: false },
    { ...mockNotifications[2], id: makeId(), timestamp: Date.now() - 3600000, read: true },
  ]);
  const [autoRead, setAutoRead] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const simTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const speak = useCallback((text: string, id: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCodeMap[language] || 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  const addNotification = useCallback((notif: Omit<SmritiNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: SmritiNotification = {
      ...notif,
      id: makeId(),
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    if (autoRead) {
      speak(`${notif.title}. ${notif.message}`, newNotif.id);
    }
  }, [autoRead, speak]);

  const startSimulation = useCallback(() => {
    setSimulating(true);
    const scheduleNext = () => {
      simTimeoutRef.current = setTimeout(() => {
        const random = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
        addNotification(random);
        scheduleNext();
      }, 8000);
    };
    scheduleNext();
  }, [addNotification]);

  const stopSimulation = useCallback(() => {
    setSimulating(false);
    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
      simTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopSimulation();
    };
  }, [stopSpeaking, stopSimulation]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const firstButton = panelRef.current?.querySelector('button');
    firstButton?.focus();
  }, [open]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    stopSpeaking();
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  const removeNotification = (id: string) => {
    if (speakingId === id) stopSpeaking();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSpeak = (notif: SmritiNotification) => {
    if (speakingId === notif.id) {
      stopSpeaking();
      return;
    }
    speak(`${notif.title}. ${notif.message}`, notif.id);
  };

  return (
    <>
      <button
        ref={bellRef}
        className="notif-bell"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notification Center${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && createPortal(
        <>
          <div className="notif-overlay" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="notif-panel"
            role="dialog"
            aria-label="Notification Center"
          >
            <div className="notif-panel-header">
              <div className="notif-panel-title-row">
                <h2>Notification Center</h2>
                <button
                  className="notif-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close notification panel"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="notif-panel-controls">
                <button
                  className={`notif-toggle ${autoRead ? 'on' : ''}`}
                  onClick={() => setAutoRead((v) => !v)}
                  aria-pressed={autoRead}
                  aria-label="Toggle auto-read new notifications aloud"
                >
                  <Volume2 size={15} />
                  <span>Auto-read aloud</span>
                  <span className="notif-toggle-track">
                    <span className="notif-toggle-knob" />
                  </span>
                </button>
                {speakingId && (
                  <button
                    className="notif-stop-btn"
                    onClick={stopSpeaking}
                    aria-label="Stop reading aloud"
                  >
                    <Square size={14} fill="currentColor" /> Stop
                  </button>
                )}
              </div>
            </div>

            <div className="notif-panel-actions">
              <button
                className="notif-action-btn"
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck size={16} /> Mark all as read
              </button>
              <button
                className="notif-action-btn danger"
                onClick={clearAll}
                disabled={notifications.length === 0}
              >
                <Trash2 size={16} /> Clear all
              </button>
            </div>

            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <Bell size={36} />
                  <p>No notifications right now</p>
                  <small>You are all caught up.</small>
                </div>
              ) : (
                notifications.map((notif) => {
                  const cfg = typeConfig[notif.type];
                  const Icon = cfg.icon;
                  const isSpeaking = speakingId === notif.id;
                  return (
                    <div
                      key={notif.id}
                      className={`notif-item ${notif.read ? 'read' : 'unread'} ${isSpeaking ? 'speaking' : ''}`}
                    >
                      <div className="notif-item-icon" style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-top-row">
                          <h3>{notif.title}</h3>
                          {!notif.read && <span className="notif-unread-dot" aria-label="Unread" />}
                        </div>
                        <p>{notif.message}</p>
                        <span className="notif-time">{formatTime(notif.timestamp)}</span>
                      </div>
                      <div className="notif-item-actions">
                        <button
                          className="notif-speak-btn"
                          onClick={() => handleSpeak(notif)}
                          aria-label={isSpeaking ? 'Stop reading this notification' : `Read notification aloud: ${notif.title}`}
                        >
                          {isSpeaking ? <Square size={16} fill="currentColor" /> : <Volume2 size={16} />}
                        </button>
                        <button
                          className="notif-read-btn"
                          onClick={() => toggleRead(notif.id)}
                          aria-label={notif.read ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="notif-remove-btn"
                          onClick={() => removeNotification(notif.id)}
                          aria-label="Remove notification"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="notif-panel-footer">
              <button
                className={`notif-sim-btn ${simulating ? 'active' : ''}`}
                onClick={simulating ? stopSimulation : startSimulation}
              >
                {simulating ? <><Square size={14} fill="currentColor" /> Stop demo</> : <><Bell size={14} /> Simulate incoming</>}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
