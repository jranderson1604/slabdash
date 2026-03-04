import { useState } from 'react';

export default function EmptyState({ title, description, icon: Icon, children }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-6 opacity-50 flex items-center justify-center">
        {imgFailed
          ? <div className="text-gray-400 text-6xl">📭</div>
          : (
            <img
              src="/images/SAM_V2.png"
              alt="SAM"
              className="w-32 h-32"
              style={{ filter: 'grayscale(40%)' }}
              onError={() => setImgFailed(true)}
            />
          )
        }
      </div>

      {Icon && (
        <div className="mb-4">
          <Icon className="w-12 h-12 text-brand-300" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>

      {description && (
        <p className="text-gray-500 text-center max-w-md mb-4">
          {description}
        </p>
      )}

      {children}
    </div>
  );
}
