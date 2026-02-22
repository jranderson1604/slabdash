import SAMChatInterface from '../components/SAMChatInterface';

export default function SAMAI() {
  return (
    <div className="fixed inset-0 lg:pl-64" style={{ background: 'rgb(var(--bg-color))' }}>
      {/* SAM Interface — background grid overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,129,112,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,129,112,0.8) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Arc reactor ambient glow top-right */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, rgba(255,129,112,0.15) 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-0 left-0 w-64 h-64 opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle at bottom left, rgba(0,100,255,0.1) 0%, transparent 70%)' }}
        />
      </div>

      {/* SAM Chat Interface */}
      <div className="h-full w-full relative z-10">
        <SAMChatInterface isCustomerPortal={false} />
      </div>
    </div>
  );
}
