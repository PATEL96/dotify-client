/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Slider } from "@/components/ui/slider";
import { MinusCircledIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import posthog from "@/lib/posthog";

// Utility function to enhance color with alpha support
function enhanceColor(r: number, g: number, b: number, a: number, contrastFactor: number, saturationFactor: number) {
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
		a: a
	};
}

// Average color function with alpha support
function averageColor(gridData: Uint8ClampedArray, contrastFactor: number, saturationFactor: number) {
	let r = 0, g = 0, b = 0, a = 0;
	let count = 0;
	const length = gridData.length / 4;

	for (let i = 0; i < gridData.length; i += 4) {
		// Only include pixels with significant alpha
		if (gridData[i + 3] > 20) {
			r += gridData[i];
			g += gridData[i + 1];
			b += gridData[i + 2];
			a += gridData[i + 3];
			count++;
		}
	}

	// If no significant pixels were found, return fully transparent
	if (count === 0) {
		return { r: 0, g: 0, b: 0, a: 0 };
	}

	r = r / count;
	g = g / count;
	b = b / count;
	a = a / count;

	return enhanceColor(r, g, b, a, contrastFactor, saturationFactor);
}

// Define export format types
type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg';

const ImageProcessor = () => {
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [processedImages, setProcessedImages] = useState<{ [key in ExportFormat]?: string }>({});
	const [gridSize, setGridSize] = useState<number>(10);
	const [PadSize, setPadSize] = useState<number>(2);
	const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const dummyCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [backgroundColor, setBackgroundColor] = useState<string>("#000000");
	const [useTransparentBg, setUseTransparentBg] = useState<boolean>(false);
	const [exportQuality, setExportQuality] = useState<number>(80);
	const [originalImageSize, setOriginalImageSize] = useState<{ width: number, height: number } | null>(null);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [displayFormat, setDisplayFormat] = useState<ExportFormat>('png');

	const handleClear = () => {
		setImageSrc(null);
		setProcessedImages({});
		setGridSize(10);
		setPadSize(2);
		setBackgroundColor("#000000");
		setUseTransparentBg(false);
		setExportQuality(80);
		setOriginalImageSize(null);
		setIsProcessing(false);
		setDisplayFormat('png');
	}

	const processImage = async () => {
		if (!imageSrc) {
			toast.error("Please select an image file to continue...");
			return;
		}

		setIsProcessing(true);

		try {
			const processingCanvas = processingCanvasRef.current;
			if (!processingCanvas) {
				throw new Error("Processing canvas not available");
			}

			const img = new Image();
			img.src = imageSrc;

			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error("Failed to load image"));
			});

			const processingCtx = processingCanvas.getContext('2d', { alpha: true });
			const dotRadius = (gridSize - PadSize) / 2;
			const contrastFactor = 1;
			const saturationFactor = 1;

			// Set canvas to the original image size
			processingCanvas.width = img.width;
			processingCanvas.height = img.height;

			// Store original size for SVG export
			setOriginalImageSize({ width: img.width, height: img.height });

			// Clear the canvas first
			processingCtx!.clearRect(0, 0, img.width, img.height);

			// Fill background with selected color if not transparent
			if (!useTransparentBg) {
				processingCtx!.fillStyle = backgroundColor;
				processingCtx!.fillRect(0, 0, img.width, img.height);
			}

			// Draw the original image onto an invisible canvas
			const tempCanvas = document.createElement('canvas');
			const tempCtx = tempCanvas.getContext('2d', { alpha: true })!;
			tempCanvas.width = img.width;
			tempCanvas.height = img.height;
			tempCtx.drawImage(img, 0, 0, img.width, img.height);
			const imageData = tempCtx.getImageData(0, 0, img.width, img.height);

			if (imageData) {
				const { width, height } = imageData;

				// Store circles data for SVG export
				const circlesData: Array<{ x: number, y: number, r: number, color: string }> = [];

				// Loop through the image and process it
				for (let y = 0; y < height; y += gridSize) {
					for (let x = 0; x < width; x += gridSize) {
						const gridPixels = [];
						for (let gy = 0; gy < gridSize; gy++) {
							for (let gx = 0; gx < gridSize; gx++) {
								const pixelIndex = ((y + gy) * width + (x + gx)) * 4;
								if (pixelIndex < imageData.data.length) {
									gridPixels.push(
										imageData.data[pixelIndex],
										imageData.data[pixelIndex + 1],
										imageData.data[pixelIndex + 2],
										imageData.data[pixelIndex + 3]
									);
								}
							}
						}

						const { r, g, b, a } = averageColor(new Uint8ClampedArray(gridPixels), contrastFactor, saturationFactor);

						// Skip drawing if alpha is too low (transparent area)
						if (a < 20) continue;

						// Use rgba to include transparency
						const circleColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
						processingCtx!.fillStyle = circleColor;
						processingCtx!.beginPath();
						processingCtx!.arc(x + gridSize / 2, y + gridSize / 2, dotRadius, 0, Math.PI * 2);
						processingCtx!.fill();

						// Store circle data for SVG export with alpha
						circlesData.push({
							x: x + gridSize / 2,
							y: y + gridSize / 2,
							r: dotRadius,
							color: circleColor
						});
					}
				}

				// Generate SVG with transparency support
				const svgUrl = generateSVG(circlesData, img.width, img.height);

				// Generate all formats in parallel
				const newProcessedImages: { [key in ExportFormat]?: string } = { svg: svgUrl };

				// Process PNG, JPEG, and WebP simultaneously
				const promises = ['png', 'jpeg', 'webp'].map(format =>
					new Promise<[ExportFormat, string]>((resolve) => {
						processingCanvas.toBlob(
							(blob) => {
								if (blob) {
									const processedUrl = URL.createObjectURL(blob);
									resolve([format as ExportFormat, processedUrl]);
								} else {
									resolve([format as ExportFormat, '']);
								}
							},
							`image/${format === 'jpeg' ? 'jpeg' : format}`,
							format === 'png' ? undefined : exportQuality / 100
						);
					})
				);

				const results = await Promise.all(promises);
				results.forEach(([format, url]) => {
					if (url) newProcessedImages[format] = url;
				});

				setProcessedImages(newProcessedImages);
				toast.success("Processed Successfully");
				posthog.capture("image_processed", { "comment": "Yay...." });
			}
		} catch (error) {
			console.error("Error processing image:", error);
			toast.error("Failed to process image");
		} finally {
			setIsProcessing(false);
		}
	};

	// Generate SVG from processed data - with transparency support
	const generateSVG = (
		circles: Array<{ x: number, y: number, r: number, color: string }>,
		width: number,
		height: number
	): string => {
		let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

		// Add background if not transparent
		if (!useTransparentBg) {
			svgContent += `<rect width="${width}" height="${height}" fill="${backgroundColor}" />`;
		}

		// Add all circles with alpha support
		circles.forEach(circle => {
			svgContent += `<circle cx="${circle.x}" cy="${circle.y}" r="${circle.r}" fill="${circle.color}" />`;
		});

		svgContent += '</svg>';

		// Create a blob from SVG content
		const blob = new Blob([svgContent], { type: 'image/svg+xml' });
		return URL.createObjectURL(blob);
	};

	const renderPreview = () => {
		const previewCanvas = previewCanvasRef.current;
		const img = new Image();
		img.src = imageSrc!;
		img.onload = () => {
			const previewCtx = previewCanvas?.getContext('2d', { alpha: true });

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

		const ctx = dummyCanvas.getContext('2d', { alpha: true });
		const size = 120;

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

		// Fill background with selected color if not transparent
		if (!useTransparentBg) {
			ctx!.fillStyle = backgroundColor;
			ctx!.fillRect(0, 0, size, size);
		}

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

				// Draw circle with varying alpha to demonstrate transparency
				const alpha = (row + col) % 3 === 0 ? 0.5 : 1; // Add some variation in alpha for demo
				ctx!.fillStyle = `rgba(199, 35, 35, ${alpha})`; // Example color with alpha
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleQualityChange = (value: any) => {
		setExportQuality(Number(value));
	};

	const handleGridMove = (move: boolean) => {
		if (move && gridSize < 50) {
			setGridSize(gridSize + 5);
		}
		if (!move && gridSize > 5) {
			setGridSize(gridSize - 5);
		}
	};

	const handlePadMove = (move: boolean) => {
		if (move && PadSize < 5) {
			setPadSize(PadSize + 1);
		}
		if (!move && PadSize > 2) {
			setPadSize(PadSize - 1);
		}
	};

	const handleImageUpload = (file: File | null) => {
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				setImageSrc(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);

		const file = event.dataTransfer.files?.[0];
		handleImageUpload(file);
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true); // Change the drop zone style when dragging
	};

	const handleDragLeave = () => {
		setIsDragging(false); // Reset style when not dragging
	};

	const formatDisplayNames: Record<ExportFormat, string> = {
		png: 'PNG (Lossless)',
		jpeg: 'JPEG (Lossy)',
		webp: 'WebP (Optimized)',
		svg: 'SVG (Vector)'
	};

	useEffect(() => {
		if (imageSrc) {
			renderPreview();
		}
		renderDummyEffect();
	}, [imageSrc, gridSize, PadSize, backgroundColor, useTransparentBg]);

	return (
		<div className="flex items-center justify-center w-full flex-col">
			<div className="sm:w-[50svw] w-[90svw] items-start justify-evenly flex flex-col">
				<div
					className={`border-4 ${isDragging ? 'border-blue-500 bg-[#1c1c1caa]' : 'border-dark bg-dark'} 
                  rounded-lg text-center sm:w-[50svw] w-[90svw] h-64 flex flex-col justify-center items-center transition-all duration-300 ease-in-out`}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					onDragLeave={handleDragLeave}
				>
					<Label htmlFor="picture" className="text-lg font-bold dark:text-gray-300 text-gray-700 mb-4">Drag & Drop Your Image Here</Label>
					<p className="text-sm text-gray-500 mb-4">or</p>
					<Input
						id="picture"
						type="file"
						accept="image/*"
						onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
						className="hidden"
					/>
					<Button
						variant="default"
						onClick={() => document.getElementById('picture')?.click()}
					>
						Click to Upload
					</Button>
				</div>
				<div className="w-full sm:flex sm:flex-row sm:justify-between">
					<div className="w-[350px]">
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
						<div className='m-3'>
							<div className="flex items-center mb-2">
								<Checkbox
									id="transparent-bg"
									checked={useTransparentBg}
									onCheckedChange={(checked) => setUseTransparentBg(checked === true)}
								/>
								<Label htmlFor="transparent-bg" className="ml-2 text-sm font-medium cursor-pointer">
									Use Transparent Background
								</Label>
							</div>
							{!useTransparentBg && (
								<div>
									<Label htmlFor="background-color" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
										Background Color: {backgroundColor}
									</Label>
									<Input
										id="background-color"
										type="color"
										value={backgroundColor}
										onChange={(e) => setBackgroundColor(e.target.value)}
										className="w-16 h-16 cursor-pointer"
									/>
								</div>
							)}
						</div>
					</div>

					<div className="w-[350px]">
						<div className='m-3'>
							<Label htmlFor="quality" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								JPEG/WebP Quality: {exportQuality}%
							</Label>
							<Slider
								id="quality"
								min={10}
								max={100}
								step={5}
								value={[exportQuality]}
								onValueChange={handleQualityChange}
								className="w-[250px]"
							/>
						</div>

						<div className="flex m-3 items-center justify-center flex-col">
							<div>
								Preview: 120px x 120px
							</div>
							<div className="border" style={{
								width: "120px",
								height: "120px",
								backgroundImage: useTransparentBg ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC45bDN+TgAAAEFJREFUOE9j+P//P0UYTNjY2PyHYmxADDYAGcQG0mwANoAMBNNh0DAgoI/cAFJBfwOIwUNpIEHRQPq9xHtpJDQw/38GAPeEFXGblvjfAAAAAElFTkSuQmCC")' : ''
							}}>
								<canvas ref={dummyCanvasRef} width="120" height="120" />
							</div>
						</div>
					</div>
				</div>
				<div className="m-3 flex items-center justify-center gap-4">
					<Button
						onClick={processImage}
						variant="default"
						disabled={isProcessing || !imageSrc}
					>
						{isProcessing ? 'Processing...' : 'Process Image'}
					</Button>
					<Button
						onClick={handleClear}
						variant="default"
					>
						Clear
					</Button>
				</div>
			</div>

			{isProcessing && (
				<div className="m-5 p-6 rounded-lg bg-primary-foreground dark:bg-secondary flex flex-col items-center justify-center">
					<div className="w-12 h-12 border-4 border-t-primary border-gray-200 rounded-full animate-spin mb-4"></div>
					<p className="text-lg">Processing your image...</p>
				</div>
			)}

			{Object.keys(processedImages).length > 0 && !isProcessing && (
				<div className='flex items-center justify-center m-5 flex-col'>
					<h2 className="text-xl font-bold">Processed Image:</h2>

					{/* Display format selector */}
					<div className="my-4">
						<Label htmlFor="display-format" className="mr-2">View Format:</Label>
						<Select value={displayFormat} onValueChange={(value) => setDisplayFormat(value as ExportFormat)}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Select format to view" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(formatDisplayNames)
									.filter(([format]) => processedImages[format as ExportFormat])
									.map(([format, name]) => (
										<SelectItem key={format} value={format}>{name}</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>

					{/* Download buttons for all formats */}
					<div className="flex flex-wrap gap-4 justify-center m-4">
						{Object.entries(processedImages).map(([format, url]) => (
							<a
								key={format}
								href={url}
								download={`processed-image.${format === 'jpeg' ? 'jpg' : format}`}
							>
								<Button variant="default">
									Download {formatDisplayNames[format as ExportFormat]}
								</Button>
							</a>
						))}
					</div>

					{/* Display the currently selected format */}
					{processedImages[displayFormat] && (
						<div className="border m-4 rounded-sm" style={{
							backgroundImage: useTransparentBg ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC45bDN+TgAAAEFJREFUOE9j+P//P0UYTNjY2PyHYmxADDYAGcQG0mwANoAMBNNh0DAgoI/cAFJBfwOIwUNpIEHRQPq9xHtpJDQw/38GAPeEFXGblvjfAAAAAElFTkSuQmCC")' : ''
						}}>
							{displayFormat === 'svg' ? (
								<object
									data={processedImages.svg}
									type="image/svg+xml"
									className="max-w-full"
									style={{
										width: originalImageSize?.width,
										height: originalImageSize?.height,
										maxWidth: '100%',
										maxHeight: "100%"
									}}
								>
									SVG image
								</object>
							) : (
								<img
									src={processedImages[displayFormat]}
									alt={`Processed (${displayFormat})`}
									className="max-w-full"
								/>
							)}
						</div>
					)}
				</div>
			)}

			{imageSrc && (
				<div className='flex items-center justify-center flex-col'>
					<h2 className="text-xl font-bold">Original Image Preview:</h2>
					<canvas ref={previewCanvasRef} className="border m-5 rounded-sm max-w-full" />
				</div>
			)}

			{/* Hidden canvas for full-resolution processing */}
			<canvas ref={processingCanvasRef} className="hidden" />
		</div>
	);
};

export default ImageProcessor;