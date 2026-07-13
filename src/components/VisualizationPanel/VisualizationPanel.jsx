import Background from '../Background/Background';
import Title from '../Title/Title';
import * as styles from './VisualizationPanel.module.css';
import { variables } from '../../config';
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * VisualizationPanel component
 */
const VisualizationPanel = ({
  selectedVariable,
  setSelectedVariable,
  exaggeration,
  setExaggeration,
  sections,
  setSections,
  displaySections,
  setDisplaySections,
  dimensions
}) => {
  const [currentNSSection, setCurrentNSSection] = useState(null);
  const [currentWESection, setCurrentWESection] = useState(null);

  useEffect(() => {
    if (displaySections && currentNSSection != null && currentWESection != null && sections && sections.length > 0) {
      console.log('VisualizationPanel: Updating sections, NS:', currentNSSection, 'WE:', currentWESection);
      // Create new array to ensure React detects the change
      let updatedSections = sections.map((section) => {
        const newSection = { ...section };
        if (section.label === `ns${currentNSSection}` || section.label === `we${currentWESection}`) {
          newSection.enabled = true;
        } else {
          newSection.enabled = false;
        }
        return newSection;
      });
      setSections(updatedSections);
    }
  }, [currentNSSection, currentWESection, displaySections]);

  useEffect(() => {
    if (dimensions && dimensions.length > 0) {
      setCurrentNSSection(Math.floor(dimensions[0] / 2));
      setCurrentWESection(Math.floor(dimensions[1] / 2));
    }
  }, [dimensions]);



  return (
    <Background title='Visualization' size='small'>
      <Title text='Variables' />
      <div className={styles.radioGroup}>
        {variables.map((variable, index) => (
          <label key={index} className={styles.radioLabel}>
            <input
              type="radio"
              name="variable"
              value={variable.name}
              checked={selectedVariable.name === variable.name}
              onChange={() => setSelectedVariable(variable)}
              className={styles.radio}
            />
            <span>{variable.name}</span>
          </label>
        ))}
      </div>

      <div className={styles.dynamicSections}>
          <label className={styles.switchLabel}>
            <span>Display sections</span>
            <input
              type="checkbox"
              checked={displaySections}
              onChange={(e) => setDisplaySections(e.target.checked)}
              className={styles.toggleSwitch}
            />
          </label>
          {displaySections && dimensions && dimensions.length > 0 && (
            <div className={styles.sections}>
              <img className={styles.surfaceGraphic} src='./assets/section-north-south.png' alt="N-S section" />
              <input
                type="range"
                className={styles.slider}
                min={1}
                max={dimensions[0]}
                step={1}
                value={currentNSSection || 1}
                onChange={(e) => setCurrentNSSection(Number(e.target.value))}
              />

              <img className={styles.surfaceGraphic} src='./assets/section-west-east.png' alt="W-E section" />
              <input
                type="range"
                className={styles.slider}
                min={1}
                max={dimensions[1]}
                step={1}
                value={currentWESection || 1}
                onChange={(e) => setCurrentWESection(Number(e.target.value))}
              />
            </div>
          )}
        </div>

      <div className='separator'></div>

      <label className={styles.label}>Vertical exaggeration</label>
      <div className={styles.slices}>
        <input
          type="range"
          className={styles.slider}
          min={1}
          max={5}
          step={1}
          value={exaggeration}
          onChange={(e) => setExaggeration(Number(e.target.value))}
        />
        <span className={styles.sliderValue}>{exaggeration}x</span>
      </div>
    </Background>
  );
};

VisualizationPanel.propTypes = {
  selectedVariable: PropTypes.object,
  setSelectedVariable: PropTypes.func,
  exaggeration: PropTypes.number,
  setExaggeration: PropTypes.func,
  sections: PropTypes.array,
  setSections: PropTypes.func,
  displaySections: PropTypes.bool,
  setDisplaySections: PropTypes.func,
  dimensions: PropTypes.array,
};

export default VisualizationPanel;
