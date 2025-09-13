import { useState } from 'react';
import { UIProvider } from '../UIContext.jsx';
import { Map, Title, MenuPanel, VisualizationPanel, VoxelLayer, Scale, Grid, Fault } from '../components';
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary';
import { variables } from '../config';
import * as styles from './App.module.css';

export const App = () => {
  const [selectedVariable, setSelectedVariable] = useState(variables[0]);
  const [selectedVisualization, setSelectedVisualization] = useState('volume');
  const [exaggeration, setExaggeration] = useState(15);
  const [legendInfo, setLegendInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [continuousVariable, setContinuousVariable] = useState(null);
  const [isosurfaceInfo, setIsosurfaceInfo] = useState(null);
  const [displayIsosurface, setDisplayIsosurface] = useState(false);
  const [isosurfaceValue, setIsosurfaceValue] = useState();
  const [displaySections, setDisplaySections] = useState(true);
  const [displaySlices, setDisplaySlices] = useState(false);
  const [slices, setSlices] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [enableGrid, setEnableGrid] = useState(true);
  const [displayLegend, setDisplayLegend] = useState(true);
  const [displayFault, setDisplayFault] = useState(true);
  return (
    <UIProvider>
      <ErrorBoundary>
        <Map>
          <VoxelLayer
            selectedVariable={selectedVariable}
            selectedVisualization={selectedVisualization}
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
            displaySlices={displaySlices}
            slices={slices}
            dimensions={dimensions}
            setDimensions={setDimensions}
            legendInfo={legendInfo}
            setLegendInfo={setLegendInfo}
          ></VoxelLayer>
          <Fault />
          <Scale exaggeration={exaggeration}></Scale>
          <Grid />
        </Map>
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
              selectedVisualization={selectedVisualization}
              setSelectedVisualization={setSelectedVisualization}
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
              displaySlices={displaySlices}
              setDisplaySlices={setDisplaySlices}
              setSlices={setSlices}
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
