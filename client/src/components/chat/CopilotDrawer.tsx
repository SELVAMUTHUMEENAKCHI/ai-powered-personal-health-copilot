import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trash2,
  FileText,
  AlertTriangle,
  Bot,
  User,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { ChatService } from '../../services/chat.service';
import { VoiceService } from '../../services/voice.service';
import { ChatMessageItem, ChatTurnSource } from '@health-copilot/shared';

interface CopilotDrawerProps {
  patientId?: string;
  patientName?: string;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  patientId,
  patientName,
  isOpen: externalIsOpen,
  onOpen: externalOnOpen,
  onClose: externalOnClose,
}) => {
  const { t, i18n } = useTranslation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    setInternalIsOpen(val);
    if (val) {
      if (externalOnOpen) externalOnOpen();
    } else {
      if (externalOnClose) externalOnClose();
    }
  };

  const handleOpenClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setInternalIsOpen(true);
    if (externalOnOpen) {
      externalOnOpen();
    }
  };

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  // Load chat history when drawer opens or patientId changes
  useEffect(() => {
    if (isOpen && patientId) {
      loadHistory();
    }
  }, [isOpen, patientId]);

  const loadHistory = async () => {
    try {
      setErrorMsg(null);
      const res = await ChatService.getHistory(patientId);
      if (res && res.messages) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setErrorMsg(null);
    setInputText('');
    const currentLang = i18n.language || 'en';

    // Optimistic user message
    const userMsg: ChatMessageItem = {
      sender: 'user',
      message: query,
      language: currentLang,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await ChatService.sendMessage(query, currentLang, patientId);
      const assistantMsg: ChatMessageItem = {
        sender: 'assistant',
        message: response.reply,
        language: response.language || currentLang,
        sources: response.sources || [],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorText = (err as Error).message || 'Failed to get answer from copilot.';
      setErrorMsg(errorText);
      const errorAssistantMsg: ChatMessageItem = {
        sender: 'assistant',
        message: `⚠️ ${errorText}. Please verify your network or try again.`,
        language: currentLang,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history with Health Copilot?')) return;
    try {
      await ChatService.clearHistory(patientId);
      setMessages([]);
      VoiceService.stopSpeaking();
      setSpeakingIndex(null);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      VoiceService.stopListening();
      setIsListening(false);
      return;
    }

    if (!VoiceService.isSpeechRecognitionSupported()) {
      setErrorMsg('Voice input is not supported in this browser. Please type your query.');
      return;
    }

    setIsListening(true);
    setErrorMsg(null);
    VoiceService.startListening(
      (transcript) => {
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      },
      (err) => {
        setErrorMsg(`Speech recognition: ${err}`);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      },
      i18n.language || 'en'
    );
  };

  const handleSpeak = (text: string, index: number) => {
    if (speakingIndex === index) {
      VoiceService.stopSpeaking();
      setSpeakingIndex(null);
      return;
    }

    // Strip markdown chars before vocalizing
    const cleanText = text.replace(/[*_#`[\]()]/g, '');
    const currentLang = i18n.language || 'en';

    setSpeakingIndex(index);
    const started = VoiceService.speak(cleanText, currentLang, () => {
      setSpeakingIndex(null);
    });

    if (!started) {
      setSpeakingIndex(null);
      setErrorMsg('Browser text-to-speech could not start.');
    }
  };

  const quickPrompts = [
    { label: t('chat.quickPrompts.abnormal', 'What are my abnormal lab values?'), query: 'What are my abnormal lab values?' },
    { label: t('chat.quickPrompts.meds', 'List my active medications'), query: 'List my active medications and dosages' },
    { label: t('chat.quickPrompts.summary', 'Summarize my latest health report'), query: 'Summarize my latest diagnostic health report' },
    { label: t('chat.quickPrompts.sugarTamil', 'Enoda fasting sugar normal ah?'), query: 'Enoda fasting sugar report la normal ah irukka?' },
  ];

  return (
    <>
      {/* Floating Action Button (Launcher) */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpenClick}
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-full shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-200 group focus:outline-none focus:ring-4 focus:ring-teal-500/30 cursor-pointer"
          aria-label="Open AI Health Copilot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-tight pr-1">
            {t('chat.title', 'AI Health Copilot')}
          </span>
        </button>
      )}

      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[460px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-health-50/70 via-teal-50/40 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-health-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-health-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {t('chat.title', 'AI Health Copilot')}
                </h2>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  Grounded
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {patientName ? `Patient: ${patientName}` : t('chat.subtitle', 'Strictly grounded in your records')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t('chat.clear', 'Clear Chat')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                VoiceService.stopSpeaking();
                VoiceService.stopListening();
                setIsOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close Copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Medical Safety Notice Banner */}
        <div className="px-4 py-2.5 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 flex items-start space-x-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            {t(
              'disclaimer',
              'This AI is for educational reference only. It does not provide medical diagnoses or alter medication dosages. Always consult a licensed doctor.'
            )}
          </p>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-400 dark:text-slate-500">
              <div className="w-14 h-14 rounded-3xl bg-health-50 dark:bg-health-950/40 text-health-600 dark:text-health-400 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('chat.empty', 'Ask me anything about your lab tests or medications')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Answers are generated solely from your uploaded reports, complete with citations.
                </p>
              </div>

              {/* Quick Prompts In Empty State */}
              <div className="w-full pt-2 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Suggested Prompts
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp.query)}
                      className="text-left text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-health-500 dark:hover:border-health-500 hover:bg-health-50/50 dark:hover:bg-health-950/20 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{qp.label}</span>
                      <Send className="w-3 h-3 text-slate-400 group-hover:text-health-600 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={index}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div
                      className={`flex items-end space-x-2 max-w-[88%] ${
                        isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white ${
                          isUser
                            ? 'bg-slate-700 dark:bg-slate-600'
                            : 'bg-gradient-to-tr from-health-600 to-teal-500 shadow-sm'
                        }`}
                      >
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? 'bg-health-600 text-white rounded-br-none shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.message}</div>

                        {/* Source Citations */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-1">
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 block">
                              {t('chat.sources', 'Record Sources')}:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {msg.sources.map((src, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-mono"
                                >
                                  <FileText className="w-2.5 h-2.5 mr-1 text-health-600" />
                                  {src.title || src.documentId}
                                  {src.reportDate && ` (${src.reportDate})`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Audio controls */}
                    <div
                      className={`flex items-center space-x-2 px-1 text-[10px] text-slate-400 ${
                        isUser ? 'pr-9' : 'pl-9'
                      }`}
                    >
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!isUser && (
                        <button
                          onClick={() => handleSpeak(msg.message, index)}
                          className={`flex items-center space-x-1 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
                            speakingIndex === index
                              ? 'text-health-600 dark:text-health-400 font-medium'
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                          title={speakingIndex === index ? 'Stop speaking' : 'Read aloud with Text-to-Speech'}
                        >
                          {speakingIndex === index ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-health-600 animate-pulse" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start space-x-2 pl-1">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-health-600 to-teal-500 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 flex items-center space-x-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-health-600" />
                    <span>Analyzing clinical records and formulating grounded response...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span className="truncate">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-2 text-rose-500 hover:text-rose-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          {/* Quick chips if messages exist */}
          {messages.length > 0 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              {quickPrompts.slice(0, 3).map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp.query)}
                  disabled={isLoading}
                  className="shrink-0 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 hover:border-health-500 dark:hover:border-health-500 hover:bg-health-50 dark:hover:bg-health-950/40 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening
                  ? 'bg-rose-600 border-rose-600 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title={isListening ? 'Stop listening' : 'Speak your question (STT)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isListening
                  ? t('chat.askMic', 'Listening... Speak now')
                  : t('chat.placeholder', 'Ask about your lab values or medications...')
              }
              disabled={isLoading}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-health-500/30 focus:border-health-500 transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 bg-gradient-to-r from-health-600 to-teal-600 hover:from-health-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-health-500/30"
              title={t('chat.send', 'Send')}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
