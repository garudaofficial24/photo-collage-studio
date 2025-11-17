import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Upload, Download, RotateCw, Image as ImageIcon, FileText, Trash2, Plus, Grid3x3, Layout, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
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
  const layoutChangeTimeout = useRef(null);
  
  // Company header state
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    setCompanyLogo(file);

    // Create preview
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
      
      // Create canvas from collage preview
      const canvas = await html2canvas(collageRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        imageTimeout: 15000,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: imgHeight > pageHeight ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
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
      case '2x3':
        return 'grid-cols-2 grid-rows-3';
      case '3x2':
        return 'grid-cols-3 grid-rows-2';
      case '1-large':
        return 'grid-cols-2 grid-rows-2';
      case 'portrait':
        return 'grid-cols-2 grid-rows-4';
      case 'landscape':
        return 'grid-cols-4 grid-rows-2';
      default:
        return 'grid-cols-2 grid-rows-2';
    }
  }, [layout]);

  // Get photo count based on layout
  const getPhotoCount = useMemo(() => {
    switch (layout) {
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      case '2x3': return 6;
      case '3x2': return 6;
      case '1-large': return 4;
      case 'portrait': return 8;
      case 'landscape': return 8;
      default: return 4;
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
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <Grid3x3 className="w-5 h-5 text-purple-600" />
                  Template Layout
                </h2>
                
                {/* Grid Layouts */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grid Persegi</p>
                  <button
                    data-testid="layout-2x2"
                    onClick={() => handleLayoutChange('2x2')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === '2x2'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Grid 2×2</span>
                    <span className="text-sm text-gray-500">(4 Foto)</span>
                  </button>
                  
                  <button
                    data-testid="layout-3x3"
                    onClick={() => handleLayoutChange('3x3')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === '3x3'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Grid 3×3</span>
                    <span className="text-sm text-gray-500">(9 Foto)</span>
                  </button>
                  
                  <button
                    data-testid="layout-4x4"
                    onClick={() => handleLayoutChange('4x4')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === '4x4'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Grid 4×4</span>
                    <span className="text-sm text-gray-500">(16 Foto)</span>
                  </button>
                </div>

                {/* Rectangle Layouts */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grid Persegi Panjang</p>
                  <button
                    data-testid="layout-2x3"
                    onClick={() => handleLayoutChange('2x3')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === '2x3'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Grid 2×3</span>
                    <span className="text-sm text-gray-500">(6 Foto)</span>
                  </button>
                  
                  <button
                    data-testid="layout-3x2"
                    onClick={() => handleLayoutChange('3x2')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === '3x2'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Grid 3×2</span>
                    <span className="text-sm text-gray-500">(6 Foto)</span>
                  </button>
                </div>

                {/* Special Layouts */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Layout Spesial</p>
                  <button
                    data-testid="layout-portrait"
                    onClick={() => handleLayoutChange('portrait')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === 'portrait'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Portrait 2×4</span>
                    <span className="text-sm text-gray-500">(8 Foto)</span>
                  </button>
                  
                  <button
                    data-testid="layout-landscape"
                    onClick={() => handleLayoutChange('landscape')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === 'landscape'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Landscape 4×2</span>
                    <span className="text-sm text-gray-500">(8 Foto)</span>
                  </button>
                  
                  <button
                    data-testid="layout-1-large"
                    onClick={() => handleLayoutChange('1-large')}
                    className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                      layout === '1-large'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">1 Besar + 3 Kecil</span>
                    <span className="text-sm text-gray-500">(4 Foto)</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Company Header Section */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <FileText className="w-5 h-5 text-green-600" />
                  Logo & Nama Perusahaan
                </h2>
                
                <div className="space-y-4">
                  {/* Company Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Perusahaan
                    </label>
                    <input
                      type="text"
                      data-testid="company-name-input"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Masukkan nama perusahaan..."
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo Perusahaan
                    </label>
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-gray-50 transition-all"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">
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
                    <p className="text-xs text-gray-500 mt-1">Max 2MB, format: JPG, PNG, SVG</p>
                  </div>

                  {/* Preview */}
                  {(logoPreview || companyName) && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center gap-3">
                        {logoPreview && (
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            className="w-12 h-12 object-contain rounded"
                          />
                        )}
                        <div className="flex-1">
                          {companyName && (
                            <p className="font-semibold text-gray-800">{companyName}</p>
                          )}
                          {!companyName && logoPreview && (
                            <p className="text-sm text-gray-500">Logo tanpa nama</p>
                          )}
                        </div>
                        <button
                          data-testid="clear-company-header"
                          onClick={clearCompanyHeader}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
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
                  {/* Company Header */}
                  {(logoPreview || companyName) && (
                    <div className="h-24 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 flex items-center justify-center px-6">
                      <div className="flex items-center gap-4 text-white">
                        {logoPreview && (
                          <img
                            src={logoPreview}
                            alt="Company Logo"
                            className="w-16 h-16 object-contain bg-white/20 backdrop-blur-sm rounded-lg p-2"
                          />
                        )}
                        {companyName && (
                          <div>
                            <h3 className="text-2xl font-bold tracking-wide">{companyName}</h3>
                            <p className="text-sm opacity-90">Dokumentasi Foto Resmi</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Photo Grid */}
                  <div className={`grid ${getGridLayout} gap-2 p-4`}>
                    {photos.slice(0, getPhotoCount).map((photo, index) => (
                      <div
                        key={photo.id}
                        data-photo-id={photo.id}
                        data-testid={`collage-photo-${index}`}
                        className={`relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer group ${
                          layout === '1-large' && index === 0 ? 'col-span-2 row-span-2' : ''
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
                    {photos.length < getPhotoCount &&
                      Array.from({ length: getPhotoCount - photos.length }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className={`bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 ${
                            layout === '1-large' && photos.length === 0 && i === 0 ? 'col-span-2 row-span-2' : ''
                          }`}
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