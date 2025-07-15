uniform vec3 uLightAColor;
uniform vec3 uLightBColor;
uniform float uMetallic;
uniform float uRoughness;
uniform float uIridescence;
uniform float uEnergyFlow;
uniform float uScanlineSpeed;
uniform float uHolographicStrength;
uniform float uTime;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vPosition;

// Iridescence effect
vec3 getIridescence(vec3 normal, vec3 viewDir, float strength) {
    float fresnel = dot(normal, viewDir);
    float iridescenceAngle = fresnel * 3.14159;
    
    vec3 iridescenceColor = vec3(
        0.5 + 0.5 * sin(iridescenceAngle * 2.0 + uTime * 0.001),
        0.5 + 0.5 * sin(iridescenceAngle * 2.0 + uTime * 0.001 + 2.094),
        0.5 + 0.5 * sin(iridescenceAngle * 2.0 + uTime * 0.001 + 4.188)
    );
    
    return mix(vec3(1.0), iridescenceColor, strength);
}

// Energy flow patterns
float getEnergyFlow(vec3 pos, float time) {
    float flow1 = sin(pos.y * 8.0 + time * 0.002) * 0.5 + 0.5;
    float flow2 = sin(pos.x * 6.0 + time * 0.0015) * 0.5 + 0.5;
    float flow3 = sin(pos.z * 10.0 + time * 0.0025) * 0.5 + 0.5;
    
    return (flow1 + flow2 + flow3) / 3.0;
}

// Holographic scanlines
float getScanlines(vec3 pos, float speed) {
    float scanline = sin(pos.y * 50.0 + uTime * speed * 0.01);
    return smoothstep(0.7, 1.0, scanline) * 0.3;
}

// Metallic reflection simulation
vec3 getMetallicReflection(vec3 color, vec3 normal, vec3 viewDir, float metallic) {
    float reflection = pow(max(0.0, dot(reflect(viewDir, normal), vec3(0.0, 1.0, 0.0))), 2.0);
    vec3 metallicTint = mix(color, vec3(1.0), metallic * 0.8);
    return mix(color, metallicTint * reflection, metallic);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vPosition - cameraPosition);
    
    // Base color from vertex shader
    vec3 baseColor = vColor;
    
    // Apply iridescence
    vec3 iridescenceEffect = getIridescence(normal, viewDir, uIridescence);
    baseColor *= iridescenceEffect;
    
    // Apply energy flow
    float energyPattern = getEnergyFlow(vPosition, uTime);
    vec3 energyColor = mix(baseColor, uLightAColor * 1.5, energyPattern * uEnergyFlow * 0.3);
    
    // Apply metallic reflection
    vec3 metallicColor = getMetallicReflection(energyColor, normal, viewDir, uMetallic);
    
    // Apply holographic scanlines
    float scanlines = getScanlines(vPosition, uScanlineSpeed);
    vec3 holographicColor = mix(metallicColor, vec3(1.0), scanlines * uHolographicStrength);
    
    // Roughness affects the overall brightness
    float roughnessFactor = 1.0 - uRoughness * 0.3;
    holographicColor *= roughnessFactor;
    
    // Final color with enhanced contrast
    vec3 finalColor = holographicColor;
    finalColor = pow(finalColor, vec3(0.9)); // Slight gamma correction
    
    gl_FragColor = vec4(finalColor, 1.0);
}