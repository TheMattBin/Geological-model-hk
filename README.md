# HK Geological Model

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React Version](https://img.shields.io/badge/React-18.2.0-blue)
![ArcGIS JS API](https://img.shields.io/badge/ArcGIS%20JS%20API-4.30.9-orange)

A sophisticated 3D web application showcasing Hong Kong's geological model using advanced voxel layer visualization. Built with React, ArcGIS JS API, and modern web technologies.

## 🎯 Features

- **3D Geological Visualization**: Interactive 3D rendering of Hong Kong's geological layers
- **Multiple Variables**: Support for lithology and permeability data visualization
- **Advanced Rendering Modes**: Volume rendering, isosurfaces, sections, and slices
- **Interactive Controls**: Real-time manipulation of visualization parameters
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Performance Optimized**: Built with React.memo and modern optimization techniques

## 🛠️ Technology Stack

- **Frontend**: React 18.2.0 with Vite 6.3.6
- **3D Visualization**: ArcGIS JS API 4.30.9
- **UI Components**: Esri Calcite Components React 0.34.0
- **State Management**: React Context API
- **Styling**: CSS Modules with custom themes
- **Deployment**: GitHub Pages, Docker support

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

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
| `npm audit` | Check for security vulnerabilities |
| `npm outdated` | Check for outdated dependencies |

## 🔧 Configuration

### Custom Voxel Layer

To use your own geological model, update the configuration in `src/config.js`:

```javascript
export const mapConfig = {
  // Replace with your own voxel layer ID
  "web-scene-id": "your-voxel-layer-id-here",
};

export const variables = [
  {
    name: "Your Variable Name",
    id: 0,
    unit: "your-unit"
  }
];
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
│   ├── components/             # Reusable UI components
│   │   ├── Map/               # ArcGIS Map integration
│   │   ├── VoxelLayer/        # 3D voxel layer visualization
│   │   ├── MenuPanel/         # Left sidebar controls
│   │   ├── VisualizationPanel/ # Right panel settings
│   │   ├── ErrorBoundary/     # Error handling components
│   │   └── ...                # Other components
│   ├── config.js              # Application configuration
│   ├── UIContext.jsx          # Global state management
│   └── main.jsx               # React entry point
├── public/                    # Static assets
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

## 📋 Requirements for Your Own Voxel Layer

To use this application with your own geological model, you'll need:

1. **ArcGIS Online/Enterprise Account**
2. **Voxel Layer** published to ArcGIS Online or Enterprise
3. **Web Scene** containing your voxel layer
4. **Layer Variables** properly configured in your voxel layer

## 🎨 Customization

### Styling

The application uses CSS Modules for component-scoped styling. Customize:

- `src/main.css` - Global styles and theme variables
- `src/components/*/ componentName.module.css` - Component-specific styles

### Configuration

- `src/config.js` - Map configuration and variables
- `vite.config.js` - Build configuration

## 🔒 Security

- Regular security audits via `npm audit`
- Automated dependency updates
- No hardcoded secrets or API keys
- Content Security Policy compliant

## 📊 Performance

- React.memo optimizations for component rendering
- Lazy loading of ArcGIS components
- Efficient state management with React Context
- Optimized bundle size with Vite

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 🙏 Acknowledgments

- **Dataset Source**: [Geotechnical Engineering Office (GEO)](https://www.cedd.gov.hk/eng/)
- **Academic Partner**: [Hong Kong University of Science and Technology](https://hkust.edu.hk/)
- **Technologies**: [Esri ArcGIS](https://www.esri.com/en-us/arcgis/products/arcgis-js-api/overview), [React](https://reactjs.org/), [Vite](https://vitejs.dev/)

## 📞 Support

If you have any questions or issues, please:

1. Check the [Issues](https://github.com/TheMattBin/Geological-model-hk/issues) page
2. Create a new issue if needed
3. Provide detailed information about your problem

---

**Built with ❤️ for geological visualization and research**