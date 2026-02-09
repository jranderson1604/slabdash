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

      // Log AI mode for debugging
      if (response.data.mode) {
        console.log(`🤖 SAM Response Mode: ${response.data.mode}`);
      }

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
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Modern Header - ChatGPT Style */}
      <div className="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-white/10 px-4 lg:px-6 py-4 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Small SAM Avatar with glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/20">
                <span className="text-2xl font-black text-white drop-shadow-lg">S</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
                SAM
              </h1>
              <p className="text-sm text-gray-400 font-semibold">PSA Grading Expert</p>
            </div>
          </div>

          {/* Upload Button - Desktop */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || scanning}
            className="hidden lg:flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-bold transition-all shadow-2xl hover:shadow-purple-500/50 border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-5 h-5" />
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
      </div>

      {/* Messages Area - ChatGPT Style */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 lg:py-8 space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-50"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                    <span className="text-white text-sm font-black">S</span>
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                  <span className="text-white text-sm font-black">U</span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] lg:max-w-[75%] ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-2xl shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100 shadow-2xl shadow-black/50'
                } rounded-3xl px-6 py-4 border border-white/10 backdrop-blur-xl`}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Uploaded card"
                    className="w-full max-w-sm rounded-2xl mb-4 border-2 border-white/20 shadow-xl"
                  />
                )}
                <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                {msg.scanResults && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                    {msg.scanResults.gradable !== undefined && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                        msg.scanResults.gradable
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {msg.scanResults.gradable ? '✅ Worth Grading!' : '❌ Not Recommended'}
                      </div>
                    )}
                    {msg.scanResults.estimatedGrade && (
                      <p className="text-purple-300 font-semibold">
                        Estimated Grade: <span className="text-white">{msg.scanResults.estimatedGrade}</span>
                      </p>
                    )}
                    {msg.scanResults.condition && (
                      <p className="text-blue-300 font-semibold">
                        Condition: <span className="text-white">{msg.scanResults.condition}</span>
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs mt-3 opacity-50 font-medium">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {(isLoading || scanning) && (
            <div className="flex gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-50 animate-pulse"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                  <span className="text-white text-sm font-black">S</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl px-6 py-4 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Questions - Only show at start */}
      {messages.length === 1 && (
        <div className="border-t border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
            <p className="text-sm font-bold text-gray-300 mb-4">Quick questions:</p>
            <div className="flex flex-wrap gap-3">
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
                  className="px-5 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-purple-600 hover:to-blue-600 text-gray-300 hover:text-white rounded-2xl border border-white/10 hover:border-white/30 transition-all font-semibold shadow-lg hover:shadow-purple-500/30 text-sm backdrop-blur-xl"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Modern Glass Design */}
      <div className="border-t border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl sticky bottom-0">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex gap-3 items-end">
            {/* Upload Button - Mobile */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || scanning}
              className="lg:hidden flex-shrink-0 p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl hover:shadow-purple-500/50 border border-white/20"
              aria-label="Upload card image"
            >
              <Camera className="w-6 h-6" />
            </button>

            <div className="flex-1 relative">
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
                className="w-full px-6 py-4 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-white/10 focus:border-purple-500/50 rounded-3xl focus:ring-4 focus:ring-purple-500/20 text-white placeholder-gray-500 font-medium resize-none touch-manipulation shadow-2xl backdrop-blur-xl transition-all"
                disabled={isLoading || scanning}
                rows={1}
                style={{
                  minHeight: '56px',
                  maxHeight: '160px',
                  fontSize: '16px'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || scanning}
              className="flex-shrink-0 p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl hover:shadow-purple-500/50 border border-white/20 hover:scale-105"
              aria-label="Send message"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
