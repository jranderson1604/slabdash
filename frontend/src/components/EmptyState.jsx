export default function EmptyState({ title, description, icon: Icon, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* SlabDash S Logo */}
      <div className="mb-6 opacity-20">
        <img
          src="/images/logo-icon-alt.png.svg"
          alt="SlabDash"
          className="w-24 h-24"
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
