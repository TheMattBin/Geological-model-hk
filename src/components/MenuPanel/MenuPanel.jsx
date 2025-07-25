import { Background, Legend } from '../index';
import * as styles from './MenuPanel.module.css';
import '@esri/calcite-components/dist/components/calcite-label';
import '@esri/calcite-components/dist/components/calcite-switch';
import { CalciteLabel, CalciteSwitch } from '@esri/calcite-components-react';
import { useUIContext } from '../../UIContext';
import PropTypes from 'prop-types';

const Menu = ({ legendInfo, setLegendInfo }) => {
  const {
    enableGrid,
    setEnableGrid,
    displayLegend,
    setDisplayLegend,
    displayFault,
    setDisplayFault
  } = useUIContext();

  return (
    <Background title='' size='small'>
      <div className={styles.variableInfo}>
        <CalciteLabel
          className={styles.label}
          layout='inline-space-between'
          onCalciteSwitchChange={(event) => {
            setDisplayLegend(event.target.checked);
          }}
        >
          Display legend
          <CalciteSwitch scale='m' checked={displayLegend ? true : undefined}></CalciteSwitch>
        </CalciteLabel>
        {displayLegend ? <Legend legendInfo={legendInfo} setLegendInfo={setLegendInfo}></Legend> : <></>}
      </div>
      <div className={styles.layerVisibility}>
        <CalciteLabel
          className={styles.label}
          layout='inline-space-between'
          onCalciteSwitchChange={(event) => {
            setEnableGrid(event.target.checked);
          }}
        >
          Display grid
          <CalciteSwitch scale='m' checked={enableGrid ? true : undefined}></CalciteSwitch>
        </CalciteLabel>
      </div>
      <div className={styles.layerVisibility}>
        <CalciteLabel
          className={styles.label}
          layout='inline-space-between'
          onCalciteSwitchChange={(event) => {
            setDisplayFault(event.target.checked);
          }}
        >
          Display fault
          <CalciteSwitch scale='m' checked={displayFault ? true : undefined}></CalciteSwitch>
        </CalciteLabel>
      </div>
      <div className='separator'></div>
      <div className={styles.overviewMap}>
        <div>Geological model displaying soil lithology in Hong Kong.</div>
        <div>
          <img src='./assets/hk-overview.png'></img>
        </div>
      </div>
    </Background>
  );
};

Menu.propTypes = {
  legendInfo: PropTypes.any,
  setLegendInfo: PropTypes.func,
};

export default Menu;
