/** Test stand-in: the build's link checker is not running, so collecting is a no-op. */
export default function useBrokenLinks() {
  return {collectLink: (_link: string) => {}, collectAnchor: (_anchor: string) => {}};
}
