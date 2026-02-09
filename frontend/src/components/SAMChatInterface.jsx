import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, TrendingUp, Calculator, HelpCircle, Lightbulb, ThumbsUp, Brain } from 'lucide-react';
import api from '../api/client';

// Animation trigger keywords - maps keywords to animation types
const ANIMATION_TRIGGERS = {
  greeting: ['hello', 'hi', 'hey', 'greetings'],
  excitement: ['awesome', 'great', 'excellent', 'amazing', 'perfect', 'yes!', 'nice'],
  thinking: ['why', 'how', 'what', 'when', 'explain', 'tell me about', 'calculate'],
  celebration: ['thank', 'thanks', 'got it', 'understood', 'makes sense'],
  grading: ['psa 10', 'gem mint', 'grade', 'centering', 'corners', 'edges', 'surface'],
  pricing: ['price', 'value', 'worth', 'cost', 'fee', 'roi', 'profit'],
  service: ['service level', 'bulk', 'regular', 'express', 'walk-through'],
  confused: ['confused', 'don\'t understand', 'unclear', 'help'],
};

// Animation state durations (in ms)
const ANIMATION_DURATIONS = {
  idle: 8000,           // Switch idle animations every 8 seconds
  greeting: 3000,       // Greeting animation plays for 3 seconds
  excitement: 2500,     // Excitement animation
  thinking: 4000,       // Thinking animation while AI processes
  celebration: 2000,    // Celebration animation
  grading: 3500,        // Grading explanation animation
  pricing: 3000,        // Pricing discussion animation
  service: 3000,        // Service level discussion
  confused: 2500,       // Confused/help animation
  typing: -1,           // Continuous while loading
};

export default function SAMChatInterface({ isCustomerPortal = false, token = null }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: isCustomerPortal
        ? '👋 Hey there! I\'m SAM, your PSA grading expert! I can help you understand card grades, calculate ROI, and choose the right service level. What questions do you have?'
        : '👋 Hey there! I\'m SAM (Submission Assistant Manager), your ultimate PSA grading expert! Ask me anything about PSA grading standards, service levels, ROI calculations, or managing your submissions!',
      timestamp: new Date(),
      animation: 'greeting'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState('idle_1');
  const [idleAnimationIndex, setIdleAnimationIndex] = useState(1);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  const idleIntervalRef = useRef(null);

  // SAM animation files
  const ANIMATIONS = {
    idle_1: '/images/SAM_idle_1.mp4',
    idle_2: '/images/SAM_idle_2.mp4',
    idle_3: '/images/SAM_idle_3.mp4',
    greeting: '/images/SAM_greeting.mp4',
    excitement: '/images/SAM_excitement.mp4',
    thinking: '/images/SAM_thinking.mp4',
    celebration: '/images/SAM_celebration.mp4',
    grading: '/images/SAM_grading.mp4',
    pricing: '/images/SAM_pricing.mp4',
    service: '/images/SAM_service.mp4',
    confused: '/images/SAM_confused.mp4',
    typing: '/images/SAM_typing.mp4',
    static: '/images/SAM_V2.png',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detect animation trigger from text
  const detectAnimationTrigger = (text) => {
    const lowerText = text.toLowerCase();
    for (const [animationType, keywords] of Object.entries(ANIMATION_TRIGGERS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return animationType;
      }
    }
    return null;
  };

  // Play animation and return to idle
  const playAnimation = (animationType) => {
    if (!animationType || animationType === currentAnimation) return;

    // Clear existing timers
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    if (idleIntervalRef.current) {
      clearInterval(idleIntervalRef.current);
    }

    setCurrentAnimation(animationType);

    const duration = ANIMATION_DURATIONS[animationType];

    // If not continuous animation, return to idle after duration
    if (duration > 0) {
      animationTimeoutRef.current = setTimeout(() => {
        startIdleCycle();
      }, duration);
    }
  };

  // Start idle animation cycling
  const startIdleCycle = () => {
    if (idleIntervalRef.current) {
      clearInterval(idleIntervalRef.current);
    }

    let index = 1;
    setCurrentAnimation(`idle_${index}`);

    idleIntervalRef.current = setInterval(() => {
      index = (index % 3) + 1; // Cycle through idle_1, idle_2, idle_3
      setCurrentAnimation(`idle_${index}`);
    }, ANIMATION_DURATIONS.idle);
  };

  // Initialize idle animation on mount
  useEffect(() => {
    startIdleCycle();
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Detect animation trigger from user input
    const triggerAnimation = detectAnimationTrigger(input);
    if (triggerAnimation) {
      playAnimation(triggerAnimation);
    }

    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    // Show typing animation while loading
    playAnimation('typing');

    try {
      const endpoint = isCustomerPortal
        ? `/portal/sam/chat?token=${token}`
        : '/sam/chat';

      const response = await api.post(endpoint, {
        message: messageText,
        history: messages.slice(-10)
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date()
      };

      // Detect animation from assistant response
      const responseAnimation = detectAnimationTrigger(response.data.message);
      if (responseAnimation) {
        playAnimation(responseAnimation);
      } else {
        startIdleCycle();
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('SAM chat error:', error);
      playAnimation('confused');

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

  const quickQuestions = isCustomerPortal ? [
    'What makes a PSA 10?',
    'Should I grade this card?',
    'What\'s the cost to grade?',
    'How long does grading take?'
  ] : [
    'What makes a PSA 10?',
    'Which service level should I use?',
    'How do I calculate grading ROI?',
    'What\'s the difference between PSA 9 and 10?'
  ];

  const handleQuickQuestion = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* SAM Character Panel - Left Side on Desktop, Top on Mobile */}
      <div className="w-full lg:w-80 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 flex flex-col items-center justify-center p-6 lg:p-8 border-r border-brand-700 lg:min-h-screen">
        <div className="text-center mb-6">
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-2">SAM</h2>
          <p className="text-brand-100 text-sm lg:text-base font-medium">PSA Grading Expert</p>
        </div>

        {/* Animated SAM Character */}
        <div className="relative w-48 h-48 lg:w-64 lg:h-64 mb-6">
          <div className="absolute inset-0 bg-white/10 rounded-3xl backdrop-blur-sm"></div>
          <div className="relative w-full h-full p-4 flex items-center justify-center">
            {ANIMATIONS[currentAnimation]?.endsWith('.mp4') ? (
              <video
                key={currentAnimation}
                src={ANIMATIONS[currentAnimation]}
                autoPlay
                loop={currentAnimation.startsWith('idle') || currentAnimation === 'typing'}
                muted
                playsInline
                className="w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => {
                  // Fallback to static image
                  e.target.style.display = 'none';
                  const img = document.createElement('img');
                  img.src = ANIMATIONS.static;
                  img.className = 'w-full h-full object-contain drop-shadow-2xl animate-pulse';
                  img.alt = 'SAM';
                  e.target.parentElement.appendChild(img);
                }}
              />
            ) : (
              <img
                src={ANIMATIONS.static}
                alt="SAM"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white text-sm font-medium">
            {isLoading ? 'Thinking...' : 'Ready to help'}
          </span>
        </div>

        {/* Animation State Debug (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-white/60 font-mono">
            Animation: {currentAnimation}
          </div>
        )}
      </div>

      {/* Chat Panel - Right Side */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Chat with SAM</h3>
              <p className="text-xs text-gray-500">Your PSA grading assistant</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 flex-shrink-0 bg-brand-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">S</span>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="w-8 h-8 flex-shrink-0 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">You</span>
                </div>
              )}
              <div
                className={`max-w-[70%] ${
                  msg.role === 'user'
                    ? 'bg-gray-900 text-white rounded-2xl rounded-tr-sm'
                    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm'
                } px-5 py-3`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-2 opacity-60">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 flex-shrink-0 bg-brand-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-5 py-3">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length === 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-3">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="text-sm bg-white hover:bg-brand-50 text-gray-700 hover:text-brand-700 px-4 py-2 rounded-full border border-gray-200 hover:border-brand-300 transition-all font-medium"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask SAM anything about PSA grading..."
              className="flex-1 px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 placeholder-gray-500 font-medium resize-none"
              disabled={isLoading}
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
