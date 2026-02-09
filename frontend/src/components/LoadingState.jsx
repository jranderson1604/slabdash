import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* SAM mascot with bounce animation */}
      <div className="mb-6 animate-bounce flex items-center justify-center">
        <img
          src="/images/SAM_V2.png"
          alt="SAM"
          className="w-32 h-32"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<div class="text-brand-500 text-6xl animate-bounce">⏳</div>';
          }}
        />
      </div>

      {/* Spinner */}
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-4" />

      {/* Loading message */}
      <p className="text-gray-600 text-center font-medium">
        {message}
      </p>
    </div>
  );
}
