import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* DASHY mascot with bounce animation */}
      <div className="mb-6 animate-bounce">
        <img
          src="/images/dashy.png"
          alt="Dashy"
          className="w-32 h-32"
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
