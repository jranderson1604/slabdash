import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';
import api from '../api/client';

export default function SAMAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hey there! I\'m SAM (Submission Assistant Manager), your ultimate PSA grading expert! Ask me anything about PSA grading standards, service levels, ROI calculations, or managing your submissions!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // SAM character image and animation
  const SAM_IMAGE = '/images/SAM_V2.png';
  const SAM_ANIMATION = '/images/SAM_idle_animation.mp4'; // Your Sora animation

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
        history: messages.slice(-10) // Send last 10 messages for context
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
        content: '😅 Oops! I\'m having trouble connecting right now. Please try again in a moment!',
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
      {/* Floating SAM Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-20 h-20 bg-white hover:bg-gray-50 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 group border-4 border-brand-500"
          aria-label="Open SAM Assistant"
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <img
              src={SAM_IMAGE}
              alt="SAM"
              className="w-full h-full object-contain animate-bounce"
              onError={(e) => {
                // Fallback to emoji if image not found
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="text-4xl">🤖</div>';
              }}
            />
          </div>
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border-2 border-brand-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1">
                <img
                  src={SAM_IMAGE}
                  alt="SAM"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-2xl">🤖</span>';
                  }}
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">SAM</h3>
                <p className="text-xs text-white/90">PSA Grading Expert</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 flex-shrink-0 bg-white border-2 border-brand-200 rounded-full flex items-center justify-center p-0.5">
                    <img
                      src={SAM_IMAGE}
                      alt="SAM"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<span class="text-lg">🤖</span>';
                      }}
                    />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-brand-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-white border-2 border-brand-200 rounded-full flex items-center justify-center p-0.5">
                  <img
                    src={SAM_IMAGE}
                    alt="SAM"
                    className="w-full h-full object-contain animate-bounce"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<span class="text-lg animate-bounce">🤖</span>';
                    }}
                  />
                </div>
                <div className="bg-white border border-brand-200 rounded-2xl px-4 py-2">
                  <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-brand-200 bg-white">
              <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(question)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SAM Idle Animation - Shows when not loading */}
          {!isLoading && (
            <div className="px-4 py-3 border-t border-brand-200 bg-gradient-to-b from-white to-gray-50 flex justify-center">
              <div className="w-24 h-24 relative">
                <video
                  src={SAM_ANIMATION}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to static image if video fails
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

          {/* Input - FIXED: Solid white background, proper contrast */}
          <div className="p-4 border-t border-brand-200 bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask SAM anything..."
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 placeholder-gray-500 font-medium"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
