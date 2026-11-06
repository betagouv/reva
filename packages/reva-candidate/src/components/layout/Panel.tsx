export function Panel({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className={`bg-white lg:shadow-lifted ${narrow ? "max-w-2xl mx-auto" : "w-full pb-10 md:py-10 px-6"}`}
    >
      {children}
    </div>
  );
}
