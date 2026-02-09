import SAMChatInterface from '../components/SAMChatInterface';
import { Brain, Sparkles } from 'lucide-react';

export default function SAMAI() {
  return (
    <div className="fixed inset-0 lg:pl-64 pt-16 bg-white">
      {/* Full-screen SAM Chat Interface */}
      <div className="h-full w-full">
        <SAMChatInterface isCustomerPortal={false} />
      </div>
    </div>
  );
}
