'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

// Configure pdf.js

interface PDFViewerProps {
  url: string | null;
  defaultPage?: number;
  refreshKey?: number;
  clear?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  url, 
  defaultPage = 1, 
  refreshKey = 0,
  clear = false 
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(defaultPage);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      const container = document.querySelector('.pdf-container');
      if (container) {
        setContainerWidth(container.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Handle zoom and rotate events from header controls
  useEffect(() => {
    const viewer = document.querySelector('[data-pdf-viewer]');
    if (!viewer) return;

    const handleZoomIn = () => {
      setScale(prevScale => {
        const newScale = Math.min(prevScale + 0.1, 2.5);
        updateZoomDisplay(newScale);
        return newScale;
      });
    };

    const handleZoomOut = () => {
      setScale(prevScale => {
        const newScale = Math.max(prevScale - 0.1, 0.5);
        updateZoomDisplay(newScale);
        return newScale;
      });
    };

    const handleRotate = () => {
      setRotation(prevRotation => (prevRotation + 90) % 360);
    };

    viewer.addEventListener('zoomIn', handleZoomIn);
    viewer.addEventListener('zoomOut', handleZoomOut);
    viewer.addEventListener('rotate', handleRotate);

    return () => {
      viewer.removeEventListener('zoomIn', handleZoomIn);
      viewer.removeEventListener('zoomOut', handleZoomOut);
      viewer.removeEventListener('rotate', handleRotate);
    };
  }, []);

  // Reset state when refreshKey changes
  useEffect(() => {
    setPageNumber(defaultPage);
    setScale(1);
    setRotation(0);
    setLoading(true);
    updateZoomDisplay(1);
  }, [refreshKey, defaultPage]);

  function updateZoomDisplay(newScale: number) {
    const display = document.querySelector('[data-pdf-zoom-display]');
    if (display) {
      display.textContent = `${Math.round(newScale * 100)}%`;
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setError(null);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error): void {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please check if the URL is correct and accessible.');
    setLoading(false);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.max(1, Math.min(newPage, numPages));
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col pdf-container" data-pdf-viewer>
      <div className="h-[50vh] flex flex-col">
        {!clear && url ? (
          <div className="flex-1 overflow-auto bg-white">
            <div className="w-fit mx-auto">
              <Document
                key={refreshKey}
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-full">
                    Loading PDF...
                  </div>
                }
                className="py-4"
              >
                {!loading && (
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    width={Math.min(containerWidth - 48, 800)}
                    scale={scale}
                    rotate={rotation}
                    canvasBackground="white"
                    className="shadow-lg"
                  />
                )}
              </Document>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No PDF loaded
          </div>
        )}

        {/* Navigation controls */}
        {numPages > 0 && !clear && (
          <div className="flex items-center gap-4 justify-center border-t p-4 bg-white">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <p className="text-sm">
              Page {pageNumber} of {numPages}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer; 