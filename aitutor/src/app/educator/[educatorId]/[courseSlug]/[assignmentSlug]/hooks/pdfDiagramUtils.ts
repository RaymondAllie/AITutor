import { MutableRefObject } from "react";

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get the correct canvas position and dimensons accounting for scaling and transformations
 */
export const getPdfCanvasInfo = (pdfContainer: HTMLDivElement) => {
  const canvas = pdfContainer.querySelector('canvas');
  
  if (!canvas) {
    throw new Error('Canvas element not found in PDF container');
  }
  
  // Get canvas and container dimensions
  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = pdfContainer.getBoundingClientRect();
  
  // Calculate offsets between container and canvas
  const canvasOffsetX = canvasRect.left - containerRect.left;
  const canvasOffsetY = canvasRect.top - containerRect.top;
  
  // Get scroll positions
  const scrollLeft = pdfContainer.scrollLeft;
  const scrollTop = pdfContainer.scrollTop;
  
  return {
    canvas,
    canvasRect,
    containerRect,
    canvasOffsetX,
    canvasOffsetY,
    scrollLeft,
    scrollTop,
    canvasScale: canvas.width / canvasRect.width
  };
};

/**
 * Calculate the correct crop coordinates based on selection and canvas position
 */
export const calculateCropCoordinates = (
  selection: Selection,
  pdfContainerRef: MutableRefObject<HTMLDivElement | null>
) => {
  if (!selection || !pdfContainerRef.current) {
    throw new Error('Selection or PDF container is missing');
  }
  
  const {
    canvas,
    canvasRect,
    containerRect,
    canvasOffsetX,
    canvasOffsetY,
    scrollLeft,
    scrollTop,
    canvasScale
  } = getPdfCanvasInfo(pdfContainerRef.current);
  
  // Calculate selection relative to the canvas with proper scaling
  const canvasRelativeX = selection.x - canvasOffsetX + scrollLeft;
  const canvasRelativeY = selection.y - canvasOffsetY + scrollTop;
  
  // Scale selection dimensions to match actual canvas resolution
  const scaledX = canvasRelativeX * canvasScale;
  const scaledY = canvasRelativeY * canvasScale;
  const scaledWidth = selection.width * canvasScale;
  const scaledHeight = selection.height * canvasScale;
  
  return {
    canvas,
    scaledX: Math.max(0, scaledX),
    scaledY: Math.max(0, scaledY),
    scaledWidth: Math.min(scaledWidth, canvas.width - scaledX),
    scaledHeight: Math.min(scaledHeight, canvas.height - scaledY),
    debug: {
      selection,
      canvasRelativeX,
      canvasRelativeY,
      canvasOffsetX,
      canvasOffsetY,
      scrollLeft,
      scrollTop,
      canvasScale,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      canvasRectWidth: canvasRect.width,
      canvasRectHeight: canvasRect.height
    }
  };
}; 