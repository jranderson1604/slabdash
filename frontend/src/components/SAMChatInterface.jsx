import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, TrendingUp, Calculator, HelpCircle, Lightbulb, ThumbsUp, Brain, Camera, Upload } from 'lucide-react';
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
        ? '👋 Hey there! I\'m SAM, your PSA grading expert! I can help you understand card grades, calculate ROI, choose the right service level, and even scan your cards to determine if they\'re worth grading. What questions do you have?'
        : '👋 Hey there! I\'m SAM (Submission Assistant Manager), your ultimate PSA grading expert! Ask me anything about PSA grading standards, service levels, ROI calculations, managing submissions, or upload a card photo for me to analyze!',
      timestamp: new Date(),
      animation: 'greeting'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState('idle_1');
  const [idleAnimationIndex, setIdleAnimationIndex] = useState(1);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    playAnimation('thinking');

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target.result;
      setUploadedImage(imageUrl);

      // Add user message with image
      const userMessage = {
        role: 'user',
        content: '📸 [Uploaded card image for analysis]',
        timestamp: new Date(),
        image: imageUrl
      };
      setMessages(prev => [...prev, userMessage]);

      try {
        // Send image to SAM for analysis
        const formData = new FormData();
        formData.append('image', file);

        const endpoint = isCustomerPortal
          ? `/portal/sam/scan?token=${token}`
          : '/sam/scan';

        const response = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const analysisMessage = {
          role: 'assistant',
          content: response.data.message || response.data.analysis,
          timestamp: new Date(),
          scanResults: response.data
        };

        playAnimation('grading');
        setMessages(prev => [...prev, analysisMessage]);
      } catch (error) {
        console.error('SAM scan error:', error);
        playAnimation('confused');

        const errorMessage = {
          role: 'assistant',
          content: '😅 Hmm, I\'m having trouble analyzing that image. Make sure it\'s a clear photo of the card! Try again?',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setScanning(false);
        setUploadedImage(null);
        startIdleCycle();
      }
    };

    reader.readAsDataURL(file);
  };

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
    'Scan a card to check gradability'
  ];

  const handleQuickQuestion = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gradient-to-br from-[#F5F5DC] via-[#FFF8F0] to-[#F5F5DC]">
      {/* SAM Character Panel - Left Side on Desktop, Top on Mobile */}
      <div className="w-full lg:w-80 bg-gradient-to-br from-[#FF8170] via-[#FF9580] to-[#FF8170] flex flex-col items-center justify-center p-6 lg:p-8 border-r border-[#FF6B5A] lg:min-h-screen">
        <div className="text-center mb-6">
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-2">SAM</h2>
          <p className="text-gray-800 text-sm lg:text-base font-bold">PSA Grading Expert</p>
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
        <div className="flex items-center gap-2 bg-gray-900/20 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-800/30">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-gray-900 text-sm font-bold">
            {isLoading ? 'Thinking...' : scanning ? 'Scanning...' : 'Ready to help'}
          </span>
        </div>

        {/* Animation State Debug (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-gray-800 font-mono">
            Animation: {currentAnimation}
          </div>
        )}
      </div>

      {/* Chat Panel - Right Side */}
      <div className="flex-1 flex flex-col bg-[#FFF8F0]">
        {/* Chat Header */}
        <div className="bg-[#F5F5DC] border-b border-[#E8DCC0] px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF8170] rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Chat with SAM</h3>
              <p className="text-xs text-gray-700">Your PSA grading assistant</p>
            </div>
          </div>
          {/* Upload Card Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#FF8170] hover:bg-[#FF6B5A] text-gray-900 rounded-xl font-bold transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Card</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 lg:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 flex-shrink-0 bg-[#FF8170] rounded-full flex items-center justify-center">
                  <span className="text-gray-900 text-sm font-bold">S</span>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="w-8 h-8 flex-shrink-0 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-[#FFF8F0] text-sm font-bold">U</span>
                </div>
              )}
              <div
                className={`max-w-[85%] lg:max-w-[70%] ${
                  msg.role === 'user'
                    ? 'bg-gray-800 text-gray-100 rounded-2xl rounded-tr-sm'
                    : 'bg-[#F5F5DC] text-gray-900 rounded-2xl rounded-tl-sm border-2 border-[#E8DCC0]'
                } px-4 lg:px-5 py-3`}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Uploaded card"
                    className="w-full max-w-xs rounded-lg mb-3 border-2 border-gray-300"
                  />
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.scanResults && (
                  <div className="mt-3 pt-3 border-t border-gray-300 space-y-2 text-sm">
                    {msg.scanResults.gradable !== undefined && (
                      <p className="font-bold">
                        {msg.scanResults.gradable ? '✅ Worth Grading!' : '❌ Not Recommended for Grading'}
                      </p>
                    )}
                    {msg.scanResults.estimatedGrade && (
                      <p>Estimated Grade: <strong>{msg.scanResults.estimatedGrade}</strong></p>
                    )}
                    {msg.scanResults.condition && (
                      <p>Condition: {msg.scanResults.condition}</p>
                    )}
                  </div>
                )}
                <p className="text-xs mt-2 opacity-60">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {(isLoading || scanning) && (
            <div className="flex gap-4">
              <div className="w-8 h-8 flex-shrink-0 bg-[#FF8170] rounded-full flex items-center justify-center">
                <span className="text-gray-900 text-sm font-bold">S</span>
              </div>
              <div className="bg-[#F5F5DC] border-2 border-[#E8DCC0] rounded-2xl rounded-tl-sm px-5 py-3">
                <Loader2 className="w-5 h-5 text-[#FF8170] animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length === 1 && (
          <div className="px-4 lg:px-6 py-4 border-t border-[#E8DCC0] bg-[#F5F5DC]">
            <p className="text-sm font-bold text-gray-900 mb-3">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (question.toLowerCase().includes('scan')) {
                      fileInputRef.current?.click();
                    } else {
                      handleQuickQuestion(question);
                    }
                  }}
                  className="text-sm bg-[#FFF8F0] hover:bg-[#FF8170] text-gray-900 hover:text-gray-900 px-4 py-2 rounded-full border-2 border-[#E8DCC0] hover:border-[#FF8170] transition-all font-bold"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Mobile Optimized */}
        <div className="bg-[#F5F5DC] border-t border-[#E8DCC0] px-3 lg:px-6 py-3 lg:py-4 sticky bottom-0">
          <div className="flex gap-2 lg:gap-3 items-end">
            {/* Upload Button - Mobile */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || scanning}
              className="lg:hidden flex-shrink-0 p-3 bg-[#FF8170] hover:bg-[#FF6B5A] text-gray-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Upload card image"
            >
              <Camera className="w-5 h-5" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask SAM anything about PSA grading..."
              className="flex-1 px-4 py-3 bg-[#FFF8F0] border-2 border-[#E8DCC0] rounded-2xl focus:ring-2 focus:ring-[#FF8170] focus:border-[#FF8170] text-gray-900 placeholder-gray-600 font-medium resize-none touch-manipulation"
              disabled={isLoading || scanning}
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
                fontSize: '16px' // Prevents iOS zoom on focus
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || scanning}
              className="flex-shrink-0 p-3 bg-[#FF8170] hover:bg-[#FF6B5A] text-gray-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
