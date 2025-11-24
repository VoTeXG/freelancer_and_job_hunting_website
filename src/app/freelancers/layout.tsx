export default function FreelancersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3A59D1] via-[#3D90D7] via-[#7AC6D2] to-[#B5FCCD]">
      {children}
    </div>
  );
}
