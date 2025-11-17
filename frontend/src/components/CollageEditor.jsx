import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Upload, Download, RotateCw, Image as ImageIcon, FileText, Trash2, Plus, Grid3x3, Layout, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CollageEditor = () => {
  const [photos, setPhotos] = useState([]);
  const [letterheads, setLetterheads] = useState([]);
  const [selectedLetterhead, setSelectedLetterhead] = useState(null);
  const [layout, setLayout] = useState('2x2');
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const collageRef = useRef(null);
  const layoutChangeTimeout = useRef(null);

  // Fetch photos
  const fetchPhotos = async () => {
    try {
      const response = await axios.get(`${API}/photos`);
      setPhotos(response.data);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Gagal memuat foto');
    }
  };

  // Fetch letterheads
  const fetchLetterheads = async () => {
    try {
      const response = await axios.get(`${API}/letterheads`);
      setLetterheads(response.data);
    } catch (error) {
      console.error('Error fetching letterheads:', error);
    }
  };

  useEffect(() => {
    fetchPhotos();
    fetchLetterheads();
    initializeDefaultLetterheads();
  }, []);

  // Initialize default letterheads
  const initializeDefaultLetterheads = async () => {
    const defaultLetterheads = [
      { name: 'Corporate Blue', color: '#1e40af' },
      { name: 'Professional Green', color: '#059669' },
      { name: 'Modern Purple', color: '#7c3aed' },
    ];
    // This is a mock - in production, you'd have actual template images
  };

  // Handle photo upload
  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        await axios.post(`${API}/photos/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        toast.success(`${file.name} berhasil diupload`);
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error(`Gagal upload ${file.name}`);
      }
    }
    setUploading(false);
    fetchPhotos();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    multiple: true,
  });

  // Delete photo
  const deletePhoto = async (photoId) => {
    try {
      await axios.delete(`${API}/photos/${photoId}`);
      toast.success('Foto berhasil dihapus');
      fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Gagal menghapus foto');
    }
  };

  // Handle letterhead upload
  const handleLetterheadUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      await axios.post(`${API}/letterheads/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Kop surat berhasil diupload');
      fetchLetterheads();
    } catch (error) {
      console.error('Error uploading letterhead:', error);
      toast.error('Gagal upload kop surat');
    }
  };

  // Process image
  const processImage = async (operation, value) => {
    if (!selectedPhoto) return;

    try {
      const photoElement = document.querySelector(`[data-photo-id="${selectedPhoto.id}"]`);
      const canvas = await html2canvas(photoElement);
      const imageData = canvas.toDataURL('image/png');

      const response = await axios.post(`${API}/photos/process`, {
        image_data: imageData,
        operation,
        value,
      });

      // Update the photo in state with processed version
      toast.success('Foto berhasil diproses');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Gagal memproses foto');
    }
  };

  // Generate and download PDF
  const generatePDF = async () => {
    if (photos.length === 0) {
      toast.error('Tambahkan foto terlebih dahulu');
      return;
    }

    try {
      toast.info('Menghasilkan PDF...');
      
      const canvas = await html2canvas(collageRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`kolase-foto-${Date.now()}.pdf`);

      toast.success('PDF berhasil didownload!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal menghasilkan PDF');
    }
  };

  // Handle layout change with debounce to prevent ResizeObserver errors
  const handleLayoutChange = useCallback((newLayout) => {
    if (layoutChangeTimeout.current) {
      clearTimeout(layoutChangeTimeout.current);
    }
    
    layoutChangeTimeout.current = setTimeout(() => {
      setLayout(newLayout);
    }, 100);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (layoutChangeTimeout.current) {
        clearTimeout(layoutChangeTimeout.current);
      }
    };
  }, []);

  // Get grid layout - memoized to prevent unnecessary recalculations
  const getGridLayout = useMemo(() => {
    switch (layout) {
      case '2x2':
        return 'grid-cols-2 grid-rows-2';
      case '3x3':
        return 'grid-cols-3 grid-rows-3';
      case '4x4':
        return 'grid-cols-4 grid-rows-4';
      case 'mixed':
        return 'grid-cols-3 auto-rows-[200px]';
      default:
        return 'grid-cols-2 grid-rows-2';
    }
  }, [layout]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Photo Collage Studio
                </h1>
                <p className="text-sm text-gray-600">Buat kolase foto profesional dengan mudah</p>
              </div>
            </div>
            <Button
              data-testid="download-pdf-btn"
              onClick={generatePDF}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Section */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <Upload className="w-5 h-5 text-blue-600" />
                  Upload Foto
                </h2>
                <div
                  {...getRootProps()}
                  data-testid="dropzone"
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  {uploading ? (
                    <p className="text-gray-600">Uploading...</p>
                  ) : (
                    <>
                      <p className="text-gray-700 font-medium mb-1">
                        {isDragActive ? 'Drop foto di sini' : 'Drag & drop foto'}
                      </p>
                      <p className="text-sm text-gray-500">atau klik untuk pilih file</p>
                    </>
                  )}
                </div>

                {/* Photo List */}
                <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      data-testid={`photo-item-${photo.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={`${API}/photos/${photo.id}/file`}
                        alt={photo.original_filename}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{photo.original_filename}</p>
                        <p className="text-xs text-gray-500">{(photo.size / 1024).toFixed(2)} KB</p>
                      </div>
                      <Button
                        data-testid={`delete-photo-${photo.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePhoto(photo.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Layout Selection */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-visible">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <Grid3x3 className="w-5 h-5 text-purple-600" />
                  Template Layout
                </h2>
                <Select value={layout} onValueChange={handleLayoutChange}>
                  <SelectTrigger data-testid="layout-selector" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2x2">Grid 2x2 (4 Foto)</SelectItem>
                    <SelectItem value="3x3">Grid 3x3 (9 Foto)</SelectItem>
                    <SelectItem value="4x4">Grid 4x4 (16 Foto)</SelectItem>
                    <SelectItem value="mixed">Mixed Layout</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Letterhead Section */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm relative">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <FileText className="w-5 h-5 text-green-600" />
                  Kop Surat
                </h2>
                
                <div className="space-y-4">
                  {/* Upload Custom Letterhead */}
                  <div>
                    <label
                      htmlFor="letterhead-upload"
                      className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-gray-50 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-sm font-medium">Upload Kop Surat Custom</span>
                    </label>
                    <input
                      id="letterhead-upload"
                      data-testid="letterhead-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLetterheadUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Letterhead List */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Template Tersedia:</p>
                    {letterheads.length > 0 ? (
                      letterheads.map((letterhead) => (
                        <div
                          key={letterhead.id}
                          data-testid={`letterhead-item-${letterhead.id}`}
                          onClick={() => setSelectedLetterhead(letterhead)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedLetterhead?.id === letterhead.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-green-300'
                          }`}
                        >
                          <p className="text-sm font-medium">{letterhead.name}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Belum ada kop surat</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image Editing Tools */}
            {selectedPhoto && (
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <Sparkles className="w-5 h-5 text-pink-600" />
                    Edit Foto
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Rotasi</label>
                      <div className="flex gap-2">
                        <Button
                          data-testid="rotate-left-btn"
                          variant="outline"
                          size="sm"
                          onClick={() => processImage('rotate', -90)}
                        >
                          <RotateCw className="w-4 h-4 transform rotate-180" />
                        </Button>
                        <Button
                          data-testid="rotate-right-btn"
                          variant="outline"
                          size="sm"
                          onClick={() => processImage('rotate', 90)}
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Brightness</label>
                      <Slider
                        data-testid="brightness-slider"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[brightness]}
                        onValueChange={(val) => {
                          setBrightness(val[0]);
                          processImage('brightness', val[0]);
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Contrast</label>
                      <Slider
                        data-testid="contrast-slider"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[contrast]}
                        onValueChange={(val) => {
                          setContrast(val[0]);
                          processImage('contrast', val[0]);
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        data-testid="filter-grayscale-btn"
                        variant="outline"
                        size="sm"
                        onClick={() => processImage('grayscale')}
                      >
                        Grayscale
                      </Button>
                      <Button
                        data-testid="filter-sharpen-btn"
                        variant="outline"
                        size="sm"
                        onClick={() => processImage('sharpen')}
                      >
                        Sharpen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Side - Collage Preview */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                  Preview Kolase
                </h2>

                <div
                  ref={collageRef}
                  data-testid="collage-preview"
                  className="bg-white rounded-xl shadow-inner border-2 border-gray-100 overflow-hidden"
                  style={{ minHeight: '600px' }}
                >
                  {/* Letterhead */}
                  {selectedLetterhead && (
                    <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold">{selectedLetterhead.name}</h3>
                        <p className="text-sm opacity-90">Kop Surat Resmi Perusahaan</p>
                      </div>
                    </div>
                  )}

                  {/* Photo Grid */}
                  <div className={`grid ${getGridLayout()} gap-2 p-4`}>
                    {photos.slice(0, layout === '2x2' ? 4 : layout === '3x3' ? 9 : 16).map((photo, index) => (
                      <div
                        key={photo.id}
                        data-photo-id={photo.id}
                        data-testid={`collage-photo-${index}`}
                        className={`relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer group ${
                          layout === 'mixed' && index === 0 ? 'col-span-2 row-span-2' : ''
                        }`}
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img
                          src={`${API}/photos/${photo.id}/file`}
                          alt={photo.original_filename}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    ))}

                    {/* Empty slots */}
                    {photos.length < (layout === '2x2' ? 4 : layout === '3x3' ? 9 : 16) &&
                      Array.from({ length: (layout === '2x2' ? 4 : layout === '3x3' ? 9 : 16) - photos.length }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                        >
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollageEditor;