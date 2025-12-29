import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Loader2, Image, FileText, Clipboard, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function PartsUploader({ projectId, onPartsExtracted, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedParts, setExtractedParts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Parts extraction schema
  const partsSchema = {
    type: "object",
    properties: {
      parts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Part name or description" },
            part_number: { type: "string", description: "Part/model number if visible" },
            quantity: { type: "number", description: "Quantity (default 1)" },
            unit_cost: { type: "number", description: "Price per unit if visible" },
            supplier: { type: "string", description: "Supplier/manufacturer if visible" }
          }
        }
      }
    }
  };

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await processFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [projectId]);

  const processFile = async (file) => {
    if (!file) return;

    setUploading(true);
    setShowPreview(true);

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // For images, use AI to identify parts
      if (file.type.startsWith('image/')) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this image and identify any parts, components, equipment, or materials visible. For each item found, extract:
- name: descriptive name of the part/item
- part_number: any visible model/part numbers
- quantity: count if multiple of same item (default 1)
- unit_cost: price if visible
- supplier: brand/manufacturer if visible

Be thorough - identify all visible items that could be parts for a project. Include hardware, cables, equipment, tools, materials, etc.`,
          file_urls: [file_url],
          response_json_schema: partsSchema
        });

        if (result?.parts?.length > 0) {
          setExtractedParts(result.parts);
        } else {
          setExtractedParts([]);
        }
      } else {
        // For PDFs/documents, use ExtractDataFromUploadedFile
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: partsSchema
        });

        if (result.status === 'success' && result.output?.parts) {
          setExtractedParts(result.output.parts);
        } else {
          setExtractedParts([]);
        }
      }
    } catch (err) {
      console.error('Failed to extract parts:', err);
      setExtractedParts([]);
    }

    setUploading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      processFile(file);
    }
  }, []);

  const handleConfirmParts = async () => {
    if (extractedParts.length === 0) return;

    setUploading(true);
    for (const part of extractedParts) {
      await base44.entities.Part.create({
        name: part.name,
        part_number: part.part_number || '',
        quantity: part.quantity || 1,
        unit_cost: part.unit_cost || 0,
        supplier: part.supplier || '',
        project_id: projectId,
        status: 'needed'
      });
    }
    onPartsExtracted?.();
    setShowPreview(false);
    setPreviewUrl(null);
    setExtractedParts([]);
    setUploading(false);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setPreviewUrl(null);
    setExtractedParts([]);
  };

  const removePartFromList = (index) => {
    setExtractedParts(prev => prev.filter((_, i) => i !== index));
  };

  // Compact button mode
  if (compact && !showPreview) {
    return (
      <>
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-all",
            dragOver 
              ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400" 
              : uploading 
                ? "bg-slate-100 text-slate-400" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : dragOver ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{dragOver ? 'Drop here!' : 'Scan Doc/Image'}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Or paste image (Ctrl+V)</p>
      </>
    );
  }

  // Preview/Extraction modal
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-900">AI Parts Extraction</h3>
            </div>
            <button onClick={handleCancel} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Preview Image */}
            {previewUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={previewUrl} alt="Uploaded" className="max-h-48 w-full object-contain" />
              </div>
            )}

            {uploading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
                <p className="text-slate-600">Analyzing image with AI...</p>
                <p className="text-sm text-slate-400">Identifying parts and materials</p>
              </div>
            ) : extractedParts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Found {extractedParts.length} part{extractedParts.length !== 1 ? 's' : ''}:
                </p>
                {extractedParts.map((part, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{part.name}</p>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                        {part.part_number && <span>#{part.part_number}</span>}
                        {part.quantity > 1 && <span>Qty: {part.quantity}</span>}
                        {part.unit_cost > 0 && <span>${part.unit_cost}</span>}
                        {part.supplier && <span>{part.supplier}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => removePartFromList(idx)}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Image className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>No parts detected in this image</p>
                <p className="text-sm">Try a clearer image or a document with part details</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button 
              onClick={handleConfirmParts} 
              disabled={extractedParts.length === 0 || uploading}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Add {extractedParts.length} Part{extractedParts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full drop zone mode
  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
        dragOver 
          ? "border-amber-400 bg-amber-50" 
          : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {uploading ? (
        <div className="py-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
          <p className="text-slate-600">Processing...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Image className="w-5 h-5 text-amber-600" />
            </div>
            <div className="p-2 rounded-lg bg-slate-100">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div className="p-2 rounded-lg bg-indigo-100">
              <Clipboard className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="font-medium text-slate-700 mb-1">
            {dragOver ? 'Drop to analyze!' : 'Drop image or PDF here'}
          </p>
          <p className="text-sm text-slate-500">
            Or click to upload • Paste image with Ctrl+V
          </p>
          <p className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI will identify parts automatically
          </p>
        </>
      )}
    </div>
  );
}