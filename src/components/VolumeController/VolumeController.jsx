import { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * VolumeController - Controls for the Three.js volume renderer
 * 
 * Replaces the ArcGIS VoxelLayer component. Manages:
 * - Variable switching
 * - Vertical exaggeration
 * - Slicing and sections
 * - Isosurface display
 * - Legend data extraction
 */
const VolumeController = ({
  volumeRenderer,
  metadata,
  selectedVariable,
  exaggeration,
  continuousVariable,
  setContinuousVariable,
  setIsosurfaceInfo,
  sections,
  setSections,
  displayIsosurface,
  isosurfaceValue,
  setIsosurfaceValue,
  displaySections,
  dimensions,
  setDimensions,
  legendInfo,
  setLegendInfo,
}) => {
  const [loaded, setLoaded] = useState(false);

  // Initialize when renderer and metadata are available
  useEffect(() => {
    if (volumeRenderer && metadata) {
      setLoaded(true);
      
      // Set dimensions from metadata
      const dims = metadata.dimensions;
      setDimensions([dims.x, dims.y, dims.z]);
      
      // Initialize legend info from first variable
      updateLegendInfo(selectedVariable.id);
    }
  }, [volumeRenderer, metadata]);

  // Update legend info for the selected variable
  const updateLegendInfo = useCallback((variableId) => {
    if (!metadata) return;
    
    const variable = metadata.variables.find(v => v.id === variableId);
    if (!variable) return;
    
    const legendData = {
      id: variable.id,
      label: variable.name,
      continuous: variable.type === 'continuous',
    };
    
    if (variable.type === 'continuous') {
      legendData.range = variable.range 
        ? [variable.range.min, variable.range.max] 
        : [0, 1];
      legendData.colorStops = variable.colormap;
    } else {
      legendData.uniqueValues = variable.colormap.map(c => ({
        label: c.label,
        value: c.value,
        color: { r: c.color[0], g: c.color[1], b: c.color[2], a: c.color[3] },
        enabled: c.enabled !== false,
      }));
    }
    
    setLegendInfo(legendData);
  }, [metadata, setLegendInfo]);

  // Handle variable change
  useEffect(() => {
    if (loaded && volumeRenderer && selectedVariable) {
      volumeRenderer.setActiveVariable(selectedVariable.id);
      
      // Update continuous variable flag
      const variable = metadata?.variables.find(v => v.id === selectedVariable.id);
      setContinuousVariable(variable?.type === 'continuous');
      
      // Update legend
      updateLegendInfo(selectedVariable.id);
      
      // Update isosurface info for continuous variables
      if (variable?.type === 'continuous' && variable.range) {
        const min = Math.round(variable.range.min);
        const max = Math.round(variable.range.max);
        setIsosurfaceInfo({ min, max });
        setIsosurfaceValue(Math.floor((min + max) / 2));
      }
    }
  }, [loaded, volumeRenderer, selectedVariable, metadata]);

  // Handle vertical exaggeration change
  useEffect(() => {
    if (loaded && volumeRenderer && exaggeration) {
      volumeRenderer.setVerticalExaggeration(exaggeration);
    }
  }, [loaded, volumeRenderer, exaggeration]);

  // Handle isosurface display
  useEffect(() => {
    if (loaded && volumeRenderer) {
      console.log('VolumeController: Setting isosurface enabled:', displayIsosurface, 'value:', isosurfaceValue);
      volumeRenderer.setIsosurface(displayIsosurface, isosurfaceValue);
    }
  }, [loaded, volumeRenderer, displayIsosurface, isosurfaceValue]);

  // Handle sections
  useEffect(() => {
    if (loaded && volumeRenderer && dimensions && dimensions.length > 0) {
      if (displaySections && sections && sections.length > 0) {
        console.log('VolumeController: Updating sections', sections);
        
        // Find enabled sections
        const enabledSections = sections.filter(s => s.enabled);
        let hasNS = false, hasWE = false;
        let nsPosition = 1, wePosition = 1;
        
        enabledSections.forEach((section) => {
          const label = section.label || '';
          if (label.startsWith('ns')) {
            hasNS = true;
            nsPosition = section.point ? section.point[0] / dimensions[0] : 1;
          } else if (label.startsWith('we')) {
            hasWE = true;
            wePosition = section.point ? section.point[1] / dimensions[1] : 1;
          }
        });
        
        console.log('VolumeController: NS section:', hasNS, nsPosition, 'WE section:', hasWE, wePosition);
        volumeRenderer.setSection('NS', hasNS, nsPosition);
        volumeRenderer.setSection('WE', hasWE, wePosition);
      } else {
        // Disable all sections
        console.log('VolumeController: Disabling all sections');
        volumeRenderer.setSection('NS', false, 1);
        volumeRenderer.setSection('WE', false, 1);
      }
    }
  }, [loaded, volumeRenderer, sections, displaySections, dimensions]);

  // Handle legend info changes (e.g., toggling class visibility)
  useEffect(() => {
    if (volumeRenderer && legendInfo && !legendInfo.continuous) {
      const colormap = legendInfo.uniqueValues.map(uv => ({
        value: uv.value,
        label: uv.label,
        color: [uv.color.r, uv.color.g, uv.color.b, uv.color.a],
        enabled: uv.enabled,
      }));
      volumeRenderer.updateColormap(legendInfo.id, colormap);
    }
  }, [volumeRenderer, legendInfo]);

  // Initialize sections based on dimensions
  useEffect(() => {
    if (loaded && dimensions && dimensions.length > 0) {
      const newSections = [];
      for (let i = 1; i < dimensions[1]; i++) {
        newSections.push({ 
          enabled: false, 
          label: `we${i}`, 
          orientation: 180, 
          tilt: 90, 
          point: [0, i, 0] 
        });
      }
      for (let i = 1; i < dimensions[0]; i++) {
        newSections.push({ 
          enabled: false, 
          label: `ns${i}`, 
          orientation: 90, 
          tilt: 90, 
          point: [i, 0, 0] 
        });
      }
      setSections(newSections);
    }
  }, [loaded, dimensions, setSections]);

  // This component doesn't render anything - it just manages state
  return null;
};

VolumeController.propTypes = {
  volumeRenderer: PropTypes.object,
  metadata: PropTypes.object,
  selectedVariable: PropTypes.object,
  exaggeration: PropTypes.number,
  continuousVariable: PropTypes.bool,
  setContinuousVariable: PropTypes.func,
  setIsosurfaceInfo: PropTypes.func,
  sections: PropTypes.array,
  setSections: PropTypes.func,
  displayIsosurface: PropTypes.bool,
  isosurfaceValue: PropTypes.number,
  setIsosurfaceValue: PropTypes.func,
  displaySections: PropTypes.bool,
  dimensions: PropTypes.array,
  setDimensions: PropTypes.func,
  legendInfo: PropTypes.object,
  setLegendInfo: PropTypes.func,
};

export default VolumeController;
