import React, { useState, useRef } from 'react';

// Utility function to enhance color
function enhanceColor(r: number, g: number, b: number, contrastFactor: number, saturationFactor: number) {
  const enhanceContrast = (value: number) => {
    return Math.max(0, Math.min(255, ((value / 255 - 0.5) * contrastFactor + 0.5) * 255));
  };

  const enhanceSaturation = (r: number, g: number, b: number) => {
    const gray = 0.3 * r + 0.59 * g + 0.11 * b;
    return {
      r: Math.min(255, r + saturationFactor * (r - gray)),
      g: Math.min(255, g + saturationFactor * (g - gray)),
      b: Math.min(255, b + saturationFactor * (b - gray)),
    };
  };

  r = enhanceContrast(r);
  g = enhanceContrast(g);
  b = enhanceContrast(b);

  const saturated = enhanceSaturation(r, g, b);
  return {
    r: Math.floor(saturated.r),
    g: Math.floor(saturated.g),
    b: Math.floor(saturated.b),
  };
}

// Average color function
function averageColor(gridData: Uint8ClampedArray, contrastFactor: number, saturationFactor: number) {
  let r = 0, g = 0, b = 0;
  const length = gridData.length / 4;

  for (let i = 0; i < gridData.length; i += 4) {
    r += gridData[i];
    g += gridData[i + 1];
    b += gridData[i + 2];
  }

  r = r / length;
  g = g / length;
  b = b / length;

  return enhanceColor(r, g, b, contrastFactor, saturationFactor);
}

const ImageProcessor = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = () => {
    const processingCanvas = processingCanvasRef.current;
    if (!processingCanvas) return;

    const img = new Image();
    img.src = imageSrc!;
    img.onload = () => {
      const processingCtx = processingCanvas.getContext('2d');
      const gridSize = 10;
      const padding = 2;
      const dotRadius = (gridSize - padding) / 2;
      const contrastFactor = 1;
      const saturationFactor = 1;

      // Set canvas to the original image size
      processingCanvas.width = img.width;
      processingCanvas.height = img.height;

      // Fill background with black
      processingCtx!.fillStyle = 'black';
      processingCtx!.fillRect(0, 0, img.width, img.height);

      // Draw the original image onto an invisible canvas
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      tempCtx.drawImage(img, 0, 0, img.width, img.height);
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);

      if (imageData) {
        const { width, height } = imageData;

        // Loop through the image and process it
        for (let y = 0; y < height; y += gridSize) {
          for (let x = 0; x < width; x += gridSize) {
            const gridPixels = [];
            for (let gy = 0; gy < gridSize; gy++) {
              for (let gx = 0; gx < gridSize; gx++) {
                const pixelIndex = ((y + gy) * width + (x + gx)) * 4;
                gridPixels.push(
                  imageData.data[pixelIndex],
                  imageData.data[pixelIndex + 1],
                  imageData.data[pixelIndex + 2],
                  imageData.data[pixelIndex + 3]
                );
              }
            }

            const { r, g, b } = averageColor(new Uint8ClampedArray(gridPixels), contrastFactor, saturationFactor);
            processingCtx!.fillStyle = `rgb(${r}, ${g}, ${b})`;
            processingCtx!.beginPath();
            processingCtx!.arc(x + gridSize / 2, y + gridSize / 2, dotRadius, 0, Math.PI * 2);
            processingCtx!.fill();
          }
        }

        // Convert the processed full-resolution canvas to an image for download
        processingCanvas.toBlob((blob) => {
          if (blob) {
            const processedUrl = URL.createObjectURL(blob);
            setProcessedImage(processedUrl);
          }
        });
      }
    };
  };

  const renderPreview = () => {
    const previewCanvas = previewCanvasRef.current;
    const img = new Image();
    img.src = imageSrc!;
    img.onload = () => {
      const previewCtx = previewCanvas?.getContext('2d');

      const previewWidth = 1000; // Adjust preview width
      const aspectRatio = img.height / img.width;
      const previewHeight = previewWidth * aspectRatio;

      if (previewCanvas && previewCtx) {
        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;
        previewCtx.clearRect(0, 0, previewWidth, previewHeight);
        previewCtx.drawImage(img, 0, 0, previewWidth, previewHeight);
      }
    };
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Image Processor</h1>
      <input type="file" onChange={handleImageUpload} className="mb-4" />
      {imageSrc && (
        <div>
          <h2 className="text-xl font-bold">Original Image (Preview):</h2>
          <canvas ref={previewCanvasRef} className="border mb-4" />
          <button
            onClick={() => { processImage(); renderPreview(); }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          >
            Process Image
          </button>
        </div>
      )}
      {processedImage && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Processed Image:</h2>
          <img src={processedImage} alt="Processed" className="border mb-4" />
          <a href={processedImage} download="processed-image.png" className="text-blue-500 mt-4 block">
            Download Full-Resolution Processed Image
          </a>
        </div>
      )}
      {/* Canvas for preview (original image) */}
      <canvas ref={previewCanvasRef} className="hidden" />

      {/* Hidden canvas for full-resolution processing */}
      <canvas ref={processingCanvasRef} className="hidden" />
    </div>
  );
};

export default ImageProcessor;
