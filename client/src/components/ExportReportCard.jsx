// components/ExportReportCard.jsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import LogoDark from "../images/logo/logo-dark.png"; // Fixed path

const ExportReportCard = ({ activities, stats, persona }) => {
  const [exportType, setExportType] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [includeComponents, setIncludeComponents] = useState({
    userActivity: true,
    persona: true,
    priority: true,
    insights: true
  });
  const { user } = useSelector(state => state.auth);
  
  // Helper function to compress canvas images
  const compressImage = async (canvas, quality = 0.7) => {
    return new Promise((resolve) => {
      // Convert to JPEG with compression
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    });
  };
  
  // Helper function to capture and optimize components
  const captureComponent = async (element, options = {}) => {
    // Default options optimized for each component type
    const defaultOptions = {
      scale: 1,          // Reduced from 2 to 1
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: Math.min(element.scrollWidth, 1200),  // Limit width
      height: Math.min(element.scrollHeight, 1600), // Limit height
    };
    
    // Merge with component-specific options
    const finalOptions = { ...defaultOptions, ...options };
    
    const canvas = await html2canvas(element, finalOptions);
    return canvas;
  };
  
  // Function to export specific components as PDF
  const exportAsPDF = async () => {
    setIsExporting(true);
    
    try {
      // Create PDF document with compression enabled
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable PDF compression
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add Header with Taskify Logo
      await addHeaderWithLogo(pdf);
      
      // Add title
      pdf.setFontSize(22);
      pdf.setTextColor(44, 62, 80);
      pdf.text("Activity Dashboard Report", pageWidth / 2, 35, { align: 'center' });
      
      // Add user info
      pdf.setFontSize(14);
      pdf.text(`User: ${user?.fullName || user?.name || 'Current User'}`, 20, 45);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 52);
      
      let currentY = 60;
      
      // Helper function to add component with optimization
      const addComponentToPDF = async (elementId, title, componentType) => {
        const element = document.getElementById(elementId);
        
        if (!element) return currentY;
        
        try {
          // Check if we need a new page
          if (currentY > pageHeight - 60) {
            pdf.addPage();
            currentY = 20;
          }
          
          // Add component title
          pdf.setFontSize(16);
          pdf.setTextColor(41, 128, 185);
          pdf.text(title, 20, currentY);
          currentY += 10;
          
          // Component-specific capture options
          const captureOptions = {
            userActivity: { scale: 0.8, quality: 0.5 },   // Tables compress well
            persona: { scale: 1, quality: 0.7 },          // Medium quality for graphics
            priority: { scale: 1, quality: 0.6 },         // Charts need decent quality
            insights: { scale: 0.9, quality: 0.6 }        // Text-heavy, can be compressed
          };
          
          const options = captureOptions[componentType] || { scale: 1, quality: 0.6 };
          
          // Capture the component
          const canvas = await captureComponent(element, { scale: options.scale });
          
          // Compress the image
          const imgData = await compressImage(canvas, options.quality);
          
          // Calculate dimensions
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Check if image fits on current page
          if (currentY + imgHeight > pageHeight - 20) {
            pdf.addPage();
            currentY = 20;
          }
          
          // Add image to PDF
          pdf.addImage(imgData, 'JPEG', 20, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 15;
          
          // Add separator
          pdf.setDrawColor(200, 200, 200);
          pdf.line(20, currentY, pageWidth - 20, currentY);
          currentY += 10;
          
        } catch (error) {
          console.error(`Error capturing ${title}:`, error);
        }
        
        return currentY;
      };
      
      // Add User Activity Table
      if (includeComponents.userActivity) {
        currentY = await addComponentToPDF(
          'user-activity-table',
          'User Activity Table',
          'userActivity'
        );
      }
      
      // Add Technical Persona Section
      if (includeComponents.persona) {
        currentY = await addComponentToPDF(
          'persona-analyzer-card',
          'Technical Persona Analysis',
          'persona'
        );
      }
      
      // Add Task Priority Wizard
      if (includeComponents.priority) {
        currentY = await addComponentToPDF(
          'task-priority-wizard',
          'Task Priority Analysis',
          'priority'
        );
      }
      
      // Add AI Insights
      if (includeComponents.insights) {
        currentY = await addComponentToPDF(
          'ai-insights-card',
          'AI Activity Insights',
          'insights'
        );
      }
      
      // Add footer on each page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Footer
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `Generated with Taskify - ${new Date().toLocaleString()}`, 
          pageWidth / 2, 
          pageHeight - 10, 
          { align: 'center' }
        );
        
        // Page numbers
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }
      
      // Save the PDF with compression
      pdf.save(`Taskify_Activity_Report_${Date.now()}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("There was an error generating your PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };
  
  // Function to add header with Taskify logo (optimized)
  const addHeaderWithLogo = async (pdf) => {
    try {
      // Create an image element from the imported logo
      const img = new Image();
      img.src = LogoDark;
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Create a canvas to compress the logo
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set reasonable dimensions for logo
          canvas.width = 160;  // Reduced size
          canvas.height = 60;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert to compressed JPEG
          const compressedLogo = canvas.toDataURL('image/jpeg', 0.8);
          
          const pageWidth = pdf.internal.pageSize.getWidth();
          
          // Add the compressed logo to the PDF
          pdf.addImage(compressedLogo, 'JPEG', 20, 10, 40, 15);
          
          resolve();
        };
        img.onerror = reject;
        // Set a timeout in case the image doesn't load
        setTimeout(resolve, 3000);
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Add "Taskify" text next to logo
   
      
      return true;
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  };
  
  // Function to export as JSON
  const exportAsJSON = () => {
    setIsExporting(true);
    
    try {
      // Prepare data for export
      const exportData = {
        user: {
          id: user?._id,
          name: user?.fullName || user?.name,
          email: user?.email
        },
        timestamp: new Date().toISOString(),
        activities: activities || [],
        activityStats: stats || {},
        persona: persona || {},
        generatedBy: 'Taskify Activity Dashboard'
      };
      
      // Create blob and download link
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(dataBlob);
      
      // Create and trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `Taskify_Activity_Data_${Date.now()}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      alert("There was an error generating your JSON export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle export button click
  const handleExport = () => {
    if (exportType === 'pdf') {
      exportAsPDF();
    } else {
      exportAsJSON();
    }
  };
  
  // Toggle component inclusion
  const toggleComponent = (component) => {
    setIncludeComponents({
      ...includeComponents,
      [component]: !includeComponents[component]
    });
  };
  
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="py-6 px-4 md:px-6 xl:px-7.5 flex flex-wrap items-center justify-between border-b border-stroke dark:border-strokedark">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Export Activity Report
        </h4>
      </div>
      
      <div className="p-4 md:p-6 xl:p-7.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-gray-2 dark:bg-meta-4 rounded-lg p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h4 className="text-base font-medium text-black dark:text-white">
                    {exportType === 'pdf' ? 'Activity Report PDF' : 'Activity Data JSON'}
                  </h4>
                  <p className="text-sm text-bodydark mt-1">
                    {exportType === 'pdf' 
                      ? 'Complete visual report with selected components' 
                      : 'Raw activity data for further analysis'}
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-bodydark2 space-y-2 ml-11">
                <p>✓ User activity table</p>
                <p>✓ Technical persona analysis</p>
                <p>✓ Task priority visualization</p>
                <p>✓ AI-generated insights</p>
                <p>✓ Taskify branding</p>
              </div>
            </div>
            
            {exportType === 'pdf' && (
              <div className="mb-6">
                <h5 className="text-base font-medium text-black dark:text-white mb-3">
                  Include in Report:
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="include-userActivity"
                      checked={includeComponents.userActivity}
                      onChange={() => toggleComponent('userActivity')}
                      className="form-checkbox h-5 w-5 text-primary rounded border-stroke dark:border-strokedark"
                    />
                    <label htmlFor="include-userActivity" className="ml-2 text-sm text-bodydark">
                      User Activity Table
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="include-persona"
                      checked={includeComponents.persona}
                      onChange={() => toggleComponent('persona')}
                      className="form-checkbox h-5 w-5 text-primary rounded border-stroke dark:border-strokedark"
                    />
                    <label htmlFor="include-persona" className="ml-2 text-sm text-bodydark">
                      Technical Persona
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="include-priority"
                      checked={includeComponents.priority}
                      onChange={() => toggleComponent('priority')}
                      className="form-checkbox h-5 w-5 text-primary rounded border-stroke dark:border-strokedark"
                    />
                    <label htmlFor="include-priority" className="ml-2 text-sm text-bodydark">
                      Priority Analysis
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="include-insights"
                      checked={includeComponents.insights}
                      onChange={() => toggleComponent('insights')}
                      className="form-checkbox h-5 w-5 text-primary rounded border-stroke dark:border-strokedark"
                    />
                    <label htmlFor="include-insights" className="ml-2 text-sm text-bodydark">
                      AI Insights
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col justify-between">
            <div>
              <h5 className="text-base font-medium text-black dark:text-white mb-3">
                Export Format:
              </h5>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="format-pdf"
                    name="format"
                    value="pdf"
                    checked={exportType === 'pdf'}
                    onChange={() => setExportType('pdf')}
                    className="form-radio h-5 w-5 text-primary border-stroke dark:border-strokedark"
                  />
                  <label htmlFor="format-pdf" className="ml-2 text-sm text-bodydark">
                    PDF Report
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="format-json"
                    name="format"
                    value="json"
                    checked={exportType === 'json'}
                    onChange={() => setExportType('json')}
                    className="form-radio h-5 w-5 text-primary border-stroke dark:border-strokedark"
                  />
                  <label htmlFor="format-json" className="ml-2 text-sm text-bodydark">
                    JSON Data
                  </label>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="mt-6 flex items-center justify-center w-full py-3 px-4 rounded-lg bg-primary text-white font-medium transition hover:bg-opacity-90 disabled:bg-opacity-70"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {exportType === 'pdf' ? 'Download PDF Report' : 'Export JSON Data'}
                </>
              )}
            </button>
          </div>
        </div>
        
        <p className="mt-6 text-xs text-bodydark text-center">
          Note: Make sure all components are fully loaded before exporting. PDF size is optimized for quick sharing.
        </p>
      </div>
    </div>
  );
};

export default ExportReportCard;