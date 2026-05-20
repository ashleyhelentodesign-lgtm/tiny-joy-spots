export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full min-h-0 w-full flex-1 flex-col bg-[#FAF6F0]">
      {children}
    </div>
  );
}
