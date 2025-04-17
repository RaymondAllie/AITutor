'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Configure worker to use local file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  url: string;
  defaultPage?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, defaultPage = 1 }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([defaultPage]));
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const SCALE_STEP = 0.1;
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.5;

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!numPages) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '0');
          if (entry.isIntersecting && pageNumber) {
            setVisiblePages(prev => new Set([...prev, pageNumber]));
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '100px 0px', // Start loading pages 100px before they come into view
        threshold: 0.1
      }
    );

    // Observe all page placeholders
    document.querySelectorAll('[data-page-number]').forEach(pageElement => {
      observerRef.current?.observe(pageElement);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [numPages]);

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
        const newScale = Math.min(prevScale + SCALE_STEP, MAX_SCALE);
        updateZoomDisplay(newScale);
        return newScale;
      });
    };

    const handleZoomOut = () => {
      setScale(prevScale => {
        const newScale = Math.max(prevScale - SCALE_STEP, MIN_SCALE);
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

  // Scroll to default page when document loads
  useEffect(() => {
    if (loading || !defaultPage || defaultPage > numPages) return;

    const pageElement = document.querySelector(`[data-page-number="${defaultPage}"]`);
    if (pageElement && containerRef.current) {
      pageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [loading, defaultPage, numPages]);

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col pdf-container" data-pdf-viewer>
      <div className="h-[50vh] overflow-y-auto" ref={containerRef}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center h-full">
              Loading PDF...
            </div>
          }
          className="flex flex-col items-center p-4"
        >
          {Array.from(new Array(numPages), (_, index) => {
            const pageNumber = index + 1;
            return (
              <div 
                key={`page_${pageNumber}`} 
                className="mb-4 min-h-[200px]"
                data-page-number={pageNumber}
              >
                {visiblePages.has(pageNumber) ? (
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    width={Math.min(containerWidth - 48, 800)}
                    scale={scale}
                    rotate={rotation}
                    canvasBackground="transparent"
                    className="max-w-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[200px] bg-gray-100 rounded">
                    Page {pageNumber}
                  </div>
                )}
              </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer; 