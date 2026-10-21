import SAMChatInterface from '../components/SAMChatInterface';

export default function SAMAI() {
  return (
    <div className="fixed inset-0 lg:pl-64" style={{ background: 'rgb(var(--bg-color))' }}>
      {/* SAM environment — grid + ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,129,112,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,129,112,0.9) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Scan line sweep */}
        <div className="absolute inset-0 stark-scanline opacity-50" />
        {/* Coral glow — top right */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, rgba(255,129,112,0.12) 0%, transparent 65%)' }}
        />
        {/* Blue glow — bottom left */}
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at bottom left, rgba(60,100,255,0.07) 0%, transparent 65%)' }}
        />
      </div>

      {/* SAM Chat Interface */}
      <div className="h-full w-full relative z-10">
        <SAMChatInterface isCustomerPortal={false} />
      </div>
    </div>
  );
}
