/**
 * Maps a catalog asset path (`/assets/...`) to its location on ImageKit.
 * Non-alphanumerics in directory names become underscores (an ImageKit folder
 * limitation); the file name is left unchanged. Shared by the app's URL
 * resolvers and the data pipeline's uploads, so both agree on where a shot lives.
 */
export function toImageKitPath(assetPath: string): string {
  const segments = assetPath.replace(/^\/assets/, '').split('/');
  return segments
    .map((segment, i) =>
      i < segments.length - 1 ? segment.replace(/[^a-zA-Z0-9]/g, '_') : segment,
    )
    .join('/');
}
