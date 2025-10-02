import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, CameraOff } from 'lucide-react';

function CameraScanner({ onScan, onClose, isOpen }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isOpen]);

  // Separate effect to handle video stream assignment
  useEffect(() => {
    if (stream && videoRef.current && hasPermission) {
      const video = videoRef.current;
      video.srcObject = stream;

      const handleLoadedMetadata = () => {
        video.play().then(() => {
          console.log('Video playing successfully');
          setIsScanning(true);
        }).catch(err => {
          console.error('Video play failed:', err);
          setError('Cannot play video: ' + err.message);
        });
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [stream, hasPermission]);

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
    setHasPermission(null);
    setError('');
  };

  const initializeCamera = async () => {
    try {
      setError('');
      setHasPermission(null);

      // Request camera permission with back camera preference
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      setHasPermission(true);
      console.log('Camera stream obtained:', mediaStream);

    } catch (err) {
      console.error('Camera error:', err);
      setHasPermission(false);

      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported on this device/browser.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  const switchCamera = async () => {
    if (stream) {
      cleanup();

      // Try to switch to front camera
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' }, // Front camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        setStream(mediaStream);
        setHasPermission(true);
      } catch (err) {
        setError('Failed to switch camera');
        initializeCamera(); // Fall back to original camera
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-4 max-w-lg w-full max-h-screen overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Camera size={20} />
            Scan Asset ID or Barcode
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        {hasPermission === false && (
          <div className="text-center py-4">
            <CameraOff size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-red-600 mb-4 text-sm">{error}</p>
            <div className="space-y-2">
              <button
                onClick={initializeCamera}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Try Camera Again
              </button>
              <p className="text-xs text-gray-600">
                Make sure to allow camera access when prompted
              </p>
            </div>
          </div>
        )}

        {hasPermission === true && (
          <div>
            <div className="relative mb-4 bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                playsInline
                muted
                controls={false}
                style={{ backgroundColor: '#000' }}
                onError={(e) => {
                  console.error('Video error:', e);
                  setError('Video display error');
                }}
                onLoadStart={() => console.log('Video loading started')}
                onCanPlay={() => console.log('Video can play')}
              />
              {isScanning && (
                <div className="absolute inset-4 border-2 border-red-500 rounded-lg flex items-center justify-center">
                  <div className="w-32 h-20 border-2 border-red-500 bg-red-500 bg-opacity-20 rounded animate-pulse">
                    <div className="text-center mt-6 text-red-500 text-xs font-bold">
                      SCAN HERE
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={switchCamera}
                className="flex-1 bg-gray-500 text-white py-2 px-3 rounded text-sm hover:bg-gray-600"
              >
                Switch Camera
              </button>
              <button
                onClick={initializeCamera}
                className="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>

            <div className="text-center text-xs text-gray-600 mb-4">
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-3">
                <p className="font-semibold text-gray-800 mb-1">📷 Camera Preview Only</p>
                <p className="text-xs">Use the manual input below to enter the Asset ID or any barcode number you see.</p>
              </div>
            </div>
          </div>
        )}

        {hasPermission === null && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Starting camera...</p>
            <p className="text-xs text-gray-500 mt-2">
              Please allow camera access when prompted
            </p>
          </div>
        )}

        {/* Manual input - primary method */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
          <p className="text-base font-semibold text-blue-800 mb-3">🔍 Enter Asset ID or Barcode:</p>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Type any number from the Asset ID barcode, Serial Number, or QR code..."
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-base focus:border-blue-500 focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-base font-semibold disabled:bg-gray-300"
            >
              🔍 Find Fire Extinguisher
            </button>
          </form>
          <p className="text-xs text-blue-600 mt-2">
            Tip: You can type any part of the Asset ID, Serial Number, or any barcode/QR code number
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CameraScanner;