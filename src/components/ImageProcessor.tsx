import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Slider } from "@/components/ui/slider"
import Link from 'next/link';

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
    const [gridSize, setGridSize] = useState<number>(10);
    const [PadSize, setPadSize] = useState<number>(2);
    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const dummyCanvasRef = useRef<HTMLCanvasElement | null>(null); // Reference for dummy canvas

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
            const dotRadius = (gridSize - PadSize) / 2;
            const contrastFactor = 1;
            const saturationFactor = 1;

            // Set canvas to the original image size
            processingCanvas.width = img.width;
            processingCanvas.height = img.height;

            // Fill background with black
            processingCtx!.fillStyle = 'rgb(0,0,0)';
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

            const previewWidth = window.innerWidth - 100; // Adjust preview width
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

    const renderDummyEffect = () => {
        const dummyCanvas = dummyCanvasRef.current;
        if (!dummyCanvas) return;

        const ctx = dummyCanvas.getContext('2d');
        const size = 100;

        dummyCanvas.width = size;
        dummyCanvas.height = size;

        drawDynamicCircles(ctx, size, gridSize, PadSize);

    };

    const drawDynamicCircles = (
        ctx: CanvasRenderingContext2D | null,
        size: number,
        gridSize: number,
        padding: number
    ) => {
        ctx!.clearRect(0, 0, size, size); // Clear previous drawings

        const step = size / gridSize; // Step size for grid based on dynamic grid size
        let dotRadius = (step - padding) / 2; // Calculate dynamic dot radius based on padding and grid size

        // Ensure the radius is never negative or too small
        if (dotRadius < 1) {
            dotRadius = 1; // Set a minimum radius of 1 to avoid too small dots
        }

        // Loop to draw circles based on dynamic grid size and padding
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const x = col * step + step / 2; // X-coordinate for circle center
                const y = row * step + step / 2; // Y-coordinate for circle center

                // Draw circle
                ctx!.fillStyle = 'rgb(199, 35, 35)'; // Example color
                ctx!.beginPath();
                ctx!.arc(x, y, dotRadius, 0, Math.PI * 2); // Draw circle at calculated position
                ctx!.fill();
            }
        }
    };


    const handleGridChange = (value: string) => {
        setGridSize(Number(value));
    };
    const handlePadChange = (value: string) => {
        setPadSize(Number(value));
    };

    useEffect(() => {
        if (imageSrc) {
            renderPreview();
        }
        renderDummyEffect(); // Update dummy effect when grid size changes
    }, [imageSrc, gridSize, PadSize]);

    return (
        <div className="p-4">
            <div className="sm:w-[50svw] w-[90svw] items-start m-5 justify-evenly flex flex-col gap-3">
                <div>
                    <Label htmlFor="picture">Your Image</Label>
                    <Input id="picture" type="file" onChange={handleImageUpload} />
                </div>
                <div className="w-[150px]">
                    <div className='m-3'>
                        <Label htmlFor="grid-size" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Grid Size: {gridSize}
                        </Label>
                        <Slider
                            id="grid-size"
                            min={5}
                            max={50}
                            step={5}
                            value={[gridSize]}
                            onValueChange={() => handleGridChange}
                            className="w-full"
                        />
                    </div>
                    <div className='m-3'>
                        <Label htmlFor="pad-size" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Pad Size: {PadSize}
                        </Label>
                        <Slider
                            id="pad-size"
                            min={2}
                            max={5}
                            step={1}
                            value={[PadSize]}
                            onValueChange={() => handlePadChange}
                            className="w-full"
                        />
                    </div>
                    <div className="flex m-3 items-center justify-center flex-col">
                        <div>
                            Preview: 100px x 100px
                        </div>
                        <canvas ref={dummyCanvasRef} className="border" width="100" height="100" />
                    </div>
                </div>
                <div>
                    <Button
                        onClick={() => { processImage(); renderPreview(); }}
                        variant="default"
                    >
                        Process Image
                    </Button>
                </div>
            </div>
            {processedImage && (
                <div className='flex items-center justify-center flex-col'>
                    <h2 className="text-xl font-bold">Processed Image:</h2>
                    <Button asChild variant="default" className='m-4'>
                        <Link href={processedImage} download="processed-image.png" >
                            Download Full-Resolution Processed Image
                        </Link>
                    </Button>
                    <img src={processedImage} alt="Processed" className="border mb-4" />
                </div>
            )}

            {imageSrc && (
                <div className='flex items-center justify-center flex-col'>
                    <canvas ref={previewCanvasRef} className="border m-5" />
                </div>
            )}

            {/* Hidden canvas for full-resolution processing */}
            <canvas ref={processingCanvasRef} className="hidden" />
        </div>
    );
};

export default ImageProcessor;
