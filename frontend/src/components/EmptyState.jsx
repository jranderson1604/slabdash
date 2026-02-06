export default function EmptyState({ title, description, icon: Icon, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* DASHY mascot */}
      <div className="mb-6 opacity-30 flex items-center justify-center">
        <img
          src="/images/1F004F9D-A4EB-4BE1-B59B-3E94343B0A5B.png"
          alt="Dashy"
          className="w-32 h-32"
          style={{
            filter: 'grayscale(40%)'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<div class="text-gray-300 text-6xl">📭</div>';
          }}
        />
      </div>

      {/* Custom Icon (if provided) */}
      {Icon && (
        <div className="mb-4">
          <Icon className="w-12 h-12 text-gray-300" />
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-gray-500 text-center max-w-md mb-4">
          {description}
        </p>
      )}

      {/* Action buttons or additional content */}
      {children}
    </div>
  );
}
