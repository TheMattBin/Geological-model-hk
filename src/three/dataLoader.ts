/**
 * Data loader for voxel volume data
 * 
 * Loads binary .raw files and metadata.json for 3D volume visualization
 */

import * as THREE from 'three';
import type { VolumeMetadata, VariableMetadata, ColorStop, DiscreteColor } from './types';

export interface LoadedVolume {
  metadata: VolumeMetadata;
  textures: Map<number, THREE.Data3DTexture>;
  transferFunctions: Map<number, THREE.DataTexture>;
}

/**
 * Load volume metadata from JSON file
 */
export async function loadMetadata(basePath: string): Promise<VolumeMetadata> {
  const response = await fetch(`${basePath}/metadata.json`);
  if (!response.ok) {
    throw new Error(`Failed to load metadata: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Load raw binary volume data as ArrayBuffer
 */
export async function loadRawData(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load volume data: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * Create a 3D texture from raw volume data
 */
export function createVolumeTexture(
  data: ArrayBuffer,
  dimensions: { x: number; y: number; z: number },
  dtype: 'uint8' | 'float32' = 'uint8'
): THREE.Data3DTexture {
  const { x, y, z } = dimensions;
  const expectedSize = x * y * z * (dtype === 'float32' ? 4 : 1);
  
  if (data.byteLength !== expectedSize) {
    console.warn(`Data size mismatch: expected ${expectedSize}, got ${data.byteLength}`);
  }
  
  // Create typed array from buffer
  const typedArray = dtype === 'float32' 
    ? new Float32Array(data)
    : new Uint8Array(data);
  
  // Create 3D texture
  const texture = new THREE.Data3DTexture(
    typedArray,
    x, // width
    y, // height
    z  // depth
  );
  
  texture.format = THREE.RedFormat;
  texture.type = dtype === 'float32' ? THREE.FloatType : THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Create a transfer function texture for discrete (categorical) data
 */
export function createDiscreteTransferFunction(
  colormap: DiscreteColor[]
): THREE.DataTexture {
  // Create a 1D texture with one pixel per class
  const numClasses = colormap.length;
  const data = new Uint8Array(numClasses * 4);
  
  for (let i = 0; i < colormap.length; i++) {
    const color = colormap[i];
    const enabled = color.enabled !== false;
    data[i * 4 + 0] = color.color[0];
    data[i * 4 + 1] = color.color[1];
    data[i * 4 + 2] = color.color[2];
    data[i * 4 + 3] = enabled ? color.color[3] : 0;
  }
  
  const texture = new THREE.DataTexture(data, numClasses, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Create a transfer function texture for continuous data
 */
export function createContinuousTransferFunction(
  colormap: ColorStop[],
  resolution: number = 256
): THREE.DataTexture {
  const data = new Uint8Array(resolution * 4);
  
  // Sort colormap by position
  const sortedColormap = [...colormap].sort((a, b) => a.position - b.position);
  
  for (let i = 0; i < resolution; i++) {
    const t = i / (resolution - 1);
    
    // Find surrounding color stops
    let lowerIndex = 0;
    let upperIndex = sortedColormap.length - 1;
    
    for (let j = 0; j < sortedColormap.length - 1; j++) {
      if (t >= sortedColormap[j].position && t <= sortedColormap[j + 1].position) {
        lowerIndex = j;
        upperIndex = j + 1;
        break;
      }
    }
    
    const lower = sortedColormap[lowerIndex];
    const upper = sortedColormap[upperIndex];
    
    // Interpolate between color stops
    const range = upper.position - lower.position;
    const factor = range > 0 ? (t - lower.position) / range : 0;
    
    data[i * 4 + 0] = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * factor);
    data[i * 4 + 1] = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * factor);
    data[i * 4 + 2] = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * factor);
    data[i * 4 + 3] = Math.round(lower.color[3] + (upper.color[3] - lower.color[3]) * factor);
  }
  
  const texture = new THREE.DataTexture(data, resolution, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Create transfer function texture from variable metadata
 */
export function createTransferFunction(variable: VariableMetadata): THREE.DataTexture {
  if (variable.type === 'discrete') {
    return createDiscreteTransferFunction(variable.colormap as DiscreteColor[]);
  } else {
    return createContinuousTransferFunction(variable.colormap as ColorStop[]);
  }
}

/**
 * Load all volume data and create textures
 */
export async function loadVolume(
  basePath: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<LoadedVolume> {
  // Load metadata first
  const metadata = await loadMetadata(basePath);
  
  const textures = new Map<number, THREE.Data3DTexture>();
  const transferFunctions = new Map<number, THREE.DataTexture>();
  
  const total = metadata.variables.length;
  let loaded = 0;
  
  // Load each variable's data
  for (const variable of metadata.variables) {
    // Load raw volume data
    const dataUrl = `${basePath}/${variable.file}`;
    const rawData = await loadRawData(dataUrl);
    
    // Create 3D texture
    const texture = createVolumeTexture(rawData, metadata.dimensions, variable.dtype);
    textures.set(variable.id, texture);
    
    // Create transfer function
    const transferFunction = createTransferFunction(variable);
    transferFunctions.set(variable.id, transferFunction);
    
    loaded++;
    onProgress?.(loaded, total);
  }
  
  return {
    metadata,
    textures,
    transferFunctions,
  };
}

/**
 * Update transfer function for a variable (e.g., when toggling class visibility)
 */
export function updateDiscreteTransferFunction(
  texture: THREE.DataTexture,
  colormap: DiscreteColor[]
): void {
  const numClasses = colormap.length;
  const data = texture.image.data as unknown as Uint8Array;
  
  for (let i = 0; i < numClasses && i * 4 + 3 < data.length; i++) {
    const color = colormap[i];
    const enabled = color.enabled !== false;
    data[i * 4 + 0] = color.color[0];
    data[i * 4 + 1] = color.color[1];
    data[i * 4 + 2] = color.color[2];
    data[i * 4 + 3] = enabled ? color.color[3] : 0;
  }
  
  texture.needsUpdate = true;
}
