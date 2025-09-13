# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production (creates /dist folder)
```

## Project Architecture

This is a 3D geological visualization application for Hong Kong built with React and ArcGIS JS API. The project displays voxel layers representing geological data (lithology, permeability) in an interactive 3D environment.

### Key Technologies
- **Frontend**: React 18.2.0 with Vite 6.3.6
- **3D/Geospatial**: ArcGIS JS API 4.30.9 (@arcgis/core)
- **UI Components**: Esri Calcite Components React 0.34.0
- **State Management**: React Context API (UIContext)
- **Styling**: CSS modules with custom CSS variables

### Core Components Structure
- `App/App.jsx` - Main application container managing global state
- `components/Map/` - ArcGIS SceneView and WebScene integration
- `components/VoxelLayer/` - 3D voxel layer visualization controls
- `components/MenuPanel/` - Left sidebar with variable selection and controls
- `components/VisualizationPanel/` - Right sidebar with visualization settings
- `components/Legend/`, `components/Grid/`, `components/Fault/` - Map overlay components

### State Management Pattern
- **UIContext** (src/UIContext.js): Global state for UI toggles (grid, legend, fault display)
- **App-level state**: Complex state lifted to App component for cross-component communication
- **Prop drilling**: Used for map references and voxel layer interactions

### Configuration
- **src/config.js**: Contains web-scene-id and variable definitions
- Current web-scene-id: `cb511f5eba23446eb668a324e844ee80` (replace with your own voxel layer)
- Variables: Lithology (id: 0) and Permeability (id: 1, unit: "md")

### Vite Configuration
- **vite.config.js**: Uses `base: "./"` for proper relative paths in deployment
- React plugin enabled for JSX support

### Data Flow
1. Map component initializes ArcGIS SceneView from web scene
2. VoxelLayer component loads and configures voxel layer visualization
3. MenuPanel and VisualizationPanel controls update voxel layer properties
4. UIContext manages overlay visibility states across components

### Key Dependencies for Development
- `@arcgis/core`: Core geospatial functionality
- `@esri/calcite-components-react`: UI component library
- `@vitejs/plugin-react`: React support for Vite
- `react`, `react-dom`: Core React libraries

### Development Notes
- The application is designed to work with voxel layers uploaded to ArcGIS Online/Enterprise
- Replace the web-scene-id in config.js with your own voxel layer
- CSS modules are used for component-scoped styling
- The app supports both development (localhost:3000) and production deployment