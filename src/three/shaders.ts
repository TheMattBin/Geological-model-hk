/**
 * GLSL Shaders for volumetric rendering using ray marching
 * 
 * These shaders implement direct volume rendering with:
 * - Ray marching through a 3D texture
 * - Transfer function for color mapping
 * - Support for both discrete and continuous data
 * - Clipping planes for slices and sections
 * - Alpha compositing for transparency
 */

// Simple debug shader that always shows something
export const debugVertexShader = /* glsl */ `
precision highp float;
in vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out vec3 vPosition;

void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const debugFragmentShader = /* glsl */ `
precision highp float;
in vec3 vPosition;
out vec4 fragColor;

void main() {
    // Color based on position to show 3D structure
    vec3 color = vPosition * 0.5 + 0.5;
    fragColor = vec4(color, 0.8);
}
`;

export const volumeVertexShader = /* glsl */ `
precision highp float;
precision highp sampler3D;

// Three.js built-in attributes (required for RawShaderMaterial)
in vec3 position;

// Varyings
out vec3 vOrigin;
out vec3 vDirection;

// Three.js built-in uniforms (required for RawShaderMaterial)
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPos;

void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Ray origin in model space (camera position transformed to model space)
    vOrigin = cameraPos;
    
    // Ray direction from camera through vertex (in model space)
    vDirection = position - cameraPos;
}
`;

export const volumeFragmentShader = /* glsl */ `
precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 fragColor;

// Volume data texture
uniform sampler3D uVolumeData;

// Transfer function (1D texture or direct colors)
uniform sampler2D uTransferFunction;
uniform bool uDiscreteMode;
uniform int uNumClasses;

// Volume dimensions and bounds
uniform vec3 uVolumeDimensions;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;

// Rendering parameters
uniform int uSteps;
uniform float uAlphaScale;
uniform float uBrightness;

// Clipping planes for slices
uniform bool uSliceXEnabled;
uniform float uSliceXMin;
uniform float uSliceXMax;

uniform bool uSliceYEnabled;
uniform float uSliceYMin;
uniform float uSliceYMax;

uniform bool uSliceZEnabled;
uniform float uSliceZMin;
uniform float uSliceZMax;

// Section planes
uniform bool uSectionNSEnabled;
uniform float uSectionNSPosition;

uniform bool uSectionWEEnabled;
uniform float uSectionWEPosition;

// Isosurface
uniform bool uIsosurfaceEnabled;
uniform float uIsosurfaceValue;
uniform vec3 uIsosurfaceColor;
uniform float uIsosurfaceOpacity;

// Vertical exaggeration
uniform float uVerticalExaggeration;

// Ray-box intersection
vec2 intersectBox(vec3 origin, vec3 dir, vec3 boxMin, vec3 boxMax) {
    vec3 invDir = 1.0 / dir;
    vec3 t1 = (boxMin - origin) * invDir;
    vec3 t2 = (boxMax - origin) * invDir;
    vec3 tMin = min(t1, t2);
    vec3 tMax = max(t1, t2);
    float tNear = max(max(tMin.x, tMin.y), tMin.z);
    float tFar = min(min(tMax.x, tMax.y), tMax.z);
    return vec2(tNear, tFar);
}

// Check if point is within slice bounds
bool isWithinSlices(vec3 pos) {
    // Normalize position to 0-1 range
    vec3 normPos = (pos - uBoundsMin) / (uBoundsMax - uBoundsMin);
    
    if (uSliceXEnabled && (normPos.x < uSliceXMin || normPos.x > uSliceXMax)) {
        return false;
    }
    if (uSliceYEnabled && (normPos.y < uSliceYMin || normPos.y > uSliceYMax)) {
        return false;
    }
    if (uSliceZEnabled && (normPos.z < uSliceZMin || normPos.z > uSliceZMax)) {
        return false;
    }
    
    // Section cuts
    if (uSectionNSEnabled && normPos.y > uSectionNSPosition) {
        return false;
    }
    if (uSectionWEEnabled && normPos.x > uSectionWEPosition) {
        return false;
    }
    
    return true;
}

// Sample raw value from volume (for isosurface)
float sampleVolumeValue(vec3 pos) {
    vec3 texCoord = (pos - uBoundsMin) / (uBoundsMax - uBoundsMin);
    texCoord = clamp(texCoord, 0.001, 0.999);
    return texture(uVolumeData, texCoord).r;
}

// Compute gradient for lighting (central differences)
vec3 computeGradient(vec3 pos, float step) {
    float dx = sampleVolumeValue(pos + vec3(step, 0.0, 0.0)) - sampleVolumeValue(pos - vec3(step, 0.0, 0.0));
    float dy = sampleVolumeValue(pos + vec3(0.0, step, 0.0)) - sampleVolumeValue(pos - vec3(0.0, step, 0.0));
    float dz = sampleVolumeValue(pos + vec3(0.0, 0.0, step)) - sampleVolumeValue(pos - vec3(0.0, 0.0, step));
    return normalize(vec3(dx, dy, dz));
}

// Sample the volume and apply transfer function
vec4 sampleVolume(vec3 pos) {
    // Convert world position to texture coordinates
    vec3 texCoord = (pos - uBoundsMin) / (uBoundsMax - uBoundsMin);
    
    // Clamp to valid range
    texCoord = clamp(texCoord, 0.001, 0.999);
    
    // Sample the 3D texture
    float value = texture(uVolumeData, texCoord).r;
    
    if (uDiscreteMode) {
        // Discrete mode: value is class index (0-255 mapped to 0-1)
        int classIndex = int(value * 255.0 + 0.5);
        if (classIndex >= uNumClasses) {
            return vec4(0.0);
        }
        // Sample transfer function at class position
        float u = (float(classIndex) + 0.5) / float(uNumClasses);
        vec4 color = texture(uTransferFunction, vec2(u, 0.5));
        return color;
    } else {
        // Continuous mode: interpolate transfer function
        // value is already 0-1 from uint8 normalization
        vec4 color = texture(uTransferFunction, vec2(value, 0.5));
        return color;
    }
}

void main() {
    // Ray direction (normalized)
    vec3 rayDir = normalize(vDirection);
    
    // Find intersection with volume bounding box
    vec2 bounds = intersectBox(vOrigin, rayDir, uBoundsMin, uBoundsMax);
    
    if (bounds.x > bounds.y || bounds.y < 0.0) {
        // Ray misses the volume
        fragColor = vec4(0.0);
        return;
    }
    
    // Clamp to positive range
    bounds.x = max(bounds.x, 0.0);
    
    // Ray marching parameters
    float stepSize = (bounds.y - bounds.x) / float(uSteps);
    vec3 rayStep = rayDir * stepSize;
    
    // Starting position
    vec3 pos = vOrigin + rayDir * bounds.x;
    
    // Accumulated color
    vec4 accumulatedColor = vec4(0.0);
    
    // For isosurface detection
    float prevValue = -1.0;
    bool isosurfaceHit = false;
    
    // Ray marching loop
    for (int i = 0; i < uSteps; i++) {
        // Check if within slice bounds
        if (isWithinSlices(pos)) {
            // Sample raw value for isosurface detection
            float currentValue = sampleVolumeValue(pos);
            
            // Isosurface detection (only for continuous data, when enabled)
            if (uIsosurfaceEnabled && !uDiscreteMode && !isosurfaceHit && prevValue >= 0.0) {
                // Check if we crossed the isosurface threshold
                float threshold = uIsosurfaceValue;
                if ((prevValue < threshold && currentValue >= threshold) ||
                    (prevValue >= threshold && currentValue < threshold)) {
                    // Found isosurface crossing - compute shading
                    vec3 normal = computeGradient(pos, stepSize * 0.5);
                    
                    // Simple diffuse lighting
                    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                    float diffuse = max(dot(normal, lightDir), 0.0);
                    float ambient = 0.3;
                    float lighting = ambient + (1.0 - ambient) * diffuse;
                    
                    vec4 isoColor = vec4(uIsosurfaceColor * lighting, uIsosurfaceOpacity);
                    
                    // Composite isosurface
                    isoColor.rgb *= isoColor.a;
                    accumulatedColor = accumulatedColor + isoColor * (1.0 - accumulatedColor.a);
                    isosurfaceHit = true;
                }
            }
            prevValue = currentValue;
            
            // Regular volume rendering (skip if only showing isosurface)
            if (!uIsosurfaceEnabled || uDiscreteMode) {
                // Sample volume at current position
                vec4 sampleColor = sampleVolume(pos);
                
                // Apply alpha scaling
                sampleColor.a *= uAlphaScale;
                
                // Front-to-back compositing
                sampleColor.rgb *= sampleColor.a;
                accumulatedColor = accumulatedColor + sampleColor * (1.0 - accumulatedColor.a);
            }
            
            // Early termination if nearly opaque
            if (accumulatedColor.a > 0.95) {
                break;
            }
        }
        
        // Move to next position
        pos += rayStep;
        
        // Check if we've exited the volume
        if (pos.x < uBoundsMin.x || pos.x > uBoundsMax.x ||
            pos.y < uBoundsMin.y || pos.y > uBoundsMax.y ||
            pos.z < uBoundsMin.z || pos.z > uBoundsMax.z) {
            break;
        }
    }
    
    // Apply brightness
    accumulatedColor.rgb *= uBrightness;
    
    fragColor = accumulatedColor;
}
`;

export const isosurfaceVertexShader = /* glsl */ `
precision highp float;

out vec3 vNormal;
out vec3 vWorldPosition;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

void main() {
    vNormal = normalMatrix * normal;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const isosurfaceFragmentShader = /* glsl */ `
precision highp float;

in vec3 vNormal;
in vec3 vWorldPosition;

out vec4 fragColor;

uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;

void main() {
    // Normalize normal
    vec3 normal = normalize(vNormal);
    
    // Simple directional lighting
    float diff = max(dot(normal, uLightDirection), 0.0);
    
    // Combine ambient and diffuse
    vec3 lighting = uAmbientColor + diff * vec3(1.0);
    
    // Final color
    vec3 finalColor = uColor * lighting;
    
    fragColor = vec4(finalColor, uOpacity);
}
`;

export const gridVertexShader = /* glsl */ `
precision highp float;

out vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const gridFragmentShader = /* glsl */ `
precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform vec3 uColor;
uniform float uOpacity;
uniform float uGridSize;
uniform float uLineWidth;

void main() {
    // Create grid lines
    vec2 grid = abs(fract(vUv * uGridSize - 0.5) - 0.5) / fwidth(vUv * uGridSize);
    float line = min(grid.x, grid.y);
    float alpha = 1.0 - min(line, 1.0);
    
    if (alpha < 0.1) {
        discard;
    }
    
    fragColor = vec4(uColor, alpha * uOpacity);
}
`;
