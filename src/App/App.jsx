import { useState } from 'react';
import { UIProvider } from '../UIContext.jsx';
import Scene3D from '../components/Scene3D/Scene3D';
import Title from '../components/Title/Title';
import MenuPanel from '../components/MenuPanel/MenuPanel';
import VisualizationPanel from '../components/VisualizationPanel/VisualizationPanel';
import VolumeController from '../components/VolumeController/VolumeController';
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary';
import { variables } from '../config';
import * as styles from './App.module.css';

/**
 * App component using Three.js for volume rendering
 */
export const App = () => {
  const [selectedVariable, setSelectedVariable] = useState(variables[0]);
  const [exaggeration, setExaggeration] = useState(15);
  const [legendInfo, setLegendInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [continuousVariable, setContinuousVariable] = useState(null);
  const [isosurfaceInfo, setIsosurfaceInfo] = useState(null);
  const [displayIsosurface, setDisplayIsosurface] = useState(false);
  const [isosurfaceValue, setIsosurfaceValue] = useState();
  const [displaySections, setDisplaySections] = useState(true);
  const [dimensions, setDimensions] = useState([]);

  return (
    <UIProvider>
      <ErrorBoundary>
        <Scene3D dataPath="./data">
          <VolumeController
            selectedVariable={selectedVariable}
            exaggeration={exaggeration}
            continuousVariable={continuousVariable}
            setContinuousVariable={setContinuousVariable}
            isosurfaceInfo={isosurfaceInfo}
            setIsosurfaceInfo={setIsosurfaceInfo}
            isosurfaceValue={isosurfaceValue}
            setIsosurfaceValue={setIsosurfaceValue}
            displayIsosurface={displayIsosurface}
            sections={sections}
            setSections={setSections}
            displaySections={displaySections}
            dimensions={dimensions}
            setDimensions={setDimensions}
            legendInfo={legendInfo}
            setLegendInfo={setLegendInfo}
          />
        </Scene3D>
      </ErrorBoundary>
      <div className={styles.appLayout}>
        <header className={styles.appTitle}>
          <Title text='Hong Kong Geological Model' size='large'></Title>
        </header>
        <div className={styles.appContent}>
          <div className={styles.leftPane}>
            <ErrorBoundary>
              <MenuPanel legendInfo={legendInfo} setLegendInfo={setLegendInfo} />
            </ErrorBoundary>
          </div>
          <div className={styles.rightPane}>
            <ErrorBoundary>
              <VisualizationPanel
                selectedVariable={selectedVariable}
                setSelectedVariable={setSelectedVariable}
                exaggeration={exaggeration}
                setExaggeration={setExaggeration}
                continuousVariable={continuousVariable}
                isosurfaceInfo={isosurfaceInfo}
                displayIsosurface={displayIsosurface}
                setDisplayIsosurface={setDisplayIsosurface}
                isosurfaceValue={isosurfaceValue}
                setIsosurfaceValue={setIsosurfaceValue}
                sections={sections}
                setSections={setSections}
                displaySections={displaySections}
                setDisplaySections={setDisplaySections}
                dimensions={dimensions}
              />
            </ErrorBoundary>
          </div>
        </div>
        <footer className={styles.appFooter}>
          <p>
            Dataset from{' '}
            <a href='https://www.cedd.gov.hk/eng/' target='_blank'>
              Geotechnical Engineering Office (GEO)
            </a>{' '}
            and{' '}
            <a href='https://hkust.edu.hk/' target='_blank'>
              Hong Kong University of Science and Technology
            </a>
            .
          </p>
          <p className={styles.Logo}>
            <a href='https://github.com/TheMattBin' target='_blank'>
              <img src='./assets/github_logo.png'></img>
            </a>
          </p>
        </footer>
      </div>
    </UIProvider>
  );
};

export default App;
