import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Slider } from "@/components/ui/slider"
import { MinusCircledIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { useToast } from "@/hooks/use-toast"


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
        const size = 120;

        dummyCanvas.width = size;
        dummyCanvas.height = size;

        drawDynamicCircles(ctx, size, gridSize, PadSize);

    };

    const drawDynamicCircles = (
        ctx: CanvasRenderingContext2D | null,
        size: number,
        gridSize: number, // Now represents the circle radius
        padding: number
    ) => {
        ctx!.clearRect(0, 0, size, size); // Clear previous drawings

        // The step includes the circle's diameter and padding
        const step = gridSize * 2 + padding;

        // Calculate how many circles fit horizontally and vertically in the 100x100 box
        const circlesInRow = Math.floor(size / step);
        const circlesInColumn = Math.floor(size / step);

        // Loop through to draw circles based on calculated number of circles
        for (let row = 0; row < circlesInColumn; row++) {
            for (let col = 0; col < circlesInRow; col++) {
                const x = col * step + gridSize; // X-coordinate for circle center
                const y = row * step + gridSize; // Y-coordinate for circle center

                // Draw circle
                ctx!.fillStyle = 'rgb(199, 35, 35)'; // Example color
                ctx!.beginPath();
                ctx!.arc(x, y, gridSize, 0, Math.PI * 2); // Draw circle with the current radius (gridSize)
                ctx!.fill();
            }
        }
    };



    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleGridChange = (value: any) => {
        setGridSize(Number(value));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePadChange = (value: any) => {
        setPadSize(Number(value));
    };

    const handleGridMove = (move: boolean) => {
        if (move && gridSize < 50) {
            setGridSize(gridSize + 5)
        }
        if (!move && gridSize > 5) {
            setGridSize(gridSize - 5)
        }
    }

    const handlePadMove = (move: boolean) => {
        if (move && PadSize < 5) {
            setPadSize(PadSize + 1)
        }
        if (!move && PadSize > 2) {
            setPadSize(PadSize - 1)
        }
    }

    const { toast } = useToast();

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
                        <div className='flex items-center w-[350px] justify-evenly'>
                            <Button variant="outline" onClick={() => handleGridMove(false)}>
                                <MinusCircledIcon height={20} width={20} />
                            </Button>
                            <Slider
                                id="grid-size"
                                min={5}
                                max={50}
                                step={5}
                                value={[gridSize]}
                                onValueChange={handleGridChange}
                                className="w-[200px]"
                            />
                            <Button variant="outline" onClick={() => handleGridMove(true)}>
                                <PlusCircledIcon height={20} width={20} />
                            </Button>
                        </div>
                    </div>
                    <div className='m-3'>
                        <Label htmlFor="pad-size" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Pad Size: {PadSize}
                        </Label>
                        <div className='flex items-center w-[350px] justify-evenly'>
                            <Button variant="outline" onClick={() => handlePadMove(false)}>
                                <MinusCircledIcon height={20} width={20} />
                            </Button>
                            <Slider
                                id="pad-size"
                                min={2}
                                max={5}
                                step={1}
                                value={[PadSize]}
                                onValueChange={handlePadChange}
                                className="w-[200px]"
                            />
                            <Button variant="outline" onClick={() => handlePadMove(true)}>
                                <PlusCircledIcon height={20} width={20} />
                            </Button>
                        </div>
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
                        onClick={() => {
                            if (imageSrc == null) {
                                toast({
                                    variant: "destructive",
                                    title: "Error Processing",
                                    description: "Please select a Image file to continue...",
                                })
                            }
                            processImage(); renderPreview();
                        }}
                        variant="default"
                    >
                        Process Image
                    </Button>
                </div>
            </div>
            {processedImage && (
                <div className='flex items-center justify-center flex-col'>
                    <h2 className="text-xl font-bold">Processed Image:</h2>
                    <a href={processedImage} className='m-5' download="processed-image.png">
                        <Button variant="default">Download</Button>
                    </a>
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
