/** Tileable tangent-space normals. Image rows run down, UV V runs up. */
export function heightToNormals(pixels: Uint8ClampedArray, width: number, height: number, strength: number) {
  const out = new Uint8ClampedArray(width * height * 4);
  const sample = (x: number, y: number) => pixels[(((y + height) % height) * width + (x + width) % width) * 4] / 255;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const nx = (sample(x - 1, y) - sample(x + 1, y)) * strength * 4;
    const ny = (sample(x, y + 1) - sample(x, y - 1)) * strength * 4;
    const length = Math.hypot(nx, ny, 1), i = (y * width + x) * 4;
    out[i] = (nx / length + 1) * 127.5;
    out[i + 1] = (ny / length + 1) * 127.5;
    out[i + 2] = (1 / length + 1) * 127.5;
    out[i + 3] = 255;
  }
  return out;
}
/** Convert once per assigned material so preview and GLB use the same supported map. */
export async function bumpToNormalImage(source: string, strength: number) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  data.data.set(heightToNormals(data.data, canvas.width, canvas.height, strength));
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}
