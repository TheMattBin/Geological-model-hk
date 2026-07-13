/**
 * VolumeRenderer - Main class for 3D volumetric rendering using Three.js
 * 
 * This class handles:
 * - WebGL context and Three.js scene setup
 * - Loading and displaying 3D voxel data
 * - Ray marching volume rendering
 * - Camera controls (orbit, pan, zoom)
 * - Slicing and cross-sections
 * - Variable switching
 * - Vertical exaggeration
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type {
  VolumeRendererOptions,
  VolumeRendererState,
  VolumeMetadata,
  RenderMode,
  CameraState,
} from './types';
import { loadVolume, LoadedVolume, updateDiscreteTransferFunction } from './dataLoader';
import { volumeVertexShader, volumeFragmentShader, debugVertexShader, debugFragmentShader } from './shaders';
import type { DiscreteColor } from './types';
import { AdaptiveQualityController } from './renderQuality.mjs';
import { getCameraDistance, getNormalizedVolumeSize, validateVolumeMetadata } from './volumeGeometry.mjs';
import type { PerformanceMetrics } from './types';

export class VolumeRenderer {
  // Three.js core objects
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  
  // Volume rendering objects
  private volumeMesh: THREE.Mesh | null = null;
  private volumeMaterial: THREE.RawShaderMaterial | null = null;
  
  // Data
  private loadedVolume: LoadedVolume | null = null;
  private metadata: VolumeMetadata | null = null;
  
  // State
  private state: VolumeRendererState;
  private animationFrameId: number | null = null;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private usesWindowResize = false;
  private renderRequested = false;
  private isInteracting = false;
  private qualityRecoveryFrames = 0;
  private cameraUniformDirty = true;
  private disposed = false;

  // Reused math objects avoid allocations in the render loop.
  private cameraPosition = new THREE.Vector3();
  private lastCameraPosition = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private inverseVolumeMatrix = new THREE.Matrix4();

  // Callbacks
  private onLoadingChange?: (loading: boolean) => void;
  private onError?: (error: Error) => void;
  private onPerformanceChange?: (metrics: PerformanceMetrics) => void;

  // Quality and performance tracking
  private qualityController: AdaptiveQualityController;
  private frameSamples: number[] = [];
  private frameCount = 0;
  
  // Debug mode - set to true to use simple colored shader for debugging
  private debugMode = false;
  
  constructor(options: VolumeRendererOptions) {
    this.container = options.container;
    this.onLoadingChange = options.onLoadingChange;
    this.onError = options.onError;
    this.onPerformanceChange = options.onPerformanceChange;
    this.qualityController = new AdaptiveQualityController({
      devicePixelRatio: window.devicePixelRatio,
      initialTier: options.quality === 'low' ? 'interaction' : options.quality === 'high' ? 'high' : 'balanced',
    });
    
    console.log('VolumeRenderer: initializing with container', this.container);
    console.log('Container size:', this.container.clientWidth, 'x', this.container.clientHeight);
    
    // Initialize state
    this.state = {
      activeVariableId: 0,
      renderMode: options.renderMode || 'volume',
      verticalExaggeration: options.verticalExaggeration || 1,
      slices: {
        x: { enabled: false, axis: 'x', position: 0.5 },
        y: { enabled: false, axis: 'y', position: 0.5 },
        z: { enabled: false, axis: 'z', position: 0.5 },
      },
      sections: {
        NS: { enabled: false, orientation: 'NS', position: 1 },
        WE: { enabled: false, orientation: 'WE', position: 1 },
      },
      isosurface: {
        enabled: false,
        value: 0.5,
        opacity: 0.7,
      },
    };
    
    // Initialize Three.js
    try {
      this.renderer = this.createRenderer(options.transparent);
      this.scene = this.createScene();
      this.camera = this.createCamera();
      this.controls = this.createControls();
      
      // Note: canvas is added to container inside createRenderer
      
      console.log('VolumeRenderer: Three.js initialized successfully');
    } catch (error) {
      console.error('VolumeRenderer: Failed to initialize Three.js', error);
      throw error;
    }
    
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
    } else {
      this.usesWindowResize = true;
      window.addEventListener('resize', this.handleResize);
    }

    this.controls.addEventListener('start', this.handleInteractionStart);
    this.controls.addEventListener('change', this.handleControlsChange);
    this.controls.addEventListener('end', this.handleInteractionEnd);

    // Start with one frame; subsequent frames are requested only while needed.
    this.requestRender();
  }
  
  private createRenderer(transparent: boolean = true): THREE.WebGLRenderer {
    // Create a canvas element explicitly
    const canvas = document.createElement('canvas');
    this.container.appendChild(canvas);
    
    // Check WebGL support first
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL is not supported in this browser');
    }
    
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        alpha: transparent,
        powerPreference: 'high-performance',
      });
      
      renderer.setPixelRatio(this.qualityController.pixelRatio);
      
      // Use container dimensions, fall back to window if container has no size yet
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      console.log('VolumeRenderer: Setting size to', width, 'x', height);
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      
      return renderer;
    } catch (err) {
      // Remove the canvas we added
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`WebGL initialization failed: ${errorMsg}`);
    }
  }
  
  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null; // Transparent
    return scene;
  }
  
  private createCamera(): THREE.PerspectiveCamera {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    
    // Default camera position
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);
    
    return camera;
  }
  
  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 100;
    controls.enablePan = true;
    controls.panSpeed = 0.5;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.0;
    
    return controls;
  }
  
  private handleResize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.requestRender();
    }
  };

  private requestRender = (): void => {
    if (this.disposed || this.animationFrameId !== null) return;

    this.renderRequested = true;
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private handleInteractionStart = (): void => {
    this.isInteracting = true;
    this.qualityController.update(16, true);
    this.applyQualityProfile();
    this.requestRender();
  };

  private handleControlsChange = (): void => {
    this.cameraUniformDirty = true;
    this.requestRender();
  };

  private handleInteractionEnd = (): void => {
    this.isInteracting = false;
    this.qualityRecoveryFrames = 60;
    this.requestRender();
  };

  private applyQualityProfile = (): void => {
    if (!this.volumeMaterial || this.debugMode) return;

    this.volumeMaterial.uniforms.uSteps.value = this.qualityController.profile.steps;
    this.renderer.setPixelRatio(this.qualityController.pixelRatio);
    this.volumeMaterial.uniforms.uAlphaScale.value = this.qualityController.profile.tier === 'interaction' ? 0.5 : 0.3;
  };

  private updateCameraUniform = (): void => {
    if (!this.volumeMaterial || this.debugMode || !this.volumeMaterial.uniforms.cameraPos || !this.volumeMesh) return;
    if (!this.cameraUniformDirty && this.camera.position.equals(this.lastCameraPosition)) return;

    this.cameraPosition.copy(this.camera.position);
    this.volumeMesh.updateMatrixWorld();
    this.inverseVolumeMatrix.copy(this.volumeMesh.matrixWorld).invert();
    this.cameraPosition.applyMatrix4(this.inverseVolumeMatrix);
    this.volumeMaterial.uniforms.cameraPos.value.copy(this.cameraPosition);
    this.lastCameraPosition.copy(this.camera.position);
    this.cameraUniformDirty = false;
  };

  private animate = (): void => {
    this.animationFrameId = null;
    if (this.disposed || !this.renderRequested) return;

    this.renderRequested = false;
    const frameStart = performance.now();
    const controlsChanged = this.controls.update();
    this.updateCameraUniform();
    this.renderer.render(this.scene, this.camera);

    const frameTimeMs = performance.now() - frameStart;
    this.frameSamples.push(frameTimeMs);
    this.frameCount += 1;
    if (this.frameSamples.length > 30) this.frameSamples.shift();

    const nextProfile = this.qualityController.update(frameTimeMs, this.isInteracting);
    const currentSteps = this.volumeMaterial && !this.debugMode ? this.volumeMaterial.uniforms.uSteps.value : -1;
    if (nextProfile.steps !== currentSteps) {
      this.applyQualityProfile();
    }

    if (this.onPerformanceChange && this.frameCount % 30 === 0) {
      const averageFrameTime = this.frameSamples.reduce((sum, value) => sum + value, 0) / this.frameSamples.length;
      this.onPerformanceChange({
        fps: averageFrameTime > 0 ? 1000 / averageFrameTime : 0,
        frameTimeMs: averageFrameTime,
        qualityTier: this.qualityController.profile.tier,
        raySteps: this.qualityController.profile.steps,
        pixelRatio: this.qualityController.pixelRatio,
      });
    }

    const shouldContinueRendering = this.isInteracting || controlsChanged || this.qualityRecoveryFrames > 0;
    if (!this.isInteracting && this.qualityRecoveryFrames > 0) this.qualityRecoveryFrames -= 1;
    if (shouldContinueRendering) this.requestRender();
  };
  
  /**
   * Load volume data from the specified path
   */
  async loadData(basePath: string): Promise<void> {
    this.onLoadingChange?.(true);
    
    try {
      this.loadedVolume = await loadVolume(basePath, (loaded, total) => {
        console.log(`Loading: ${loaded}/${total} variables`);
      });
      
      this.metadata = this.loadedVolume.metadata;
      
      // Create volume mesh
      this.createVolumeMesh();
      
      // Position camera based on volume bounds
      this.fitCameraToVolume();
      this.requestRender();
      
      this.onLoadingChange?.(false);
    } catch (error) {
      this.onLoadingChange?.(false);
      this.onError?.(error as Error);
      throw error;
    }
  }
  
  private createVolumeMesh(): void {
    if (!this.loadedVolume || !this.metadata) return;

    const metadataWarnings = validateVolumeMetadata(this.metadata);
    metadataWarnings.forEach((warning) => console.warn(`Volume metadata: ${warning}`));
    
    // Remove existing mesh and wireframe
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
      this.volumeMesh.geometry.dispose();
      this.volumeMaterial?.dispose();
      this.volumeMesh = null;
      this.volumeMaterial = null;
    }
    
    // Remove old debug wireframe
    const oldWireframe = this.scene.getObjectByName('debugWireframe');
    if (oldWireframe) {
      this.scene.remove(oldWireframe);
      if (oldWireframe instanceof THREE.LineSegments) {
        oldWireframe.geometry.dispose();
        (oldWireframe.material as THREE.Material).dispose();
      }
    }
    
    // Keep shader bounds in the un-exaggerated local coordinate system. The
    // display-only Z scale is applied to the mesh below.
    const normalizedSize = getNormalizedVolumeSize(this.metadata);
    const size = new THREE.Vector3(normalizedSize.x, normalizedSize.y, normalizedSize.z);
    
    console.log('Creating volume mesh with size:', size.x, size.y, size.z);
    console.log('Metadata:', this.metadata);
    console.log('Loaded textures:', this.loadedVolume.textures);
    
    // Create box geometry for ray marching
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    
    // Debug mode: use simple colored material
    if (this.debugMode) {
      console.log('DEBUG MODE: Using simple colored shader');
      this.volumeMaterial = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: debugVertexShader,
        fragmentShader: debugFragmentShader,
        uniforms: {},
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: true,
        depthWrite: true,
      });
    } else {
      // Get active variable
      const activeVar = this.metadata.variables.find(v => v.id === this.state.activeVariableId);
      const isDiscrete = activeVar?.type === 'discrete';
      
      // Create bounds vectors
      const boundsMin = new THREE.Vector3(-size.x / 2, -size.y / 2, -size.z / 2);
      const boundsMax = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
      
      // Create shader material
      this.volumeMaterial = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: volumeVertexShader,
        fragmentShader: volumeFragmentShader,
        uniforms: {
          uVolumeData: { value: this.loadedVolume.textures.get(this.state.activeVariableId) },
          uTransferFunction: { value: this.loadedVolume.transferFunctions.get(this.state.activeVariableId) },
          uDiscreteMode: { value: isDiscrete },
          uNumClasses: { value: activeVar?.numClasses || 1 },
          uVolumeDimensions: { value: new THREE.Vector3(
            this.metadata.dimensions.x,
            this.metadata.dimensions.y,
            this.metadata.dimensions.z
          )},
          uBoundsMin: { value: boundsMin },
          uBoundsMax: { value: boundsMax },
          uSteps: { value: this.qualityController.profile.steps },
          uAlphaScale: { value: this.qualityController.profile.tier === 'interaction' ? 0.5 : 0.3 },
          uBrightness: { value: 1.5 },
          cameraPos: { value: new THREE.Vector3() },
          
          // Slice uniforms
          uSliceXEnabled: { value: this.state.slices.x.enabled },
          uSliceXMin: { value: 0 },
          uSliceXMax: { value: 1 },
          uSliceYEnabled: { value: this.state.slices.y.enabled },
          uSliceYMin: { value: 0 },
          uSliceYMax: { value: 1 },
          uSliceZEnabled: { value: this.state.slices.z.enabled },
          uSliceZMin: { value: 0 },
          uSliceZMax: { value: 1 },
          
          // Section uniforms
          uSectionNSEnabled: { value: this.state.sections.NS.enabled },
          uSectionNSPosition: { value: this.state.sections.NS.position },
          uSectionWEEnabled: { value: this.state.sections.WE.enabled },
          uSectionWEPosition: { value: this.state.sections.WE.position },
          
          // Isosurface uniforms
          uIsosurfaceEnabled: { value: this.state.isosurface.enabled },
          uIsosurfaceValue: { value: this.state.isosurface.value },
          uIsosurfaceColor: { value: new THREE.Vector3(0.2, 0.6, 1.0) }, // Light blue
          uIsosurfaceOpacity: { value: this.state.isosurface.opacity },
          
          // Vertical exaggeration
          uVerticalExaggeration: { value: this.state.verticalExaggeration },
        },
        side: THREE.BackSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      });
    }
    
    // Check for shader compilation errors
    console.log('Shader material created:', this.volumeMaterial);
    
    this.volumeMesh = new THREE.Mesh(geometry, this.volumeMaterial);
    this.volumeMesh.scale.z = this.state.verticalExaggeration;
    this.scene.add(this.volumeMesh);

    this.cameraUniformDirty = true;
    console.log('Volume mesh created and added to scene');
    console.log('Scene children:', this.scene.children);
  }
  
  private fitCameraToVolume(): void {
    if (!this.metadata) return;

    const size = getNormalizedVolumeSize(this.metadata, this.state.verticalExaggeration);
    const distance = getCameraDistance(size, this.camera.fov);
    const direction = new THREE.Vector3(1, 0.8, 0.6).normalize();

    this.camera.position.copy(direction).multiplyScalar(distance);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.cameraUniformDirty = true;
    this.requestRender();
  }
  
  /**
   * Set the active variable for visualization
   */
  setActiveVariable(variableId: number): void {
    console.log('setActiveVariable called with:', variableId, 'debugMode:', this.debugMode);
    
    if (!this.loadedVolume || !this.volumeMaterial) {
      console.log('setActiveVariable: loadedVolume or volumeMaterial not ready');
      return;
    }
    
    // In debug mode, uniforms are not set up
    if (this.debugMode) {
      this.state.activeVariableId = variableId;
      return;
    }
    
    const variable = this.metadata?.variables.find(v => v.id === variableId);
    if (!variable) {
      console.log('setActiveVariable: variable not found');
      return;
    }
    
    console.log('setActiveVariable: switching to', variable.name, 'type:', variable.type);
    
    this.state.activeVariableId = variableId;
    
    // Update textures
    const volumeTexture = this.loadedVolume.textures.get(variableId);
    const transferTexture = this.loadedVolume.transferFunctions.get(variableId);
    
    console.log('setActiveVariable: volumeTexture:', volumeTexture, 'transferTexture:', transferTexture);
    
    this.volumeMaterial.uniforms.uVolumeData.value = volumeTexture;
    this.volumeMaterial.uniforms.uTransferFunction.value = transferTexture;
    this.volumeMaterial.uniforms.uDiscreteMode.value = variable.type === 'discrete';
    this.volumeMaterial.uniforms.uNumClasses.value = variable.numClasses || 256;
    
    console.log('setActiveVariable: uniforms updated, discreteMode:', variable.type === 'discrete', 'numClasses:', variable.numClasses || 256);
    this.requestRender();
  }
  
  /**
   * Set vertical exaggeration
   */
  setVerticalExaggeration(value: number): void {
    const previousExaggeration = this.state.verticalExaggeration;
    this.state.verticalExaggeration = value;
    if (this.volumeMesh) {
      this.volumeMesh.scale.z = value;
      this.volumeMesh.updateMatrixWorld();
      this.cameraUniformDirty = true;
    }

    if (this.metadata && previousExaggeration !== value) {
      const previousSize = getNormalizedVolumeSize(this.metadata, previousExaggeration);
      const nextSize = getNormalizedVolumeSize(this.metadata, value);
      const previousDistance = getCameraDistance(previousSize, this.camera.fov);
      const nextDistance = getCameraDistance(nextSize, this.camera.fov);
      const cameraOffset = this.camera.position.clone().sub(this.controls.target);

      if (cameraOffset.lengthSq() > 0 && previousDistance > 0) {
        cameraOffset.multiplyScalar(nextDistance / previousDistance);
        this.camera.position.copy(this.controls.target).add(cameraOffset);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      } else {
        this.fitCameraToVolume();
      }
    }

    this.requestRender();
  }
  
  /**
   * Enable/disable and set slice position
   */
  setSlice(axis: 'x' | 'y' | 'z', enabled: boolean, min?: number, max?: number): void {
    console.log('setSlice:', axis, 'enabled:', enabled, 'min:', min, 'max:', max);
    this.state.slices[axis].enabled = enabled;
    
    if (!this.volumeMaterial || this.debugMode) {
      console.log('setSlice: material not ready or debug mode');
      return;
    }
    
    const axisUpper = axis.toUpperCase();
    this.volumeMaterial.uniforms[`uSlice${axisUpper}Enabled`].value = enabled;
    
    if (min !== undefined) {
      this.volumeMaterial.uniforms[`uSlice${axisUpper}Min`].value = min;
    }
    if (max !== undefined) {
      this.volumeMaterial.uniforms[`uSlice${axisUpper}Max`].value = max;
    }
    this.requestRender();
  }
  
  /**
   * Enable/disable and set section position
   */
  setSection(orientation: 'NS' | 'WE', enabled: boolean, position?: number): void {
    console.log('setSection:', orientation, 'enabled:', enabled, 'position:', position);
    this.state.sections[orientation].enabled = enabled;
    if (position !== undefined) {
      this.state.sections[orientation].position = position;
    }
    
    if (!this.volumeMaterial || this.debugMode) {
      console.log('setSection: material not ready or debug mode');
      return;
    }
    
    this.volumeMaterial.uniforms[`uSection${orientation}Enabled`].value = enabled;
    if (position !== undefined) {
      this.volumeMaterial.uniforms[`uSection${orientation}Position`].value = position;
    }
    this.requestRender();
  }
  
  /**
   * Enable/disable and set isosurface value
   */
  setIsosurface(enabled: boolean, value?: number, color?: [number, number, number]): void {
    console.log('setIsosurface:', 'enabled:', enabled, 'value:', value);
    this.state.isosurface.enabled = enabled;
    if (value !== undefined) {
      this.state.isosurface.value = value;
    }
    
    if (!this.volumeMaterial || this.debugMode) {
      console.log('setIsosurface: material not ready or debug mode');
      return;
    }
    
    this.volumeMaterial.uniforms.uIsosurfaceEnabled.value = enabled;
    if (value !== undefined) {
      // Normalize value to 0-1 range based on metadata
      const variable = this.metadata?.variables.find(v => v.id === this.state.activeVariableId);
      if (variable && variable.range) {
        const normalizedValue = (value - variable.range.min) / (variable.range.max - variable.range.min);
        this.volumeMaterial.uniforms.uIsosurfaceValue.value = normalizedValue;
        console.log('setIsosurface: normalized value:', normalizedValue, 'from raw:', value);
      } else {
        this.volumeMaterial.uniforms.uIsosurfaceValue.value = value;
      }
    }
    if (color) {
      this.volumeMaterial.uniforms.uIsosurfaceColor.value.set(color[0], color[1], color[2]);
    }
    this.requestRender();
  }
  
  /**
   * Update discrete colormap (e.g., toggle class visibility)
   */
  updateColormap(variableId: number, colormap: DiscreteColor[]): void {
    if (!this.loadedVolume) return;
    
    const texture = this.loadedVolume.transferFunctions.get(variableId);
    if (texture) {
      updateDiscreteTransferFunction(texture, colormap);
    }
    this.requestRender();
  }
  
  /**
   * Get current camera state
   */
  getCameraState(): CameraState {
    return {
      position: this.camera.position.toArray() as [number, number, number],
      target: this.controls.target.toArray() as [number, number, number],
      zoom: this.camera.zoom,
    };
  }
  
  /**
   * Set camera state
   */
  setCameraState(state: CameraState): void {
    this.camera.position.fromArray(state.position);
    this.controls.target.fromArray(state.target);
    this.camera.zoom = state.zoom;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  
  /**
   * Get the current state
   */
  getState(): VolumeRendererState {
    return { ...this.state };
  }
  
  /**
   * Get metadata
   */
  getMetadata(): VolumeMetadata | null {
    return this.metadata;
  }
  
  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.disposed = true;

    // Stop the pending frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.resizeObserver?.disconnect();
    if (this.usesWindowResize) window.removeEventListener('resize', this.handleResize);
    this.controls.removeEventListener('start', this.handleInteractionStart);
    this.controls.removeEventListener('change', this.handleControlsChange);
    this.controls.removeEventListener('end', this.handleInteractionEnd);
    
    // Dispose Three.js objects
    if (this.volumeMesh) {
      this.volumeMesh.geometry.dispose();
    }
    if (this.volumeMaterial) {
      this.volumeMaterial.dispose();
    }
    
    // Dispose textures
    if (this.loadedVolume) {
      for (const texture of this.loadedVolume.textures.values()) texture.dispose();
      for (const texture of this.loadedVolume.transferFunctions.values()) texture.dispose();
    }
    
    this.controls.dispose();
    this.renderer.dispose();
    
    // Remove canvas from container
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
