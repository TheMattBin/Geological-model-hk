# HK Geological Model

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React Version](https://img.shields.io/badge/React-18.2.0-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.160-orange)

A sophisticated 3D web application showcasing Hong Kong's geological model using WebGL volume rendering. Built with React, Three.js, and modern web technologies.

## 🎯 Features

- **3D Geological Visualization**: Interactive 3D volume rendering of geological layers
- **Multiple Variables**: Support for lithology (discrete) and permeability (continuous) data
- **Advanced Rendering Modes**: Volume rendering, isosurfaces, and cross-sections
- **Interactive Controls**: Real-time manipulation of visualization parameters
- **Responsive Design**: Optimized for desktop viewing
- **No External Dependencies**: Pure WebGL rendering via Three.js (no ArcGIS required)

## 🛠️ Technology Stack

- **Frontend**: React 18.2.0 with Vite 6.x
- **3D Visualization**: Three.js 0.160.0 with WebGL2
- **Volume Rendering**: Custom GLSL ray marching shaders
- **State Management**: React Context API
- **Styling**: CSS Modules with custom themes
- **Deployment**: GitHub Pages, Docker support

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Python 3.x (for data conversion, optional)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/TheMattBin/Geological-model-hk.git
cd Geological-model-hk
```

2. **Install dependencies**

```bash
npm install
```

3. **Start development server**

```bash
npm run dev
```

4. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start development server on localhost:3000 |
| `npm run build` | Build for production (creates `/dist` folder) |
| `npm run preview` | Preview production build locally |
| `npm run convert-sample` | Generate sample voxel data |

## 📊 Data Format

The application uses a custom binary voxel format:

### Directory Structure
```
public/data/
├── metadata.json      # Volume dimensions, variables, colormaps
├── lithology.raw      # Uint8 binary voxel data
└── permeability.raw   # Uint8 binary voxel data
```

### Converting Your Own Data

Use the included Python script to convert NetCDF data:

```bash
# Generate sample data  
npm run convert-sample

# Convert your own NetCDF file
python scripts/convert_netcdf.py your_data.nc --output-dir ./public/data
```

### metadata.json Format
```json
{
  "dimensions": { "x": 64, "y": 64, "z": 32 },
  "bounds": {
    "x": { "min": 0, "max": 64 },
    "y": { "min": 0, "max": 64 },
    "z": { "min": 0, "max": 32 }
  },
  "variables": [
    {
      "id": 0,
      "name": "Lithology",
      "type": "discrete",
      "file": "lithology.raw",
      "colormap": [...]
    }
  ]
}
```

## 🐳 Docker Deployment

### Build and Run Locally

```bash
# Build the Docker image
docker build -t geological-model .

# Run the container
docker run --name geological-model -p 3000:3000 -d geological-model
```

### Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deployment Options

### GitHub Pages (Recommended)

The application is automatically deployed to GitHub Pages via GitHub Actions when pushing to the main branch.

### Manual Deployment

```bash
# Build the application
npm run build

# The built files are in the /dist directory
# Deploy these files to your web server
```

## 🗂️ Project Structure

```
/
├── src/
│   ├── App/                    # Main application component
│   ├── three/                  # Three.js volume rendering
│   │   ├── VolumeRenderer.ts  # Main renderer class
│   │   ├── shaders.ts         # GLSL ray marching shaders
│   │   ├── dataLoader.ts      # Binary data loading
│   │   └── types.ts           # TypeScript definitions
│   ├── components/             # React UI components
│   │   ├── Scene3D/           # Three.js scene wrapper
│   │   ├── MenuPanel/         # Left sidebar controls
│   │   ├── VisualizationPanel/ # Right panel settings
│   │   ├── VolumeController/  # Renderer state bridge
│   │   └── ...                # Other components
│   ├── config.js              # Application configuration
│   ├── UIContext.jsx          # Global state management
│   └── main.jsx               # React entry point
├── public/data/               # Voxel data files
├── scripts/                   # Data conversion scripts
├── .github/workflows/         # CI/CD pipelines
├── Dockerfile                 # Docker configuration
└── README.md                  # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Using Your Own Data

To visualize your own geological model:

1. **Prepare your data** as a NetCDF file or create raw binary voxel files
2. **Convert to binary format** using the provided conversion script
3. **Update metadata.json** with your dimensions, bounds, and colormap
4. **Configure variables** in `src/config.js`

## 🎨 Customization

### Styling

The application uses CSS Modules for component-scoped styling. Customize:

- `src/main.css` - Global styles and theme variables
- `src/components/*/ComponentName.module.css` - Component-specific styles

### Configuration

- `src/config.js` - Variable definitions and display options
- `vite.config.js` - Build configuration

### Shaders

- `src/three/shaders.ts` - GLSL ray marching and transfer function logic

## 🔒 Security

- Regular security audits via `npm audit`
- Automated dependency updates
- No hardcoded secrets or API keys
- Content Security Policy compliant

## 📊 Performance

- WebGL2 3D textures for efficient volume sampling
- Front-to-back ray marching with early termination
- React.memo optimizations for component rendering
- Optimized bundle size with Vite

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 🙏 Acknowledgments

- **Dataset Source**: [Geotechnical Engineering Office (GEO)](https://www.cedd.gov.hk/eng/)
- **Academic Partner**: [Hong Kong University of Science and Technology](https://hkust.edu.hk/)
- **Technologies**: [Three.js](https://threejs.org/), [React](https://reactjs.org/), [Vite](https://vitejs.dev/)

## 📞 Support

If you have any questions or issues, please:

1. Check the [Issues](https://github.com/TheMattBin/Geological-model-hk/issues) page
2. Create a new issue if needed
3. Provide detailed information about your problem

---

**Built with ❤️ for geological visualization and research**

**Built with ❤️ for geological visualization and research**