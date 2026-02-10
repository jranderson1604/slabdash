import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';
import api from '../api/client';

export default function SAMAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hey there! I\'m SAM (Submission Assistant Manager), your ultimate PSA grading expert! Ask me anything about PSA grading standards, service levels, ROI calculations, or managing your submissions!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // SAM character image and animation
  const SAM_IMAGE = '/images/SAM_V2.png';
  const SAM_ANIMATION = '/images/SAM_idle_animation.mp4';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/sam/chat', {
        message: messageText,
        history: messages.slice(-10)
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('SAM chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Oops! I\'m having trouble connecting right now. Please try again in a moment!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'What makes a PSA 10?',
    'Which service level should I use?',
    'How do I calculate grading ROI?',
    'What\'s the difference between PSA 9 and 10?'
  ];

  return (
    <>
      {/* Floating SAM Button - Liquid glass */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 group glass-glow"
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '2px solid rgba(255, 129, 112, 0.35)',
            boxShadow: '0 8px 32px rgba(255, 107, 89, 0.2), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
          aria-label="Open SAM Assistant"
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <img
              src={SAM_IMAGE}
              alt="SAM"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="text-4xl">S</div>';
              }}
            />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
              border: '2px solid rgba(255,255,255,0.8)',
            }}
          >
            <MessageCircle className="w-3 h-3 text-white" />
          </div>
        </button>
      )}

      {/* Chat Window - Liquid glass */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] rounded-3xl flex flex-col z-50 scale-in"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          {/* Header - glass brand */}
          <div className="p-4 rounded-t-3xl flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))',
              borderBottom: '1px solid rgba(255, 185, 160, 0.3)',
              boxShadow: 'inset 0 1px 0 rgba(255, 216, 196, 0.3)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center p-1"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <img
                  src={SAM_IMAGE}
                  alt="SAM"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-2xl">S</span>';
                  }}
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">SAM</h3>
                <p className="text-xs" style={{ color: 'rgba(255, 248, 240, 0.8)' }}>PSA Grading Expert</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-glass"
            style={{ background: 'rgba(var(--bg-color), 0.4)' }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center p-0.5"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(255, 129, 112, 0.2)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <img
                      src={SAM_IMAGE}
                      alt="SAM"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<span class="text-lg">S</span>';
                      }}
                    />
                  </div>
                )}
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, rgba(255, 129, 112, 0.9), rgba(232, 84, 61, 0.95))',
                    color: '#FFF8F0',
                    boxShadow: '0 2px 8px rgba(255, 107, 89, 0.2), inset 0 1px 0 rgba(255, 185, 160, 0.2)',
                  } : {
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: 'rgb(var(--dark))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center p-0.5"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 129, 112, 0.2)',
                  }}
                >
                  <img
                    src={SAM_IMAGE}
                    alt="SAM"
                    className="w-full h-full object-contain animate-bounce"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<span class="text-lg animate-bounce">S</span>';
                    }}
                  />
                </div>
                <div className="rounded-2xl px-4 py-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--brand-500))' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <p className="text-xs mb-2" style={{ color: 'rgba(44, 36, 22, 0.4)' }}>Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(question)}
                    className="text-xs px-3 py-1 rounded-full transition-all"
                    style={{
                      background: 'rgba(255, 129, 112, 0.08)',
                      color: 'rgb(var(--brand-700))',
                      border: '1px solid rgba(255, 129, 112, 0.12)',
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SAM Idle Animation */}
          {!isLoading && (
            <div className="px-4 py-3 flex justify-center"
              style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
            >
              <div className="w-24 h-24 relative">
                <video
                  src={SAM_ANIMATION}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const img = document.createElement('img');
                    img.src = SAM_IMAGE;
                    img.className = 'w-full h-full object-contain animate-pulse';
                    img.alt = 'SAM';
                    e.target.parentElement.appendChild(img);
                  }}
                />
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 rounded-b-3xl" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask SAM anything..."
                className="input flex-1"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--brand-600)))',
                  color: '#FFF8F0',
                  boxShadow: '0 2px 8px rgba(255, 107, 89, 0.25), inset 0 1px 0 rgba(255, 185, 160, 0.3)',
                }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
