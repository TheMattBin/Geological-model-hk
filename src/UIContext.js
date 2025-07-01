import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [enableGrid, setEnableGrid] = useState(true);
  const [displayLegend, setDisplayLegend] = useState(true);
  const [displayFault, setDisplayFault] = useState(true);

  return (
    <UIContext.Provider value={{
      enableGrid,
      setEnableGrid,
      displayLegend,
      setDisplayLegend,
      displayFault,
      setDisplayFault
    }}>
      {children}
    </UIContext.Provider>
  );
};

UIProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useUIContext = () => useContext(UIContext);
