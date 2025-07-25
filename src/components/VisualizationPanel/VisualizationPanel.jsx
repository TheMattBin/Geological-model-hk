import { Background, Title } from '../index';
import * as styles from './VisualizationPanel.module.css';
import '@esri/calcite-components/dist/components/calcite-slider';
import '@esri/calcite-components/dist/components/calcite-switch';
import '@esri/calcite-components/dist/components/calcite-label';
import '@esri/calcite-components/dist/components/calcite-radio-button-group';
import '@esri/calcite-components/dist/components/calcite-radio-button';
import {
  CalciteLabel,
  CalciteRadioButtonGroup,
  CalciteRadioButton,
  CalciteSlider,
  CalciteSwitch
} from '@esri/calcite-components-react';
import { variables } from '../../config';
import { useEffect, useState } from 'react';
import VoxelSlice from '@arcgis/core/layers/voxel/VoxelSlice';
import PropTypes from 'prop-types';

const getSlice = (orientation, value) => {
  switch (orientation) {
    case 'NS':
      return new VoxelSlice({
        orientation: 180,
        tilt: 90,
        point: [0, value, 0]
      });
    case 'WE':
      return new VoxelSlice({ orientation: 270, tilt: 90, point: [value, 0, 0] });
    case 'UD':
      return new VoxelSlice({
        tilt: 0,
        point: [0, 0, value]
      });
  }
};

const VisualizationPanel = ({
  selectedVariable,
  setSelectedVariable,
  selectedVisualization,
  setSelectedVisualization,
  exaggeration,
  setExaggeration,
  sections,
  setSections,
  continuousVariable,
  isosurfaceInfo,
  isosurfaceValue,
  setIsosurfaceValue,
  displayIsosurface,
  setDisplayIsosurface,
  displaySections,
  setDisplaySections,
  displaySlices,
  setDisplaySlices,
  setSlices,
  dimensions
}) => {
  const [currentNSSection, setCurrentNSSection] = useState(null);
  const [currentWESection, setCurrentWESection] = useState(null);
  const [currentWESlice, setCurrentWESlice] = useState(null);
  const [currentNSSlice, setCurrentNSSlice] = useState(null);
  const [currentUpDownSlice, setCurrentUpDownSlice] = useState(null);

  useEffect(() => {
    if (displaySections && currentNSSection && currentWESection) {
      let updatedSections = sections.map((section) => {
        if (section.label === `ns${currentNSSection}` || section.label === `we${currentWESection}`) {
          section.enabled = true;
        } else {
          section.enabled = false;
        }
        return section;
      });
      setSections(updatedSections);
    }
  }, [currentNSSection, currentWESection, displaySections]);

  useEffect(() => {
    if (dimensions) {
      setCurrentWESlice(getSlice('WE', dimensions[0]));
      setCurrentNSSlice(getSlice('NS', 1));
      setCurrentUpDownSlice(getSlice('UD', dimensions[2]));
      setCurrentNSSection(Math.floor(dimensions[0] / 2));
      setCurrentWESection(Math.floor(dimensions[1] / 2));
    }
  }, [dimensions]);

  useEffect(() => {
    if (displaySlices && currentNSSlice && currentWESlice && currentUpDownSlice) {
      setSlices([currentNSSlice, currentWESlice, currentUpDownSlice]);
    }
  }, [currentNSSlice, currentWESlice, currentUpDownSlice, displaySlices]);

  return (
    <Background title='Visualization' size='small'>
      <Title text='Variables'></Title>
      <CalciteRadioButtonGroup
        name='pressure-group'
        layout='vertical'
        scale='s'
        onCalciteRadioButtonChange={(event) => {
          const variable = variables.filter((v) => v.name === event.target.value)[0];
          setSelectedVariable(variable);
        }}
      >
        {variables.map((variable, index) => {
          const checked = selectedVariable.name === variable.name ? { checked: true } : undefined;
          return (
            <CalciteLabel key={index} layout='inline' className={styles.label}>
              <CalciteRadioButton value={variable.name} {...checked} scale='s'></CalciteRadioButton>
              {variable.name}
            </CalciteLabel>
          );
        })}
      </CalciteRadioButtonGroup>
      <Title text='Rendering'></Title>
      <CalciteRadioButtonGroup
        name='visualization-group'
        layout='vertical'
        scale='s'
        onCalciteRadioButtonChange={(event) => {
          setSelectedVisualization(event.target.value);
        }}
      >
        <CalciteLabel layout='inline' className={styles.label}>
          <CalciteRadioButton
            value='volume'
            checked={selectedVisualization === 'volume' ? true : undefined}
            scale='s'
          ></CalciteRadioButton>
          Full volume
        </CalciteLabel>
        <CalciteLabel layout='inline' className={styles.label}>
          <CalciteRadioButton
            value='surfaces'
            checked={selectedVisualization === 'surfaces' ? true : undefined}
            scale='s'
          ></CalciteRadioButton>
          Surfaces and sections
        </CalciteLabel>
      </CalciteRadioButtonGroup>
      {selectedVisualization === 'surfaces' && continuousVariable && isosurfaceInfo ? (
        <div className={styles.surfaces}>
          <CalciteLabel
            className={styles.label}
            layout='inline-space-between'
            onCalciteSwitchChange={(event) => {
              setDisplayIsosurface(event.target.checked);
            }}
          >
            Display isosurface ({selectedVariable.unit})
            <CalciteSwitch scale='m' checked={displayIsosurface ? true : undefined}></CalciteSwitch>
          </CalciteLabel>
          {displayIsosurface ? (
            <>
              <img className={styles.surfaceGraphic} src='./assets/surface.png'></img>
              <CalciteSlider
                labelHandles
                min={isosurfaceInfo.min}
                max={isosurfaceInfo.max}
                scale='m'
                value={isosurfaceValue}
                snap
                step={isosurfaceInfo.max - isosurfaceInfo.min < 10 ? 0.2 : 1}
                onCalciteSliderInput={(event) => {
                  const value = event.target.value;
                  setIsosurfaceValue(value);
                }}
              ></CalciteSlider>
            </>
          ) : (
            ''
          )}
        </div>
      ) : (
        ''
      )}
      {selectedVisualization === 'surfaces' ? (
        <div className={styles.dynamicSections}>
          <CalciteLabel
            className={styles.label}
            layout='inline-space-between'
            onCalciteSwitchChange={(event) => {
              setDisplaySections(event.target.checked);
            }}
          >
            Display sections
            <CalciteSwitch scale='m' checked={displaySections ? true : undefined}></CalciteSwitch>
          </CalciteLabel>
          {displaySections && dimensions.length > 0 ? (
            <div className={styles.sections}>
              <img className={styles.surfaceGraphic} src='./assets/section-north-south.png'></img>
              <CalciteSlider
                min={1}
                max={dimensions[0]}
                scale='m'
                value={currentNSSection}
                snap
                step='1'
                onCalciteSliderInput={(event) => {
                  const value = event.target.value;
                  setCurrentNSSection(value);
                }}
              ></CalciteSlider>

              <img className={styles.surfaceGraphic} src='./assets/section-west-east.png'></img>
              <CalciteSlider
                min={1}
                max={dimensions[1]}
                scale='m'
                value={currentWESection}
                snap
                step='1'
                onCalciteSliderInput={(event) => {
                  const value = event.target.value;
                  setCurrentWESection(value);
                }}
              ></CalciteSlider>
            </div>
          ) : (
            ''
          )}
        </div>
      ) : (
        ''
      )}
      <div className='separator'></div>
      <div>
        <CalciteLabel
          className={styles.label}
          layout='inline-space-between'
          onCalciteSwitchChange={(event) => {
            setDisplaySlices(event.target.checked);
          }}
        >
          Slice layer
          <CalciteSwitch scale='m' checked={displaySlices ? true : undefined}></CalciteSwitch>
        </CalciteLabel>
        {displaySlices && dimensions.length > 0 ? (
          <div className={styles.slices}>
            <img className={styles.sliceGraphic} src='./assets/slice-west-east.png'></img>
            <CalciteSlider
              min={1}
              max={dimensions[0]}
              scale='m'
              value={currentWESlice.point[0]}
              snap
              step={1}
              onCalciteSliderInput={(event) => {
                const value = event.target.value;
                setCurrentWESlice(getSlice('WE', value));
              }}
            ></CalciteSlider>
            <img className={styles.sliceGraphic} src='./assets/slice-north-south.png'></img>
            <CalciteSlider
              min={1}
              max={dimensions[1] - 2}
              scale='m'
              value={dimensions[1] - 2 - currentNSSlice.point[1]}
              snap
              step={1}
              onCalciteSliderInput={(event) => {
                const value = dimensions[1] - 2 - event.target.value;
                setCurrentNSSlice(getSlice('NS', value));
              }}
            ></CalciteSlider>
            <img className={styles.sliceGraphic} src='./assets/slice-up-down.png'></img>
            <CalciteSlider
              min={0}
              max={dimensions[2]}
              scale='m'
              value={currentUpDownSlice.point[2]}
              snap
              step={1}
              onCalciteSliderInput={(event) => {
                const value = event.target.value;
                setCurrentUpDownSlice(getSlice('UD', value));
              }}
            ></CalciteSlider>
          </div>
        ) : (
          ''
        )}
      </div>
      <div className='separator'></div>
      <CalciteLabel className={styles.label}>Vertical exaggeration</CalciteLabel>
      <div className={styles.slices}>
        <CalciteSlider
          labelHandles
          min='1'
          max='20'
          scale='m'
          value={exaggeration}
          snap
          step='1'
          onCalciteSliderInput={(event) => {
            const value = event.target.value ? event.target.value : 1;
            setExaggeration(value);
          }}
        ></CalciteSlider>
      </div>
    </Background>
  );
};

VisualizationPanel.propTypes = {
  selectedVariable: PropTypes.object.isRequired,
  setSelectedVariable: PropTypes.func.isRequired,
  selectedVisualization: PropTypes.string.isRequired,
  setSelectedVisualization: PropTypes.func.isRequired,
  exaggeration: PropTypes.number.isRequired,
  setExaggeration: PropTypes.func.isRequired,
  sections: PropTypes.array.isRequired,
  setSections: PropTypes.func.isRequired,
  continuousVariable: PropTypes.any,
  isosurfaceInfo: PropTypes.any,
  isosurfaceValue: PropTypes.any,
  setIsosurfaceValue: PropTypes.func,
  displayIsosurface: PropTypes.bool.isRequired,
  setDisplayIsosurface: PropTypes.func.isRequired,
  displaySections: PropTypes.bool.isRequired,
  setDisplaySections: PropTypes.func.isRequired,
  displaySlices: PropTypes.bool.isRequired,
  setDisplaySlices: PropTypes.func.isRequired,
  setSlices: PropTypes.func.isRequired,
  dimensions: PropTypes.array.isRequired,
};

export default VisualizationPanel;
