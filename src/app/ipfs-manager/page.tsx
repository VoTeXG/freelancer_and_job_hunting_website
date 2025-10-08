'use client';

import { useState } from 'react';
import { uploadToIPFS, uploadJSONToIPFS, getIPFSGatewayUrl } from '@/lib/ipfs';
import { Button } from '@/components/ui/Button';
import PageContainer from '@/components/PageContainer';
import SectionHeader from '@/components/SectionHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LazyIcon } from '@/components/ui/LazyIcon';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  ipfsHash: string;
  uploadedAt: Date;
}

export default function IPFSFileManager() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [uploadingJson, setUploadingJson] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const ipfsHash = await uploadToIPFS(file);
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          ipfsHash,
          uploadedAt: new Date()
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFiles(prev => [...prev, ...uploadedFiles]);
      
      // Clear the input
      event.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleJsonUpload = async () => {
    if (!jsonData.trim()) return;

    setUploadingJson(true);
    try {
      const data = JSON.parse(jsonData);
      const ipfsHash = await uploadJSONToIPFS(data);
      
      const uploadedFile: UploadedFile = {
        name: 'data.json',
        size: new Blob([jsonData]).size,
        type: 'application/json',
        ipfsHash,
        uploadedAt: new Date()
      };

      setFiles(prev => [...prev, uploadedFile]);
      setJsonData('');
    } catch (error) {
      console.error('JSON upload failed:', error);
      alert('JSON upload failed: ' + (error instanceof Error ? error.message : 'Invalid JSON'));
    } finally {
      setUploadingJson(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <PageContainer className="max-w-4xl">
      <SectionHeader title="IPFS File Manager" subtitle="Upload and manage files on the decentralized web" />

      <div className="space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Files to IPFS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer flex flex-col items-center ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <LazyIcon name="CloudArrowUpIcon" className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </h3>
                <p className="text-gray-600 text-center">
                  Click to select files or drag and drop<br />
                  <span className="text-sm text-gray-500">
                    Images, documents, videos, and more
                  </span>
                </p>
              </label>
            </div>
            
            {uploading && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-purple-600">Uploading to IPFS...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* JSON Data Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload JSON Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder="Enter JSON data here..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <Button
                onClick={handleJsonUpload}
                disabled={!jsonData.trim() || uploadingJson}
                className="w-full"
              >
                {uploadingJson ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading JSON...
                  </>
                ) : (
                  'Upload JSON to IPFS'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {files.length > 0 ? (
              <div className="space-y-4">
                {files.map((file, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <LazyIcon name="DocumentIcon" className="h-8 w-8 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900">{file.name}</h4>
                          <div className="text-sm text-gray-600 space-x-2">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{file.type}</span>
                            <span>•</span>
                            <span>Uploaded {file.uploadedAt.toLocaleString()}</span>
                          </div>
                          <div className="mt-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {file.ipfsHash}
                            </code>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <a
                          href={getIPFSGatewayUrl(file.ipfsHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <LazyIcon name="EyeIcon" className="h-5 w-5" />
                        </a>
                        
                        <button
                          onClick={() => removeFile(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LazyIcon name="XMarkIcon" className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <LazyIcon name="DocumentIcon" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No files uploaded yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Upload files to see them listed here with their IPFS hashes
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IPFS Information */}
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-800">About IPFS</CardTitle>
          </CardHeader>
          <CardContent className="text-purple-700">
            <div className="space-y-2 text-sm">
              <p>
                <strong>IPFS (InterPlanetary File System)</strong> is a distributed, peer-to-peer 
                protocol for storing and sharing data in a decentralized file system.
              </p>
              <p>
                <strong>Benefits:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Content-addressed storage (files identified by their content hash)</li>
                <li>Decentralized and censorship-resistant</li>
                <li>Permanent and immutable storage</li>
                <li>Reduced bandwidth costs through deduplication</li>
              </ul>
              <p className="mt-3">
                <strong>Use Cases in Freelancing:</strong> Store portfolios, project documentation, 
                certificates, and work samples permanently and securely.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
  </PageContainer>
  );
}
