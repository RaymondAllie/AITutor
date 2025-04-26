import { useState, useRef } from "react";
import { toast } from "sonner";
import { calculateCropCoordinates, Selection } from "./pdfDiagramUtils";

export type { Selection };

export interface PdfDiagramHook {
  // States
  numPages: number;
  currentPage: number;
  scale: number;
  selection: Selection | null;
  isSelecting: boolean;
  startPoint: { x: number, y: number } | null;
  croppedImage: string | null;
  isSavingDiagram: boolean;
  pdfContainerRef: React.RefObject<HTMLDivElement>;
  
  // Methods
  handleDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void;
  handlePageChange: (newPage: number) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
  handleCropImage: () => Promise<void>;
  handleSaveDiagram: (currentProblemId: string, problems: any[], setProblems: any) => Promise<boolean>;
  setScale: (scale: number) => void;
  resetSelection: () => void;
}

export const usePdfDiagram = (): PdfDiagramHook => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isSavingDiagram, setIsSavingDiagram] = useState<boolean>(false);
  
  const pdfContainerRef = useRef<HTMLDivElement>(null!);
  
  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= numPages) {
      setCurrentPage(newPage);
      setSelection(null);
      setCroppedImage(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfContainerRef.current) return;
    
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPoint({ x, y });
    setIsSelecting(true);
    setSelection(null);
    setCroppedImage(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !startPoint || !pdfContainerRef.current) return;
    
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = x - startPoint.x;
    const height = y - startPoint.y;
    
    setSelection({
      x: width >= 0 ? startPoint.x : x,
      y: height >= 0 ? startPoint.y : y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCropImage = async () => {
    if (!selection || !pdfContainerRef.current) return;
    
    try {
      // Use the utility function to calculate the correct crop coordinates
      const {
        canvas,
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight,
        debug
      } = calculateCropCoordinates(selection, pdfContainerRef);
      
      // Log debug info
      console.log('Debug crop info:', debug);
      
      // Create a temporary canvas for the cropped image
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      
      if (!tempContext) return;
      
      // Set the dimensions of the temporary canvas to match the cropped area
      tempCanvas.width = scaledWidth;
      tempCanvas.height = scaledHeight;
      
      // Draw the cropped portion onto the temporary canvas
      tempContext.drawImage(
        canvas,
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight,
        0,
        0,
        scaledWidth,
        scaledHeight
      );
      
      // Convert to image data URL
      const dataUrl = tempCanvas.toDataURL('image/png');
      setCroppedImage(dataUrl);
      
    } catch (err) {
      console.error('Error cropping image:', err);
      toast.error('Failed to crop the selected area');
    }
  };

  const handleSaveDiagram = async (currentProblemId: string, problems: any[], setProblems: any) => {
    if (!croppedImage || !currentProblemId) return false;
    
    setIsSavingDiagram(true);
    
    try {
      // In a real implementation, this would be an edge function call
      // For now we'll mock the API call with a delay
      
      // Create the payload that would be sent to the edge function
      const payload = {
        problem_id: currentProblemId,
        page_number: currentPage,
        crop: {
          x: selection?.x || 0,
          y: selection?.y || 0,
          width: selection?.width || 0,
          height: selection?.height || 0,
          unit: 'px' as 'px' // Explicitly type as 'px'
        },
        image_data: croppedImage // In a real implementation, this might be a file upload
      };
      
      // Simulate network request
      console.log('Sending payload to mock edge function:', payload);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful response
      const mockResponse = {
        success: true,
        data: {
          id: currentProblemId,
          diagram_url: croppedImage // In a real implementation, this would be a URL to the stored image
        }
      };
      
      // Update local state to reflect the changes
      if (mockResponse.success) {
        setProblems(problems.map(problem => 
          problem.id === currentProblemId 
            ? { 
                ...problem, 
                diagram: {
                  pageNumber: currentPage,
                  crop: {
                    x: payload.crop.x,
                    y: payload.crop.y,
                    width: payload.crop.width,
                    height: payload.crop.height,
                    unit: payload.crop.unit
                  },
                  imageData: croppedImage
                }
              }
            : problem
        ));
        
        toast.success('Diagram saved successfully');
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error saving diagram:', err);
      toast.error(err.message || 'Failed to save diagram');
      return false;
    } finally {
      setIsSavingDiagram(false);
    }
  };

  const resetSelection = () => {
    setSelection(null);
    setCroppedImage(null);
  };

  return {
    numPages,
    currentPage,
    scale,
    selection,
    isSelecting,
    startPoint,
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
    resetSelection
  };
}; 