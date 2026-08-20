export default function Loading() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(245, 245, 245, 0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      zIndex: 9999,
    }}>
      <div style={{
        width: "clamp(48px, 10vw, 72px)",
        height: "clamp(48px, 10vw, 72px)",
        border: "4px solid rgba(0,0,0,0.08)",
        borderTopColor: "#2d5016",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{
        marginTop: "clamp(16px, 4vw, 24px)",
        color: "#2d5016",
        fontSize: "clamp(20px, 5vw, 32px)",
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}>
        Nazira
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
