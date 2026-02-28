import { useRef, useEffect, useState, useCallback, Children, cloneElement } from 'react';
import PropTypes from 'prop-types';
import * as styles from './Scene3D.module.css';
import { VolumeRenderer } from '../../three/VolumeRenderer';

/**
 * Scene3D - Three.js 3D scene container component
 * 
 * Replaces the ArcGIS Map component with a Three.js-based volume renderer.
 * Manages the WebGL context, camera, and volume rendering.
 */
const Scene3D = ({ children, dataPath = './data' }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const [volumeRenderer, setVolumeRenderer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  // Initialize the volume renderer after container has dimensions
  useEffect(() => {
    if (!containerRef.current) {
      console.error('Scene3D: Container ref is null');
      return;
    }

    // Prevent double initialization in StrictMode
    if (rendererRef.current) {
      console.log('Scene3D: Renderer already exists, skipping initialization');
      return;
    }

    // Clean up any leftover canvas elements from previous instances
    const container = containerRef.current;
    const existingCanvases = container.querySelectorAll('canvas');
    existingCanvases.forEach(canvas => {
      console.log('Scene3D: Removing leftover canvas');
      canvas.remove();
    });

    // Wait for container to have dimensions (CSS layout not yet applied on first render)
    const initializeRenderer = () => {
      if (!container) return;
      
      // Double-check we haven't been initialized in the meantime (race condition guard)
      if (rendererRef.current) {
        console.log('Scene3D: Renderer already initialized, aborting');
        return;
      }
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      console.log('Scene3D: Container dimensions:', width, 'x', height);
      
      // If container has zero dimensions, wait and try again
      if (width === 0 || height === 0) {
        console.log('Scene3D: Container has zero dimensions, waiting...');
        requestAnimationFrame(initializeRenderer);
        return;
      }
      
      console.log('Scene3D: Initializing VolumeRenderer');
      
      let renderer;
      try {
        // Create volume renderer
        renderer = new VolumeRenderer({
          container: container,
          transparent: true,
          quality: 'high',
          onLoadingChange: setLoading,
          onError: (err) => {
            console.error('Volume renderer error:', err);
            setError(err.message);
          },
        });

        rendererRef.current = renderer;
        setVolumeRenderer(renderer);
        console.log('Scene3D: VolumeRenderer created successfully');
      } catch (err) {
        console.error('Scene3D: Failed to create VolumeRenderer:', err);
        setError(`Failed to create renderer: ${err.message}`);
        setLoading(false);
        return;
      }

      // Load volume data
      console.log('Scene3D: Loading data from', dataPath);
      renderer.loadData(dataPath)
        .then(() => {
          console.log('Scene3D: Data loaded successfully');
          setMetadata(renderer.getMetadata());
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load volume data:', err);
          setError(`Failed to load data: ${err.message}`);
          setLoading(false);
        });
    };
    
    // Start initialization after a short delay to let CSS apply
    requestAnimationFrame(initializeRenderer);

    // Cleanup on unmount
    return () => {
      console.log('Scene3D: Cleanup - disposing renderer');
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [dataPath]);

  // Callback for children to interact with the renderer
  const getRenderer = useCallback(() => rendererRef.current, []);

  return (
    <>
      <div className={styles.sceneContainer} ref={containerRef}>
        {loading && <div className={styles.loading}>Loading volume data...</div>}
        {error && <div className={styles.error}>{error}</div>}
      </div>
      {/* Pass volumeRenderer to children */}
      {Children.map(children, (child) => {
        if (child) {
          return cloneElement(child, {
            volumeRenderer,
            metadata,
            getRenderer,
          });
        }
        return child;
      })}
    </>
  );
};

Scene3D.propTypes = {
  children: PropTypes.node,
  dataPath: PropTypes.string,
};

export default Scene3D;
