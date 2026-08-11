export function extractEdgeColor(img: HTMLImageElement): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "#1a1a1a";

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const sampleSize = 10;
    const samples: number[][] = [];
    const stepX = Math.max(1, Math.floor(canvas.width / sampleSize));
    for (let x = 0; x < canvas.width; x += stepX) {
      const top = ctx.getImageData(x, 0, 1, 1).data;
      const bottom = ctx.getImageData(x, canvas.height - 1, 1, 1).data;
      samples.push([top[0], top[1], top[2]], [bottom[0], bottom[1], bottom[2]]);
    }
    const stepY = Math.max(1, Math.floor(canvas.height / sampleSize));
    for (let y = 0; y < canvas.height; y += stepY) {
      const left = ctx.getImageData(0, y, 1, 1).data;
      const right = ctx.getImageData(canvas.width - 1, y, 1, 1).data;
      samples.push([left[0], left[1], left[2]], [right[0], right[1], right[2]]);
    }
    if (samples.length === 0) return "#1a1a1a";

    const average = (channel: number) =>
      Math.floor(
        samples.reduce((sum, sample) => sum + sample[channel], 0) /
          samples.length,
      );
    return `rgb(${average(0)}, ${average(1)}, ${average(2)})`;
  } catch (error) {
    console.error("Failed to extract edge color:", error);
    return "#1a1a1a";
  }
}
