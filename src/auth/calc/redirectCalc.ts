export const getLoginRedirect = (path: string) => {
  return `/login?redirect=${encodeURIComponent(path)}`;
};