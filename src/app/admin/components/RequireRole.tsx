import { useAdminRole } from "../hooks/useAdminRole";

export function RequireRole({
  allow,
  children,
}: {
  allow: ("admin" | "operator" | "viewer")[];
  children: React.ReactNode;
}) {
  const { role, loading } = useAdminRole();

  if (loading) return <div className="text-white p-6">Checking permission...</div>;
  if (!role || !allow.includes(role))
    return <div className="text-red-400 p-6">권한이 없습니다.</div>;

  return <>{children}</>;
}
