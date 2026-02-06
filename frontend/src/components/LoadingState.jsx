import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* SlabDash S Logo with pulse animation */}
      <div className="mb-6 animate-pulse">
        <img
          src="/images/logo-icon-alt.png.svg"
          alt="SlabDash"
          className="w-24 h-24 opacity-30"
        />
      </div>

      {/* Spinner */}
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-4" />

      {/* Loading message */}
      <p className="text-gray-600 text-center">
        {message}
      </p>
    </div>
  );
}
