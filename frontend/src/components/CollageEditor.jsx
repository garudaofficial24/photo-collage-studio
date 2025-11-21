import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Upload, Download, RotateCw, Image as ImageIcon, FileText, Trash2, Plus, Grid3x3, Layout, Sparkles, Building2, Quote, Camera, Sliders, Settings, ChevronRight, Check, Eye, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './ui/dialog';
import { Slider } from './ui/slider';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CollageEditor = () => {
  const [photos, setPhotos] = useState([]);
  const [layout, setLayout] = useState('2x2');
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const collageRef = useRef(null);
  const pdfCollageRef = useRef(null); // Hidden ref for PDF generation
  const layoutChangeTimeout = useRef(null);
  
  // Paper orientation state
  const [paperOrientation, setPaperOrientation] = useState('portrait');
  
  // Image fit/fill state
  const [imageObjectFit, setImageObjectFit] = useState('cover'); // 'cover' (fill) or 'contain' (fit)
  
  // Company header state
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyMotto, setCompanyMotto] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);

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

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Handle company logo upload
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    setCompanyLogo(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      toast.success('Logo berhasil diupload');
    };
    reader.readAsDataURL(file);
  };

  // Clear company header
  const clearCompanyHeader = () => {
    setCompanyLogo(null);
    setCompanyName('');
    setCompanyMotto('');
    setLogoPreview(null);
    toast.info('Header perusahaan dihapus');
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
      
      // Use hidden ref for PDF generation
      const targetRef = pdfCollageRef.current || collageRef.current;
      
      if (!targetRef) {
        toast.error('Gagal menghasilkan PDF. Pastikan semua foto sudah dimuat.');
        return;
      }
      
      const canvas = await html2canvas(targetRef, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        imageTimeout: 15000,
        width: targetRef.offsetWidth,
        height: targetRef.offsetHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const isPortrait = paperOrientation === 'portrait';
      const pageWidth = isPortrait ? 210 : 297;
      const pageHeight = isPortrait ? 297 : 210;
      
      const canvasRatio = canvas.width / canvas.height;
      const pageRatio = pageWidth / pageHeight;
      
      let imgWidth, imgHeight;
      
      if (canvasRatio > pageRatio) {
        imgWidth = pageWidth;
        imgHeight = pageWidth / canvasRatio;
      } else {
        imgHeight = pageHeight;
        imgWidth = pageHeight * canvasRatio;
      }
      
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;
      
      const pdf = new jsPDF({
        orientation: paperOrientation,
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');

      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = companyName 
        ? `${companyName.replace(/\s+/g, '-')}-${timestamp}.pdf`
        : `kolase-foto-${timestamp}.pdf`;

      pdf.save(fileName);
      toast.success('PDF berhasil didownload!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal menghasilkan PDF. Pastikan semua foto sudah dimuat.');
    }
  };

  // Handle layout change with debounce
  const handleLayoutChange = useCallback((newLayout) => {
    if (layoutChangeTimeout.current) {
      clearTimeout(layoutChangeTimeout.current);
    }
    
    layoutChangeTimeout.current = setTimeout(() => {
      setLayout(newLayout);
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (layoutChangeTimeout.current) {
        clearTimeout(layoutChangeTimeout.current);
      }
    };
  }, []);

  // Get grid layout
  const getGridLayout = useMemo(() => {
    switch (layout) {
      case '2x2': return 'grid-cols-2';
      case '3x3': return 'grid-cols-3';
      case '4x4': return 'grid-cols-4';
      case '2x3': return 'grid-cols-2';
      case '3x2': return 'grid-cols-3';
      case '1-large-landscape': return 'grid-cols-2';
      case '1-large-portrait': return 'grid-cols-2';
      case '4-small-1-large': return 'grid-cols-4';
      case 'portrait': return 'grid-cols-2';
      case 'landscape': return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  }, [layout]);

  // Get photo count
  const getPhotoCount = useMemo(() => {
    switch (layout) {
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      case '2x3': return 6;
      case '3x2': return 6;
      case '1-large-landscape': return 3;
      case '1-large-portrait': return 3;
      case '4-small-1-large': return 5;
      case 'portrait': return 8;
      case 'landscape': return 8;
      default: return 4;
    }
  }, [layout]);

  // Get grid rows count
  const getGridRows = useMemo(() => {
    switch (layout) {
      case '2x2': return 2;
      case '3x3': return 3;
      case '4x4': return 4;
      case '2x3': return 3;
      case '3x2': return 2;
      case '1-large-landscape': return 2;
      case '1-large-portrait': return 2;
      case '4-small-1-large': return 2;
      case 'portrait': return 4;
      case 'landscape': return 2;
      default: return 2;
    }
  }, [layout]);

  const layoutTemplates = [
    { id: '2x2', name: '2×2', count: 4, icon: '▦' },
    { id: '3x3', name: '3×3', count: 9, icon: '▦' },
    { id: '4x4', name: '4×4', count: 16, icon: '▦' },
    { id: '2x3', name: '2×3', count: 6, icon: '▭' },
    { id: '3x2', name: '3×2', count: 6, icon: '▬' },
    { id: 'portrait', name: 'Portrait', count: 8, icon: '▯' },
    { id: 'landscape', name: 'Landscape', count: 8, icon: '▭' },
    { id: '1-large-landscape', name: '1+2 (H)', count: 3, icon: '◧' },
    { id: '1-large-portrait', name: '1+2 (V)', count: 3, icon: '◨' },
    { id: '4-small-1-large', name: '4+1', count: 5, icon: '◪' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Photo Collage Studio
                </h1>
                <p className="text-xs text-gray-500">Professional Photo Layout Designer</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-indigo-700">{photos.length} Foto</span>
              </div>
              <Button
                data-testid="download-pdf-btn"
                onClick={generatePDF}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl"
                size="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-4 space-y-4">
            {/* Tabs for better organization */}
            <Tabs defaultValue="photos" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm">
                <TabsTrigger value="photos" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
                  <Camera className="w-4 h-4 mr-2" />
                  Foto
                </TabsTrigger>
                <TabsTrigger value="layout" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
                  <Layout className="w-4 h-4 mr-2" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="branding" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
                  <Building2 className="w-4 h-4 mr-2" />
                  Brand
                </TabsTrigger>
              </TabsList>

              {/* Photos Tab */}
              <TabsContent value="photos" className="space-y-4 mt-4">
                {/* Upload Section */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        Upload Foto
                      </h3>
                      <span className="text-xs text-gray-500">{photos.length}/20</span>
                    </div>
                    <div
                      {...getRootProps()}
                      data-testid="dropzone"
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                        isDragActive
                          ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        {uploading ? (
                          <div className="space-y-2">
                            <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                            </div>
                            <p className="text-sm text-gray-600">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-700">
                              {isDragActive ? 'Drop foto di sini' : 'Drag & drop foto'}
                            </p>
                            <p className="text-xs text-gray-500">atau klik untuk pilih file</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG, WEBP</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Photo List */}
                    <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                      {photos.map((photo) => (
                        <div
                          key={photo.id}
                          data-testid={`photo-item-${photo.id}`}
                          className="group flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-all cursor-pointer border border-transparent hover:border-indigo-200"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={`${API}/photos/${photo.id}/file`}
                              alt={photo.original_filename}
                              className="w-14 h-14 object-cover rounded-lg shadow-sm"
                            />
                            {selectedPhoto?.id === photo.id && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{photo.original_filename}</p>
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
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Image Editing Tools */}
                {selectedPhoto && (
                  <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-5">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Edit Foto
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Rotasi</label>
                          <div className="flex gap-2">
                            <Button
                              data-testid="rotate-left-btn"
                              variant="outline"
                              size="sm"
                              onClick={() => processImage('rotate', -90)}
                              className="flex-1 hover:bg-indigo-50 hover:border-indigo-300"
                            >
                              <RotateCw className="w-4 h-4 transform rotate-180 mr-2" />
                              Kiri
                            </Button>
                            <Button
                              data-testid="rotate-right-btn"
                              variant="outline"
                              size="sm"
                              onClick={() => processImage('rotate', 90)}
                              className="flex-1 hover:bg-indigo-50 hover:border-indigo-300"
                            >
                              <RotateCw className="w-4 h-4 mr-2" />
                              Kanan
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-3 block">Brightness</label>
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
                            className="[&_[role=slider]]:bg-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-3 block">Contrast</label>
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
                            className="[&_[role=slider]]:bg-indigo-600"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            data-testid="filter-grayscale-btn"
                            variant="outline"
                            size="sm"
                            onClick={() => processImage('grayscale')}
                            className="hover:bg-gray-100"
                          >
                            Grayscale
                          </Button>
                          <Button
                            data-testid="filter-sharpen-btn"
                            variant="outline"
                            size="sm"
                            onClick={() => processImage('sharpen')}
                            className="hover:bg-gray-100"
                          >
                            Sharpen
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-4 mt-4">
                {/* Layout Templates */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4 text-indigo-600" />
                      Template Layout
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {layoutTemplates.map((template) => (
                        <button
                          key={template.id}
                          data-testid={`layout-${template.id}`}
                          onClick={() => handleLayoutChange(template.id)}
                          className={`group relative p-4 rounded-xl border-2 transition-all text-left ${
                            layout === template.id
                              ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md'
                              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{template.icon}</span>
                            {layout === template.id && (
                              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{template.name}</div>
                          <div className="text-xs text-gray-500">{template.count} Foto</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Paper Orientation */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-600" />
                      Orientasi Kertas
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        data-testid="paper-portrait"
                        onClick={() => setPaperOrientation('portrait')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          paperOrientation === 'portrait'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`w-12 h-16 rounded border-2 transition-colors ${
                            paperOrientation === 'portrait' ? 'border-orange-500' : 'border-gray-300'
                          }`}></div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">Portrait</div>
                            <div className="text-xs text-gray-500">A4 Vertikal</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        data-testid="paper-landscape"
                        onClick={() => setPaperOrientation('landscape')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          paperOrientation === 'landscape'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`w-16 h-12 rounded border-2 transition-colors ${
                            paperOrientation === 'landscape' ? 'border-orange-500' : 'border-gray-300'
                          }`}></div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">Landscape</div>
                            <div className="text-xs text-gray-500">A4 Horizontal</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Image Fit/Fill Control */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Mode Tampilan Foto
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        data-testid="image-fill"
                        onClick={() => setImageObjectFit('cover')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          imageObjectFit === 'cover'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`w-16 h-12 rounded border-2 overflow-hidden transition-colors ${
                            imageObjectFit === 'cover' ? 'border-blue-500' : 'border-gray-300'
                          }`}>
                            <div className="w-full h-full bg-gradient-to-br from-blue-200 to-blue-300"></div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">Fill</div>
                            <div className="text-xs text-gray-500">Penuh, crop jika perlu</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        data-testid="image-fit"
                        onClick={() => setImageObjectFit('contain')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          imageObjectFit === 'contain'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`w-16 h-12 rounded border-2 flex items-center justify-center transition-colors ${
                            imageObjectFit === 'contain' ? 'border-blue-500' : 'border-gray-300'
                          }`}>
                            <div className="w-8 h-10 bg-gradient-to-br from-blue-200 to-blue-300 rounded"></div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">Fit</div>
                            <div className="text-xs text-gray-500">Tampil semua, no crop</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-4 mt-4">
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      Company Branding
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Company Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Nama Perusahaan
                        </label>
                        <input
                          type="text"
                          data-testid="company-name-input"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Masukkan nama perusahaan..."
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                        />
                      </div>

                      {/* Company Motto */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Motto Perusahaan
                        </label>
                        <input
                          type="text"
                          data-testid="company-motto-input"
                          value={companyMotto}
                          onChange={(e) => setCompanyMotto(e.target.value)}
                          placeholder="Masukkan motto perusahaan..."
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                        />
                      </div>

                      {/* Logo Upload */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Logo Perusahaan
                        </label>
                        <label
                          htmlFor="logo-upload"
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                        >
                          <Upload className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {companyLogo ? 'Ganti Logo' : 'Upload Logo'}
                          </span>
                        </label>
                        <input
                          id="logo-upload"
                          data-testid="logo-upload-input"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">Max 2MB • PNG, JPG, SVG</p>
                      </div>

                      {/* Preview */}
                      {(logoPreview || companyName || companyMotto) && (
                        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                          <div className="flex items-start gap-3">
                            {logoPreview && (
                              <img
                                src={logoPreview}
                                alt="Logo Preview"
                                className="w-12 h-12 object-contain rounded-lg bg-white p-1"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              {companyName && (
                                <p className="font-semibold text-gray-900 text-sm">{companyName}</p>
                              )}
                              {companyMotto && (
                                <p className="text-xs text-gray-600 italic mt-1">"{companyMotto}"</p>
                              )}
                            </div>
                            <button
                              data-testid="clear-company-header"
                              onClick={clearCompanyHeader}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Side - Quick Actions */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Preview Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.02] group">
                    <CardContent className="p-8 text-center">
                      <Eye className="w-12 h-12 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xl font-bold mb-2">Preview Kolase</h3>
                      <p className="text-sm text-indigo-100">Lihat hasil kolase dalam ukuran penuh</p>
                      <div className="mt-4 flex items-center justify-center gap-2 text-xs bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                        <FileText className="w-3 h-3" />
                        {paperOrientation === 'portrait' ? 'A4 Portrait' : 'A4 Landscape'}
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-6xl w-full h-[90vh] p-0 bg-gray-900">
                  <div className="relative h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold">Preview Kolase</h3>
                          <p className="text-xs text-gray-400">
                            {paperOrientation === 'portrait' ? 'A4 Portrait (210x297mm)' : 'A4 Landscape (297x210mm)'}
                          </p>
                        </div>
                      </div>
                      <DialogClose asChild>
                        <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                          <X className="w-5 h-5" />
                        </Button>
                      </DialogClose>
                    </div>
                    
                    {/* Preview Content */}
                    <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div
                    ref={collageRef}
                    data-testid="collage-preview"
                    className={`bg-white shadow-2xl overflow-hidden transition-all ${
                      paperOrientation === 'landscape' ? 'w-full max-w-5xl' : 'w-full max-w-3xl'
                    }`}
                    style={{ 
                      aspectRatio: paperOrientation === 'portrait' ? '210/297' : '297/210',
                      padding: '0'
                    }}
                  >
                    {/* Company Header */}
                    {(logoPreview || companyName || companyMotto) && (
                      <div className="h-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center px-6">
                        <div className="flex items-center gap-4 text-white">
                          {logoPreview && (
                            <img
                              src={logoPreview}
                              alt="Company Logo"
                              className="w-14 h-14 object-contain bg-white/20 backdrop-blur-sm rounded-lg p-2"
                            />
                          )}
                          {companyName && (
                            <div>
                              <h3 className="text-xl font-bold tracking-wide">{companyName}</h3>
                              {companyMotto ? (
                                <p className="text-xs opacity-90 italic">"{companyMotto}"</p>
                              ) : (
                                <p className="text-xs opacity-90">Dokumentasi Foto Resmi</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Photo Grid */}
                    <div 
                      className={`grid ${getGridLayout} w-full ${
                        (logoPreview || companyName || companyMotto) ? 'h-[calc(100%-5rem)]' : 'h-full'
                      } ${
                        layout === '4-small-1-large' ? 'gap-2 p-3' : 
                        layout === '4x4' ? 'gap-1 p-2' : 
                        layout === '3x3' ? 'gap-1.5 p-2' : 
                        'gap-2 p-3'
                      }`}
                      style={{
                        gridTemplateRows: `repeat(${getGridRows}, 1fr)`
                      }}
                    >
                      {photos.slice(0, getPhotoCount).map((photo, index) => (
                        <div
                          key={photo.id}
                          data-photo-id={photo.id}
                          data-testid={`collage-photo-${index}`}
                          style={{
                            order: layout === '4-small-1-large' && index === 4 ? -1 : index
                          }}
                          className={`relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer group ${
                            (layout === '1-large-landscape' && index === 0) ? 'row-span-2' : ''
                          } ${
                            (layout === '1-large-portrait' && index === 0) ? 'col-span-2' : ''
                          } ${
                            (layout === '4-small-1-large' && index === 4) ? 'col-span-2 row-span-2' : ''
                          } ${
                            // Apply aspect-square only to non-large photos
                            (layout !== '4-small-1-large' && 
                             !(layout === '1-large-landscape' && index === 0) && 
                             !(layout === '1-large-portrait' && index === 0)) ? 'aspect-square' : ''
                          }`}
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img
                            src={`${API}/photos/${photo.id}/file`}
                            alt={photo.original_filename}
                            className={`w-full h-full group-hover:scale-110 transition-transform duration-300 ${
                              imageObjectFit === 'cover' ? 'object-cover' : 'object-contain bg-gray-50'
                            }`}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                              <span className="text-xs font-bold text-indigo-600">{index + 1}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Empty slots */}
                      {photos.length < getPhotoCount &&
                        Array.from({ length: getPhotoCount - photos.length }).map((_, i) => {
                          const slotIndex = photos.length + i;
                          return (
                            <div
                              key={`empty-${i}`}
                              style={{
                                order: layout === '4-small-1-large' && slotIndex === 4 ? -1 : slotIndex
                              }}
                              className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 transition-all hover:border-indigo-400 hover:from-indigo-50 hover:to-purple-50 ${
                                (layout === '1-large-landscape' && photos.length === 0 && i === 0) ? 'row-span-2' : ''
                              } ${
                                (layout === '1-large-portrait' && photos.length === 0 && i === 0) ? 'col-span-2' : ''
                              } ${
                                (layout === '4-small-1-large' && slotIndex === 4) ? 'col-span-2 row-span-2' : ''
                              } ${
                                // Apply aspect-square only to non-large slots
                                (layout !== '4-small-1-large' && 
                                 !(layout === '1-large-landscape' && photos.length === 0 && i === 0) && 
                                 !(layout === '1-large-portrait' && photos.length === 0 && i === 0)) ? 'aspect-square' : ''
                              }`}
                            >
                              <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                              <span className="text-xs text-gray-400 font-medium">{slotIndex + 1}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Download Button */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.02] group">
                <CardContent className="p-8 text-center">
                  <Download className="w-12 h-12 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-2">Download PDF</h3>
                  <p className="text-sm text-emerald-100">Simpan kolase sebagai file PDF</p>
                  <Button
                    onClick={generatePDF}
                    className="mt-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-all"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Sekarang
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Camera className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{photos.length}</p>
                      <p className="text-xs text-gray-500">Foto Diupload</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Layout className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{layoutTemplates.find(t => t.id === layout)?.name}</p>
                      <p className="text-xs text-gray-500">Template Layout</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{paperOrientation === 'portrait' ? 'Portrait' : 'Landscape'}</p>
                      <p className="text-xs text-gray-500">Orientasi Kertas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Collage for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <div
          ref={pdfCollageRef}
          className={`bg-white overflow-hidden`}
          style={{ 
            width: paperOrientation === 'portrait' ? '210mm' : '297mm',
            height: paperOrientation === 'portrait' ? '297mm' : '210mm',
            aspectRatio: paperOrientation === 'portrait' ? '210/297' : '297/210',
            padding: '0'
          }}
        >
          {/* Company Header */}
          {(logoPreview || companyName || companyMotto) && (
            <div className="h-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center px-6">
              <div className="flex items-center gap-4 text-white">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="w-14 h-14 object-contain bg-white/20 backdrop-blur-sm rounded-lg p-2"
                  />
                )}
                {companyName && (
                  <div>
                    <h3 className="text-xl font-bold tracking-wide">{companyName}</h3>
                    {companyMotto ? (
                      <p className="text-xs opacity-90 italic">"{companyMotto}"</p>
                    ) : (
                      <p className="text-xs opacity-90">Dokumentasi Foto Resmi</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photo Grid */}
          <div 
            className={`grid ${getGridLayout} w-full ${
              (logoPreview || companyName || companyMotto) ? 'h-[calc(100%-5rem)]' : 'h-full'
            } ${
              layout === '4-small-1-large' ? 'gap-2 p-3' : 
              layout === '4x4' ? 'gap-1 p-2' : 
              layout === '3x3' ? 'gap-1.5 p-2' : 
              'gap-2 p-3'
            }`}
            style={{
              gridTemplateRows: `repeat(${getGridRows}, 1fr)`
            }}
          >
            {photos.slice(0, getPhotoCount).map((photo, index) => (
              <div
                key={photo.id}
                style={{
                  order: layout === '4-small-1-large' && index === 4 ? -1 : index
                }}
                className={`relative overflow-hidden rounded-lg shadow-md ${
                  (layout === '1-large-landscape' && index === 0) ? 'row-span-2' : ''
                } ${
                  (layout === '1-large-portrait' && index === 0) ? 'col-span-2' : ''
                } ${
                  (layout === '4-small-1-large' && index === 4) ? 'col-span-2 row-span-2' : ''
                } ${
                  // Apply aspect-square only to non-large photos
                  (layout !== '4-small-1-large' && 
                   !(layout === '1-large-landscape' && index === 0) && 
                   !(layout === '1-large-portrait' && index === 0)) ? 'aspect-square' : ''
                }`}
              >
                <img
                  src={`${API}/photos/${photo.id}/file`}
                  alt={photo.original_filename}
                  className={`w-full h-full ${imageObjectFit === 'cover' ? 'object-cover' : 'object-contain bg-gray-50'}`}
                  crossOrigin="anonymous"
                />
              </div>
            ))}

            {/* Empty slots */}
            {photos.length < getPhotoCount &&
              Array.from({ length: getPhotoCount - photos.length }).map((_, i) => {
                const slotIndex = photos.length + i;
                return (
                  <div
                    key={`empty-${i}`}
                    style={{
                      order: layout === '4-small-1-large' && slotIndex === 4 ? -1 : slotIndex
                    }}
                    className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 ${
                      (layout === '1-large-landscape' && photos.length === 0 && i === 0) ? 'row-span-2' : ''
                    } ${
                      (layout === '1-large-portrait' && photos.length === 0 && i === 0) ? 'col-span-2' : ''
                    } ${
                      (layout === '4-small-1-large' && slotIndex === 4) ? 'col-span-2 row-span-2' : ''
                    } ${
                      // Apply aspect-square only to non-large slots
                      (layout !== '4-small-1-large' && 
                       !(layout === '1-large-landscape' && photos.length === 0 && i === 0) && 
                       !(layout === '1-large-portrait' && photos.length === 0 && i === 0)) ? 'aspect-square' : ''
                    }`}
                  >
                    <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-xs text-gray-400 font-medium">{slotIndex + 1}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollageEditor;