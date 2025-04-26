import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scissors, Save, Image } from "lucide-react";
import { Document, Page } from 'react-pdf';
import { usePdfDiagram } from "../hooks/usePdfDiagram";
import { Problem } from "../../types"; // Adjust import path as needed

interface PdfDiagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProblemId: string | null;
  problems: Problem[];
  setProblems: React.Dispatch<React.SetStateAction<Problem[]>>;
  pdfUrl: string;
}

const PdfDiagramDialog: React.FC<PdfDiagramDialogProps> = ({
  open,
  onOpenChange,
  currentProblemId,
  problems,
  setProblems,
  pdfUrl,
}) => {
  const {
    numPages,
    currentPage,
    scale,
    selection,
    croppedImage,
    isSavingDiagram,
    pdfContainerRef,
    handleDocumentLoadSuccess,
    handlePageChange,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleCropImage,
    handleSaveDiagram,
    setScale,
  } = usePdfDiagram();

  const handleSave = async () => {
    if (!currentProblemId) return;
    
    const success = await handleSaveDiagram(currentProblemId, problems, setProblems);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fullscreen-dialog fullscreen-dialog-content max-w-[100vw] max-h-[100vh] w-screen h-screen overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle>Select Diagram from PDF</DialogTitle>
          <DialogDescription>
            Navigate to the correct page, then click and drag to select the area to crop.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col h-[calc(100vh-150px)]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of {numPages}
              </span>
              <Button 
                variant="outline" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= numPages}
              >
                Next
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setScale(scale - 0.1)}
                disabled={scale <= 0.5}
              >
                Zoom Out
              </Button>
              <span>{Math.round(scale * 100)}%</span>
              <Button 
                variant="outline" 
                onClick={() => setScale(scale + 0.1)}
                disabled={scale >= 2.0}
              >
                Zoom In
              </Button>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div 
              className="flex-1 relative border rounded-md overflow-auto bg-gray-100 pdf-container"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              ref={pdfContainerRef}
              style={{ height: 'calc(100vh - 220px)', width: 'calc(100% - 330px)' }}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={handleDocumentLoadSuccess}
                loading={<div className="flex justify-center items-center h-full">Loading PDF...</div>}
                error={<div className="flex justify-center items-center h-full text-red-500">Failed to load PDF</div>}
              >
                <Page 
                  pageNumber={currentPage} 
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
              
              {selection && (
                <div 
                  className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                  style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: selection.height
                  }}
                ></div>
              )}
            </div>
            
            <div className="w-[300px] border rounded-md p-4 flex flex-col gap-4">
              <h3 className="text-lg font-medium">Preview</h3>
              
              {croppedImage ? (
                <div className="border rounded-md overflow-hidden bg-white p-2">
                  <img 
                    src={croppedImage} 
                    alt="Cropped diagram" 
                    className="w-full object-contain"
                    style={{ maxHeight: '250px' }}
                  />
                </div>
              ) : (
                <div className="border rounded-md flex items-center justify-center bg-gray-50 text-gray-400 h-[250px]">
                  <div className="text-center p-4">
                    <Image className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>Select an area to crop</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-2 mt-auto">
                <Button
                  variant="secondary"
                  onClick={handleCropImage}
                  disabled={!selection}
                  className="w-full"
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  Crop Selection
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={!croppedImage || isSavingDiagram}
                  className="w-full"
                >
                  {isSavingDiagram ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Diagram
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfDiagramDialog; 