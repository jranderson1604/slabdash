import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-6 animate-bounce flex items-center justify-center">
        {imgFailed
          ? <div className="text-brand-500 text-6xl">⏳</div>
          : <img src="/images/SAM_V2.png" alt="SAM" className="w-32 h-32" onError={() => setImgFailed(true)} />
        }
      </div>

      <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-4" />

      <p className="text-gray-600 text-center font-medium">
        {message}
      </p>
    </div>
  );
}
