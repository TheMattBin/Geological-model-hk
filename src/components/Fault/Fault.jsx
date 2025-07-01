import { useEffect, useState } from 'react';
import { useUIContext } from '../../UIContext';
import PropTypes from 'prop-types';

const FaultLayer = ({ mapView }) => {
  const { displayFault } = useUIContext();
  const [layer, setLayer] = useState(null);

  useEffect(() => {
    if (layer) {
      layer.visible = displayFault;
    }
  }, [layer, displayFault]);

  useEffect(() => {
    if (mapView) {
      const faultLayer = mapView.map.layers.getItemAt(2);
      setLayer(faultLayer);
    }
  }, [mapView]);

  return null;
};

FaultLayer.propTypes = {
  mapView: PropTypes.any,
};

export default FaultLayer;
