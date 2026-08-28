export function AmbientBg() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[760px]"
      style={{
        background:
          "radial-gradient(900px 520px at 12% -6%, #ffe1da, transparent 70%), radial-gradient(900px 520px at 100% 4%, #e4eefb, transparent 70%)",
      }}
    />
  );
}
