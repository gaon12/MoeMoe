const EDGE_COLOR_FALLBACK = "#1a1a1a";

export function averageRgbSamples(samples: readonly number[][]): string {
  if (samples.length === 0) {
    return EDGE_COLOR_FALLBACK;
  }
  const average = (channel: number) =>
    Math.floor(
      samples.reduce((sum, sample) => sum + (sample[channel] ?? 0), 0) /
        samples.length,
    );
  return `rgb(${average(0)}, ${average(1)}, ${average(2)})`;
}

export function extractEdgeColor(img: HTMLImageElement): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return EDGE_COLOR_FALLBACK;
    }

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    if (canvas.width <= 0 || canvas.height <= 0) {
      return EDGE_COLOR_FALLBACK;
    }
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
    return averageRgbSamples(samples);
  } catch {
    return EDGE_COLOR_FALLBACK;
  }
}

export function loadReadableImage(
  url: string,
  signal?: AbortSignal,
  timeoutMs = 5000,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const timeoutId = globalThis.setTimeout(() => {
      cleanup();
      image.src = "";
      reject(new Error(`Edge-color image load timed out: ${url}`));
    }, timeoutMs);
    const cleanup = () => {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
      image.onload = null;
      image.onerror = null;
    };
    const handleAbort = () => {
      cleanup();
      image.src = "";
      reject(new DOMException("Image load aborted", "AbortError"));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }
    signal?.addEventListener("abort", handleAbort, { once: true });
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(
        new Error(`Image is not readable for edge-color sampling: ${url}`),
      );
    };
    image.src = url;
  });
}
