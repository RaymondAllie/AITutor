import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scissors, Save, Image } from "lucide-react";
import { Document, Page } from 'react-pdf';
import { usePdfDiagram } from "../hooks/usePdfDiagram";
import { Problem } from "../../types"; // Adjust import path as needed
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface PdfDiagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProblemId: string | null;
  problems: Problem[];
  setProblems: React.Dispatch<React.SetStateAction<Problem[]>>;
  pdfUrl: string;
}

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error('Invalid data URL');
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
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
  } = usePdfDiagram();
  const { fetchWithAuth } = useAuth();

  const handleSaveDiagram = async (problemId: string, problems: Problem[], setProblems: React.Dispatch<React.SetStateAction<Problem[]>>) => {
    if (!croppedImage) return false;
    try {
      const blob = dataURLtoBlob(croppedImage);
      const formData = new FormData();
      formData.append('image', blob, `${problemId}.png`);
      formData.append('data', JSON.stringify({ id: problemId }));
      const response = await fetchWithAuth('/functions/v1/attach_images', {
        method: 'POST',
        body: formData,
      });
      if (!response.success) throw new Error(response.error || 'Failed to attach image');
      setProblems(prev => prev.map(p => {
        if (p.id === problemId && p.diagram) {
          return {
            ...p,
            diagram: {
              ...p.diagram,
              image_url: response.image_url
            }
          };
        }
        return p;
      }));
      toast.success('Diagram image attached successfully');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach diagram image');
      return false;
    }
  };

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
                  onClick={() => {
                    console.log("Cropping image selection");
                    handleCropImage();
                  }}
                  disabled={!selection}
                  className="w-full"
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  Crop Selection
                </Button>
                
                <Button
                  onClick={() => {
                    console.log("Saving diagram for problem ID:", currentProblemId);
                    handleSave();
                  }}
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