export const location = {pathname: '/'};
export default function useUnprefixedPathname(): string {
  return location.pathname;
}
