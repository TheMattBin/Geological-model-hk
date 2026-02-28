#!/usr/bin/env python3
"""
NetCDF to Web-friendly Binary Converter for Geological Voxel Data

Converts NetCDF voxel data to binary format (.raw) with JSON metadata
for use with Three.js 3D textures.

Usage:
    python convert_netcdf.py input.nc --output-dir ./public/data

Output:
    - lithology.raw: Binary uint8 array of lithology values
    - permeability.raw: Binary float32 array of permeability values  
    - metadata.json: Volume dimensions, bounds, and color mapping
"""

import argparse
import json
import os
import struct
from pathlib import Path

import numpy as np

# netCDF4 is only required for actual conversion, not sample generation
try:
    import netCDF4 as nc
    HAS_NETCDF = True
except ImportError:
    HAS_NETCDF = False


def load_netcdf(filepath: str) -> dict:
    """Load NetCDF file and extract voxel data."""
    if not HAS_NETCDF:
        raise ImportError("netCDF4 not installed. Install with: pip install netCDF4")
    
    dataset = nc.Dataset(filepath, 'r')
    
    print(f"NetCDF file: {filepath}")
    print(f"Dimensions: {list(dataset.dimensions.keys())}")
    print(f"Variables: {list(dataset.variables.keys())}")
    
    result = {
        'dimensions': {},
        'variables': {},
        'bounds': {},
    }
    
    # Extract dimensions
    for dim_name, dim in dataset.dimensions.items():
        result['dimensions'][dim_name] = len(dim)
        print(f"  {dim_name}: {len(dim)}")
    
    # Try to find coordinate variables for bounds
    coord_names = ['x', 'y', 'z', 'lon', 'lat', 'depth', 'easting', 'northing', 'elevation']
    for name in coord_names:
        if name in dataset.variables:
            var = dataset.variables[name][:]
            result['bounds'][name] = {
                'min': float(np.min(var)),
                'max': float(np.max(var)),
            }
    
    # Extract main data variables
    # Common variable names for geological data
    data_var_names = ['lithology', 'lith', 'rock_type', 'permeability', 'perm', 'porosity', 'density']
    
    for var_name in dataset.variables:
        var = dataset.variables[var_name]
        # Skip coordinate variables (1D)
        if len(var.shape) >= 3:
            print(f"  Found 3D variable: {var_name} with shape {var.shape}")
            data = var[:]
            
            # Handle masked arrays
            if isinstance(data, np.ma.MaskedArray):
                data = data.filled(0)
            
            result['variables'][var_name] = {
                'data': np.array(data),
                'shape': var.shape,
                'dtype': str(var.dtype),
                'units': getattr(var, 'units', None),
                'long_name': getattr(var, 'long_name', var_name),
            }
    
    dataset.close()
    return result


def normalize_to_uint8(data: np.ndarray) -> tuple[np.ndarray, float, float]:
    """Normalize continuous data to uint8 range [0, 255]."""
    min_val = float(np.min(data))
    max_val = float(np.max(data))
    
    if max_val - min_val < 1e-10:
        return np.zeros(data.shape, dtype=np.uint8), min_val, max_val
    
    normalized = (data - min_val) / (max_val - min_val) * 255
    return normalized.astype(np.uint8), min_val, max_val


def generate_lithology_colormap(num_classes: int) -> list[dict]:
    """Generate default colormap for lithology (discrete) values."""
    # Default geological colors
    default_colors = [
        {"label": "Clay", "color": [139, 90, 43, 255]},      # Brown
        {"label": "Sand", "color": [255, 223, 128, 255]},     # Yellow
        {"label": "Gravel", "color": [169, 169, 169, 255]},   # Gray
        {"label": "Silt", "color": [194, 178, 128, 255]},     # Tan
        {"label": "Rock", "color": [105, 105, 105, 255]},     # Dark gray
        {"label": "Limestone", "color": [230, 230, 250, 255]}, # Lavender
        {"label": "Granite", "color": [255, 182, 193, 255]},  # Pink
        {"label": "Sandstone", "color": [244, 164, 96, 255]}, # Sandy brown
        {"label": "Shale", "color": [112, 128, 144, 255]},    # Slate gray
        {"label": "Basite", "color": [47, 79, 79, 255]},      # Dark slate
    ]
    
    colormap = []
    for i in range(num_classes):
        if i < len(default_colors):
            entry = default_colors[i].copy()
        else:
            # Generate random color for additional classes
            np.random.seed(i)
            entry = {
                "label": f"Class {i}",
                "color": [int(np.random.randint(50, 255)) for _ in range(3)] + [255]
            }
        entry["value"] = i
        colormap.append(entry)
    
    return colormap


def generate_continuous_colormap() -> list[dict]:
    """Generate colormap for continuous data (e.g., permeability)."""
    # Blue to red gradient (common for permeability)
    return [
        {"position": 0.0, "color": [0, 0, 128, 255]},      # Dark blue (low)
        {"position": 0.25, "color": [0, 128, 255, 255]},   # Light blue
        {"position": 0.5, "color": [0, 255, 128, 255]},    # Green
        {"position": 0.75, "color": [255, 255, 0, 255]},   # Yellow
        {"position": 1.0, "color": [255, 0, 0, 255]},      # Red (high)
    ]


def save_binary(data: np.ndarray, filepath: str, dtype: str = 'uint8'):
    """Save numpy array as binary file."""
    if dtype == 'uint8':
        data = data.astype(np.uint8)
    elif dtype == 'float32':
        data = data.astype(np.float32)
    
    # Ensure C-contiguous array order (Z, Y, X for 3D textures)
    data = np.ascontiguousarray(data)
    
    with open(filepath, 'wb') as f:
        f.write(data.tobytes())
    
    print(f"Saved: {filepath} ({os.path.getsize(filepath) / 1024 / 1024:.2f} MB)")


def convert_netcdf(input_path: str, output_dir: str, lithology_var: str = None, permeability_var: str = None):
    """Main conversion function."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Load NetCDF data
    data = load_netcdf(input_path)
    
    if not data['variables']:
        print("Error: No 3D variables found in NetCDF file")
        return
    
    # Auto-detect variable names if not provided
    var_names = list(data['variables'].keys())
    
    if lithology_var is None:
        for name in ['lithology', 'lith', 'rock_type', 'class']:
            if name in var_names:
                lithology_var = name
                break
        if lithology_var is None and len(var_names) > 0:
            lithology_var = var_names[0]
    
    if permeability_var is None:
        for name in ['permeability', 'perm', 'k', 'conductivity']:
            if name in var_names:
                permeability_var = name
                break
        if permeability_var is None and len(var_names) > 1:
            permeability_var = var_names[1]
    
    metadata = {
        'dimensions': {},
        'bounds': data['bounds'],
        'variables': [],
    }
    
    # Process lithology (discrete)
    if lithology_var and lithology_var in data['variables']:
        var_data = data['variables'][lithology_var]
        lith_data = var_data['data']
        
        # Get dimensions in Z, Y, X order
        shape = lith_data.shape
        metadata['dimensions'] = {
            'z': int(shape[0]),
            'y': int(shape[1]),
            'x': int(shape[2]),
        }
        
        # Convert to uint8 (assuming lithology is already integer class indices)
        if not np.issubdtype(lith_data.dtype, np.integer):
            lith_data = lith_data.astype(np.int32)
        
        unique_values = np.unique(lith_data)
        num_classes = len(unique_values)
        
        # Map to consecutive indices if needed
        if np.min(unique_values) != 0 or np.max(unique_values) != num_classes - 1:
            mapping = {v: i for i, v in enumerate(unique_values)}
            lith_data = np.vectorize(mapping.get)(lith_data)
        
        save_binary(lith_data, output_path / 'lithology.raw', 'uint8')
        
        metadata['variables'].append({
            'id': 0,
            'name': 'Lithology',
            'file': 'lithology.raw',
            'dtype': 'uint8',
            'type': 'discrete',
            'numClasses': int(num_classes),
            'colormap': generate_lithology_colormap(num_classes),
        })
        print(f"Processed lithology: {num_classes} classes")
    
    # Process permeability (continuous)
    if permeability_var and permeability_var in data['variables']:
        var_data = data['variables'][permeability_var]
        perm_data = var_data['data'].astype(np.float32)
        
        # Update dimensions if not set
        if not metadata['dimensions']:
            shape = perm_data.shape
            metadata['dimensions'] = {
                'z': int(shape[0]),
                'y': int(shape[1]),
                'x': int(shape[2]),
            }
        
        # Normalize to uint8 for texture
        perm_normalized, min_val, max_val = normalize_to_uint8(perm_data)
        save_binary(perm_normalized, output_path / 'permeability.raw', 'uint8')
        
        metadata['variables'].append({
            'id': 1,
            'name': 'Permeability',
            'file': 'permeability.raw',
            'dtype': 'uint8',
            'type': 'continuous',
            'unit': var_data.get('units', 'md'),
            'range': {'min': min_val, 'max': max_val},
            'colormap': generate_continuous_colormap(),
        })
        print(f"Processed permeability: range [{min_val:.4f}, {max_val:.4f}]")
    
    # Save metadata
    metadata_path = output_path / 'metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved: {metadata_path}")
    
    print("\nConversion complete!")
    print(f"Volume dimensions: {metadata['dimensions']}")


def create_sample_data(output_dir: str):
    """Create sample voxel data for testing (when no NetCDF is available)."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create sample volume: 64x64x32 voxels
    dim_x, dim_y, dim_z = 64, 64, 32
    
    print(f"Creating sample data: {dim_x}x{dim_y}x{dim_z} voxels")
    
    # Sample lithology: layered geological structure
    lithology = np.zeros((dim_z, dim_y, dim_x), dtype=np.uint8)
    
    # Create horizontal layers with some variation
    for z in range(dim_z):
        base_layer = z // 8  # 4 main layers
        # Add some noise/variation
        noise = np.random.rand(dim_y, dim_x) * 0.3
        layer_data = np.clip(base_layer + noise, 0, 3).astype(np.uint8)
        lithology[z] = layer_data
    
    # Add a "fault" diagonal structure
    for z in range(dim_z):
        for y in range(dim_y):
            fault_x = int(dim_x // 2 + (z - dim_z // 2) * 0.5)
            if 0 <= fault_x < dim_x:
                lithology[z, y, max(0, fault_x-2):min(dim_x, fault_x+2)] = 4
    
    save_binary(lithology, output_path / 'lithology.raw', 'uint8')
    
    # Sample permeability: gradient with some noise
    x = np.linspace(0, 1, dim_x)
    y = np.linspace(0, 1, dim_y)
    z = np.linspace(0, 1, dim_z)
    
    xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
    xx, yy, zz = xx.T, yy.T, zz.T  # Transpose to (Z, Y, X) order
    
    permeability = (np.sin(xx * np.pi * 2) * np.cos(yy * np.pi) + zz) / 2
    permeability += np.random.rand(dim_z, dim_y, dim_x) * 0.2
    permeability = np.clip(permeability, 0, 1)
    
    perm_uint8 = (permeability * 255).astype(np.uint8)
    save_binary(perm_uint8, output_path / 'permeability.raw', 'uint8')
    
    # Create metadata
    metadata = {
        'dimensions': {'x': dim_x, 'y': dim_y, 'z': dim_z},
        'bounds': {
            'x': {'min': 0, 'max': 1000},
            'y': {'min': 0, 'max': 1000},
            'z': {'min': -500, 'max': 0},
        },
        'variables': [
            {
                'id': 0,
                'name': 'Lithology',
                'file': 'lithology.raw',
                'dtype': 'uint8',
                'type': 'discrete',
                'numClasses': 5,
                'colormap': [
                    {'value': 0, 'label': 'Clay', 'color': [139, 90, 43, 255]},
                    {'value': 1, 'label': 'Sand', 'color': [255, 223, 128, 255]},
                    {'value': 2, 'label': 'Gravel', 'color': [169, 169, 169, 255]},
                    {'value': 3, 'label': 'Silt', 'color': [194, 178, 128, 255]},
                    {'value': 4, 'label': 'Fault', 'color': [255, 0, 0, 255]},
                ]
            },
            {
                'id': 1,
                'name': 'Permeability',
                'file': 'permeability.raw',
                'dtype': 'uint8',
                'type': 'continuous',
                'unit': 'md',
                'range': {'min': 0, 'max': 1},
                'colormap': [
                    {'position': 0.0, 'color': [0, 0, 128, 255]},
                    {'position': 0.25, 'color': [0, 128, 255, 255]},
                    {'position': 0.5, 'color': [0, 255, 128, 255]},
                    {'position': 0.75, 'color': [255, 255, 0, 255]},
                    {'position': 1.0, 'color': [255, 0, 0, 255]},
                ]
            }
        ]
    }
    
    with open(output_path / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Sample data created in {output_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert NetCDF voxel data to web-friendly format')
    parser.add_argument('input', nargs='?', help='Input NetCDF file path')
    parser.add_argument('--output-dir', '-o', default='./public/data', help='Output directory')
    parser.add_argument('--lithology-var', help='Name of lithology variable in NetCDF')
    parser.add_argument('--permeability-var', help='Name of permeability variable in NetCDF')
    parser.add_argument('--sample', action='store_true', help='Generate sample test data')
    
    args = parser.parse_args()
    
    if args.sample:
        create_sample_data(args.output_dir)
    elif args.input:
        convert_netcdf(args.input, args.output_dir, args.lithology_var, args.permeability_var)
    else:
        print("Usage: python convert_netcdf.py <input.nc> --output-dir ./public/data")
        print("   or: python convert_netcdf.py --sample --output-dir ./public/data")
