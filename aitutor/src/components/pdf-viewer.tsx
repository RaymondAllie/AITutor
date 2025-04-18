'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface PDFTab {
  id: string;
  url: string;
  title: string;
  defaultPage?: number;
}

interface PDFViewerProps {
  tabs: PDFTab[];
  onCloseTab?: (tabId: string) => void;
  refreshKey?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  tabs,
  onCloseTab,
  refreshKey = 0,
}) => {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '');
  const [pdfStates, setPdfStates] = useState<Record<string, {
    numPages: number;
    pageNumber: number;
    error: string | null;
    loading: boolean;
    scale: number;
    rotation: number;
  }>>({});
  const [containerWidth, setContainerWidth] = useState(800);

  // Initialize PDF states for new tabs
  useEffect(() => {
    const newPdfStates = { ...pdfStates };
    tabs.forEach(tab => {
      if (!newPdfStates[tab.id]) {
        newPdfStates[tab.id] = {
          numPages: 0,
          pageNumber: tab.defaultPage || 1,
          error: null,
          loading: true,
          scale: 1,
          rotation: 0,
        };
      }
    });
    setPdfStates(newPdfStates);
    
    // Set active tab if none is selected
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs]);

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
      setPdfStates(prev => {
        if (!activeTab) return prev;
        const newScale = Math.min(prev[activeTab].scale + 0.1, 2.5);
        updateZoomDisplay(newScale);
        return {
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            scale: newScale,
          },
        };
      });
    };

    const handleZoomOut = () => {
      setPdfStates(prev => {
        if (!activeTab) return prev;
        const newScale = Math.max(prev[activeTab].scale - 0.1, 0.5);
        updateZoomDisplay(newScale);
        return {
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            scale: newScale,
          },
        };
      });
    };

    const handleRotate = () => {
      setPdfStates(prev => {
        if (!activeTab) return prev;
        return {
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            rotation: (prev[activeTab].rotation + 90) % 360,
          },
        };
      });
    };

    viewer.addEventListener('zoomIn', handleZoomIn);
    viewer.addEventListener('zoomOut', handleZoomOut);
    viewer.addEventListener('rotate', handleRotate);

    return () => {
      viewer.removeEventListener('zoomIn', handleZoomIn);
      viewer.removeEventListener('zoomOut', handleZoomOut);
      viewer.removeEventListener('rotate', handleRotate);
    };
  }, [activeTab]);

  // Reset state when refreshKey changes
  useEffect(() => {
    // Set active tab to first tab on refresh
    if (tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }

    // Reset PDF state for the newly selected tab
    setPdfStates(prev => ({
      ...prev,
      [tabs[0]?.id]: {
        ...prev[tabs[0]?.id],
        pageNumber: tabs[0]?.defaultPage || 1,
        scale: 1,
        rotation: 0,
        loading: true,
      },
    }));
    updateZoomDisplay(1);
  }, [refreshKey]);

  function updateZoomDisplay(newScale: number) {
    const display = document.querySelector('[data-pdf-zoom-display]');
    if (display) {
      display.textContent = `${Math.round(newScale * 100)}%`;
    }
  }

  function onDocumentLoadSuccess(tabId: string, { numPages }: { numPages: number }): void {
    setPdfStates(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        numPages,
        error: null,
        loading: false,
      },
    }));
  }

  function onDocumentLoadError(tabId: string, error: Error): void {
    console.error('Error loading PDF:', error);
    setPdfStates(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        error: 'Failed to load PDF. Please check if the URL is correct and accessible.',
        loading: false,
      },
    }));
  }

  function changePage(tabId: string, offset: number) {
    setPdfStates(prev => {
      const currentState = prev[tabId];
      const newPage = currentState.pageNumber + offset;
      return {
        ...prev,
        [tabId]: {
          ...currentState,
          pageNumber: Math.max(1, Math.min(newPage, currentState.numPages)),
        },
      };
    });
  }

  return (
    <div className="flex flex-col h-full pdf-container" data-pdf-viewer>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 [&>div:first-child]:mt-0">
        <TabsList className="flex h-auto overflow-x-auto border-b rounded-none">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 min-w-fit data-[state=active]:bg-white rounded-none"
            >
              <span className="truncate max-w-[150px]">{tab.title}</span>
              {onCloseTab && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </div>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-h-0">
          {tabs.map(tab => {
            const pdfState = pdfStates[tab.id];
            if (!pdfState) return null;

            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="h-full data-[state=inactive]:hidden"
              >
                {pdfState.error ? (
                  <div className="flex items-center justify-center h-full text-red-500">
                    {pdfState.error}
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-auto bg-white min-h-0">
                      <div className="w-fit mx-auto">
                        <Document
                          key={`${tab.id}-${refreshKey}`}
                          file={tab.url}
                          onLoadSuccess={(result) => onDocumentLoadSuccess(tab.id, result)}
                          onLoadError={(error) => onDocumentLoadError(tab.id, error)}
                          loading={
                            <div className="flex items-center justify-center h-full">
                              Loading PDF...
                            </div>
                          }
                          className="py-4"
                        >
                          {!pdfState.loading && (
                            <Page
                              pageNumber={pdfState.pageNumber}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              width={Math.min(containerWidth - 48, 800)}
                              scale={pdfState.scale}
                              rotate={pdfState.rotation}
                              canvasBackground="white"
                              className="shadow-lg"
                            />
                          )}
                        </Document>
                      </div>
                    </div>

                    {/* Navigation controls */}
                    {pdfState.numPages > 0 && (
                      <div className="flex items-center gap-4 justify-center border-t p-4 bg-white">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(tab.id, -1)}
                          disabled={pdfState.pageNumber <= 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <p className="text-sm">
                          Page {pdfState.pageNumber} of {pdfState.numPages}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(tab.id, 1)}
                          disabled={pdfState.pageNumber >= pdfState.numPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
};

export default PDFViewer;