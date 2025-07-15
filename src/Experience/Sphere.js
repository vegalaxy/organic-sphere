import * as THREE from 'three'
import Experience from './Experience'
import vertexShader from './shaders/sphere/vertex.glsl'
import fragmentShader from './shaders/sphere/fragment.glsl'
import enhancedFragmentShader from './shaders/sphere/enhancedFragment.glsl'

export default class Sphere
{
    constructor()
    {
        this.experience = new Experience()
        this.debug = this.experience.debug
        this.scene = this.experience.scene
        this.time = this.experience.time
        this.microphone = this.experience.microphone
        this.conversationalAI = this.experience.conversationalAI

        this.timeFrequency = 0.0003
        this.elapsedTime = 0

        // Visual themes system
        this.currentTheme = 'energetic'
        this.themeTransition = {
            progress: 0,
            duration: 2000,
            isTransitioning: false,
            fromTheme: null,
            toTheme: null
        }

        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder({
                title: 'sphere',
                expanded: true
            })

            this.debugFolder.addInput(
                this,
                'timeFrequency',
                { min: 0, max: 0.001, step: 0.000001 }
            )

            // Theme selector
            this.debugFolder.addInput(
                this,
                'currentTheme',
                { 
                    options: {
                        Energetic: 'energetic',
                        Calm: 'calm',
                        Mysterious: 'mysterious',
                        Professional: 'professional',
                        Warm: 'warm'
                    }
                }
            ).on('change', () => {
                this.transitionToTheme(this.currentTheme)
            })
        }
        
        this.setThemes()
        this.setVariations()
        this.setGeometry()
        this.setLights()
        this.setOffset()
        this.setMaterial()
        this.setMesh()
    }

    setThemes()
    {
        this.themes = {
            energetic: {
                name: 'Energetic Assistant',
                lightA: { color: '#00FF88', intensity: 2.2 },
                lightB: { color: '#FF3366', intensity: 1.8 },
                materialProps: {
                    metallic: 0.8,
                    roughness: 0.2,
                    iridescence: 0.6,
                    energyFlow: 1.0
                },
                distortion: { frequency: 1.8, strength: 0.8 },
                displacement: { frequency: 2.5, strength: 0.18 },
                fresnel: { offset: -1.4, multiplier: 4.2, power: 1.6 }
            },
            calm: {
                name: 'Calm Therapist',
                lightA: { color: '#4A90E2', intensity: 1.4 },
                lightB: { color: '#F5A623', intensity: 1.2 },
                materialProps: {
                    metallic: 0.3,
                    roughness: 0.7,
                    iridescence: 0.2,
                    energyFlow: 0.3
                },
                distortion: { frequency: 1.2, strength: 0.4 },
                displacement: { frequency: 1.8, strength: 0.12 },
                fresnel: { offset: -1.8, multiplier: 3.2, power: 2.1 }
            },
            mysterious: {
                name: 'Mysterious Oracle',
                lightA: { color: '#9013FE', intensity: 1.9 },
                lightB: { color: '#00BCD4', intensity: 1.6 },
                materialProps: {
                    metallic: 0.9,
                    roughness: 0.1,
                    iridescence: 0.9,
                    energyFlow: 0.7
                },
                distortion: { frequency: 2.2, strength: 0.9 },
                displacement: { frequency: 1.6, strength: 0.16 },
                fresnel: { offset: -1.2, multiplier: 4.8, power: 1.4 }
            },
            professional: {
                name: 'Professional Assistant',
                lightA: { color: '#2196F3', intensity: 1.6 },
                lightB: { color: '#FFC107', intensity: 1.3 },
                materialProps: {
                    metallic: 0.6,
                    roughness: 0.4,
                    iridescence: 0.3,
                    energyFlow: 0.5
                },
                distortion: { frequency: 1.5, strength: 0.5 },
                displacement: { frequency: 2.0, strength: 0.14 },
                fresnel: { offset: -1.6, multiplier: 3.8, power: 1.8 }
            },
            warm: {
                name: 'Warm Companion',
                lightA: { color: '#FF6B35', intensity: 1.7 },
                lightB: { color: '#F7931E', intensity: 1.4 },
                materialProps: {
                    metallic: 0.4,
                    roughness: 0.6,
                    iridescence: 0.4,
                    energyFlow: 0.6
                },
                distortion: { frequency: 1.3, strength: 0.6 },
                displacement: { frequency: 2.2, strength: 0.15 },
                fresnel: { offset: -1.7, multiplier: 3.5, power: 1.9 }
            }
        }
    }

    transitionToTheme(newTheme)
    {
        if (this.themeTransition.isTransitioning || newTheme === this.currentTheme) return
        
        this.themeTransition.fromTheme = this.currentTheme
        this.themeTransition.toTheme = newTheme
        this.themeTransition.progress = 0
        this.themeTransition.isTransitioning = true
        this.themeTransition.startTime = this.time.elapsed
    }

    updateThemeTransition()
    {
        if (!this.themeTransition.isTransitioning) return

        const elapsed = this.time.elapsed - this.themeTransition.startTime
        this.themeTransition.progress = Math.min(elapsed / this.themeTransition.duration, 1)
        
        // Smooth easing function
        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        const easedProgress = easeInOutCubic(this.themeTransition.progress)
        
        if (this.themeTransition.progress >= 1) {
            this.themeTransition.isTransitioning = false
            this.currentTheme = this.themeTransition.toTheme
        }
        
        return easedProgress
    }

    getCurrentThemeProps()
    {
        if (!this.themeTransition.isTransitioning) {
            return this.themes[this.currentTheme]
        }
        
        const progress = this.updateThemeTransition()
        const fromTheme = this.themes[this.themeTransition.fromTheme]
        const toTheme = this.themes[this.themeTransition.toTheme]
        
        // Interpolate between themes
        const lerp = (a, b, t) => a + (b - a) * t
        const lerpColor = (colorA, colorB, t) => {
            const a = new THREE.Color(colorA)
            const b = new THREE.Color(colorB)
            return a.lerp(b, t)
        }
        
        return {
            lightA: {
                color: lerpColor(fromTheme.lightA.color, toTheme.lightA.color, progress),
                intensity: lerp(fromTheme.lightA.intensity, toTheme.lightA.intensity, progress)
            },
            lightB: {
                color: lerpColor(fromTheme.lightB.color, toTheme.lightB.color, progress),
                intensity: lerp(fromTheme.lightB.intensity, toTheme.lightB.intensity, progress)
            },
            materialProps: {
                metallic: lerp(fromTheme.materialProps.metallic, toTheme.materialProps.metallic, progress),
                roughness: lerp(fromTheme.materialProps.roughness, toTheme.materialProps.roughness, progress),
                iridescence: lerp(fromTheme.materialProps.iridescence, toTheme.materialProps.iridescence, progress),
                energyFlow: lerp(fromTheme.materialProps.energyFlow, toTheme.materialProps.energyFlow, progress)
            },
            distortion: {
                frequency: lerp(fromTheme.distortion.frequency, toTheme.distortion.frequency, progress),
                strength: lerp(fromTheme.distortion.strength, toTheme.distortion.strength, progress)
            },
            displacement: {
                frequency: lerp(fromTheme.displacement.frequency, toTheme.displacement.frequency, progress),
                strength: lerp(fromTheme.displacement.strength, toTheme.displacement.strength, progress)
            },
            fresnel: {
                offset: lerp(fromTheme.fresnel.offset, toTheme.fresnel.offset, progress),
                multiplier: lerp(fromTheme.fresnel.multiplier, toTheme.fresnel.multiplier, progress),
                power: lerp(fromTheme.fresnel.power, toTheme.fresnel.power, progress)
            }
        }
    }
    setVariations()
    {
        this.variations = {}

        this.variations.volume = {}
        this.variations.volume.target = 0
        this.variations.volume.current = 0
        this.variations.volume.upEasing = 0.03
        this.variations.volume.downEasing = 0.002
        this.variations.volume.getValue = () =>
        {
            // Use combined level from both microphone and AI audio
            let micLevel = 0
            if (this.microphone && this.microphone.ready) {
                const level0 = this.microphone.levels[0] || 0
                const level1 = this.microphone.levels[1] || 0
                const level2 = this.microphone.levels[2] || 0
                micLevel = Math.max(level0, level1, level2)
            }
            
            let aiLevel = 0
            if (this.conversationalAI) {
                aiLevel = this.conversationalAI.getCombinedLevel()
            }
            
            const combinedLevel = Math.max(micLevel, aiLevel)
            return combinedLevel * 0.3
        }
        this.variations.volume.getDefault = () =>
        {
            return 0.152
        }

        // Enhanced color variation based on AI speaking state
        this.variations.aiSpeaking = {}
        this.variations.aiSpeaking.target = 0
        this.variations.aiSpeaking.current = 0
        this.variations.aiSpeaking.upEasing = 0.05
        this.variations.aiSpeaking.downEasing = 0.02
        this.variations.aiSpeaking.getValue = () =>
        {
            return this.conversationalAI && this.conversationalAI.isAISpeaking() ? 1 : 0
        }
        this.variations.aiSpeaking.getDefault = () =>
        {
            return 0
        }
        this.variations.volume.getDefault = () =>
        {
            return 0.152
        }

        this.variations.lowLevel = {}
        this.variations.lowLevel.target = 0
        this.variations.lowLevel.current = 0
        this.variations.lowLevel.upEasing = 0.005
        this.variations.lowLevel.downEasing = 0.002
        this.variations.lowLevel.getValue = () =>
        {
            let value = (this.microphone && this.microphone.levels) ? this.microphone.levels[0] || 0 : 0
            value *= 0.003
            value += 0.0001
            value = Math.max(0, value)

            return value
        }
        this.variations.lowLevel.getDefault = () =>
        {
            return 0.0003
        }
        
        this.variations.mediumLevel = {}
        this.variations.mediumLevel.target = 0
        this.variations.mediumLevel.current = 0
        this.variations.mediumLevel.upEasing = 0.008
        this.variations.mediumLevel.downEasing = 0.004
        this.variations.mediumLevel.getValue = () =>
        {
            let value = (this.microphone && this.microphone.levels) ? this.microphone.levels[1] || 0 : 0
            value *= 2
            value += 3.587
            value = Math.max(3.587, value)

            return value
        }
        this.variations.mediumLevel.getDefault = () =>
        {
            return 3.587
        }
        
        this.variations.highLevel = {}
        this.variations.highLevel.target = 0
        this.variations.highLevel.current = 0
        this.variations.highLevel.upEasing = 0.02
        this.variations.highLevel.downEasing = 0.001
        this.variations.highLevel.getValue = () =>
        {
            let value = (this.microphone && this.microphone.levels) ? this.microphone.levels[2] || 0 : 0
            value *= 5
            value += 0.5
            value = Math.max(0.5, value)

            return value
        }
        this.variations.highLevel.getDefault = () =>
        {
            return 0.65
        }
    }

    setLights()
    {
        this.lights = {}

        // Light A
        this.lights.a = {}

        this.lights.a.intensity = 1.85

        this.lights.a.color = {}
        this.lights.a.color.value = '#00ff88'
        this.lights.a.color.instance = new THREE.Color(this.lights.a.color.value)

        this.lights.a.spherical = new THREE.Spherical(1, 0.615, 2.049)

        // Light B
        this.lights.b = {}

        this.lights.b.intensity = 1.4

        this.lights.b.color = {}
        this.lights.b.color.value = '#ff6600'
        this.lights.b.color.instance = new THREE.Color(this.lights.b.color.value)

        this.lights.b.spherical = new THREE.Spherical(1, 2.561, - 1.844)

        // Debug
        if(this.debug)
        {
            for(const _lightName in this.lights)
            {
                const light = this.lights[_lightName]
                
                const debugFolder = this.debugFolder.addFolder({
                    title: _lightName,
                    expanded: true
                })

                debugFolder
                    .addInput(
                        light.color,
                        'value',
                        { view: 'color', label: 'color' }
                    )
                    .on('change', () =>
                    {
                        light.color.instance.set(light.color.value)
                    })

                debugFolder
                    .addInput(
                        light,
                        'intensity',
                        { min: 0, max: 10 }
                    )
                    .on('change', () =>
                    {
                        this.material.uniforms[`uLight${_lightName.toUpperCase()}Intensity`].value = light.intensity
                    })

                debugFolder
                    .addInput(
                        light.spherical,
                        'phi',
                        { label: 'phi', min: 0, max: Math.PI, step: 0.001 }
                    )
                    .on('change', () =>
                    {
                        this.material.uniforms[`uLight${_lightName.toUpperCase()}Position`].value.setFromSpherical(light.spherical)
                    })

                debugFolder
                    .addInput(
                        light.spherical,
                        'theta',
                        { label: 'theta', min: - Math.PI, max: Math.PI, step: 0.001 }
                    )
                    .on('change', () =>
                    {
                        this.material.uniforms.uLightAPosition.value.setFromSpherical(light.spherical)
                    })
            }
        }
    }

    setOffset()
    {
        this.offset = {}
        this.offset.spherical = new THREE.Spherical(1, Math.random() * Math.PI, Math.random() * Math.PI * 2)
        this.offset.direction = new THREE.Vector3()
        this.offset.direction.setFromSpherical(this.offset.spherical)
    }

    setGeometry()
    {
        this.geometry = new THREE.SphereGeometry(1, 512, 512)
        this.geometry.computeTangents()
    }

    setMaterial()
    {
        this.material = new THREE.ShaderMaterial({
            uniforms:
            {
                uLightAColor: { value: this.lights.a.color.instance },
                uLightAPosition: { value: new THREE.Vector3(1, 1, 0) },
                uLightAIntensity: { value: this.lights.a.intensity },

                uLightBColor: { value: this.lights.b.color.instance },
                uLightBPosition: { value: new THREE.Vector3(- 1, - 1, 0) },
                uLightBIntensity: { value: this.lights.b.intensity },

                uSubdivision: { value: new THREE.Vector2(this.geometry.parameters.widthSegments, this.geometry.parameters.heightSegments) },

                uOffset: { value: new THREE.Vector3() },

                uDistortionFrequency: { value: 1.5 },
                uDistortionStrength: { value: 0.65 },
                uDisplacementFrequency: { value: 2.120 },
                uDisplacementStrength: { value: 0.152 },

                uFresnelOffset: { value: -1.609 },
                uFresnelMultiplier: { value: 3.587 },
                uFresnelPower: { value: 1.793 },

                // Enhanced material properties
                uMetallic: { value: 0.8 },
                uRoughness: { value: 0.2 },
                uIridescence: { value: 0.6 },
                uEnergyFlow: { value: 1.0 },
                uScanlineSpeed: { value: 0.5 },
                uHolographicStrength: { value: 0.3 },

                uTime: { value: 0 }
            },
            defines:
            {
                USE_TANGENT: ''
            },
            vertexShader: vertexShader,
            fragmentShader: enhancedFragmentShader
        })

        this.material.uniforms.uLightAPosition.value.setFromSpherical(this.lights.a.spherical)
        this.material.uniforms.uLightBPosition.value.setFromSpherical(this.lights.b.spherical)
        
        if(this.debug)
        {
            this.debugFolder.addInput(
                this.material.uniforms.uDistortionFrequency,
                'value',
                { label: 'uDistortionFrequency', min: 0, max: 10, step: 0.001 }
            )
            
            this.debugFolder.addInput(
                this.material.uniforms.uDistortionStrength,
                'value',
                { label: 'uDistortionStrength', min: 0, max: 10, step: 0.001 }
            )
            
            this.debugFolder.addInput(
                this.material.uniforms.uDisplacementFrequency,
                'value',
                { label: 'uDisplacementFrequency', min: 0, max: 5, step: 0.001 }
            )
            
            this.debugFolder.addInput(
                this.material.uniforms.uDisplacementStrength,
                'value',
                { label: 'uDisplacementStrength', min: 0, max: 1, step: 0.001 }
            )
            
            this.debugFolder.addInput(
                this.material.uniforms.uFresnelOffset,
                'value',
                { label: 'uFresnelOffset', min: - 2, max: 2, step: 0.001 }
            )
            
            this.debugFolder.addInput(
                this.material.uniforms.uFresnelMultiplier,
                'value',
                { label: 'uFresnelMultiplier', min: 0, max: 5, step: 0.001 }
            )
            
            this.debugFolder.addInput(
                this.material.uniforms.uFresnelPower,
                'value',
                { label: 'uFresnelPower', min: 0, max: 5, step: 0.001 }
            )
        }
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.scene.add(this.mesh)
    }

    update()
    {
        // Update theme properties
        const themeProps = this.getCurrentThemeProps()
        
        // Update variations
        for(let _variationName in this.variations)
        {
            const variation = this.variations[_variationName]
            variation.target = (this.microphone && this.microphone.ready) ? variation.getValue() : variation.getDefault()
            
            const easing = variation.target > variation.current ? variation.upEasing : variation.downEasing
            variation.current += (variation.target - variation.current) * easing * this.time.delta
        }

        // Time
        this.timeFrequency = this.variations.lowLevel.current
        this.elapsedTime = this.time.delta * this.timeFrequency

        // Update material
        this.material.uniforms.uDisplacementStrength.value = this.variations.volume.current
        this.material.uniforms.uDistortionStrength.value = this.variations.highLevel.current * themeProps.distortion.strength
        this.material.uniforms.uDistortionFrequency.value = themeProps.distortion.frequency
        this.material.uniforms.uDisplacementFrequency.value = themeProps.displacement.frequency
        this.material.uniforms.uFresnelOffset.value = themeProps.fresnel.offset
        this.material.uniforms.uFresnelMultiplier.value = this.variations.mediumLevel.current * themeProps.fresnel.multiplier
        this.material.uniforms.uFresnelPower.value = themeProps.fresnel.power
        
        // Update enhanced material properties
        this.material.uniforms.uMetallic.value = themeProps.materialProps.metallic
        this.material.uniforms.uRoughness.value = themeProps.materialProps.roughness
        this.material.uniforms.uIridescence.value = themeProps.materialProps.iridescence
        this.material.uniforms.uEnergyFlow.value = themeProps.materialProps.energyFlow
        
        // Update light colors and intensities
        if (typeof themeProps.lightA.color.r !== 'undefined') {
            this.material.uniforms.uLightAColor.value.copy(themeProps.lightA.color)
        } else {
            this.material.uniforms.uLightAColor.value.set(themeProps.lightA.color)
        }
        
        if (typeof themeProps.lightB.color.r !== 'undefined') {
            this.material.uniforms.uLightBColor.value.copy(themeProps.lightB.color)
        } else {
            this.material.uniforms.uLightBColor.value.set(themeProps.lightB.color)
        }

        // Dynamic color mixing based on AI speaking state
        const aiSpeakingIntensity = this.variations.aiSpeaking.current
        
        // Interpolate light intensities based on AI state
        this.material.uniforms.uLightAIntensity.value = themeProps.lightA.intensity * (0.5 + aiSpeakingIntensity * 0.5)
        this.material.uniforms.uLightBIntensity.value = themeProps.lightB.intensity * (0.5 + (1 - aiSpeakingIntensity) * 0.5)

        // Offset
        const offsetTime = this.elapsedTime * 0.3
        this.offset.spherical.phi = ((Math.sin(offsetTime * 0.001) * Math.sin(offsetTime * 0.00321)) * 0.5 + 0.5) * Math.PI
        this.offset.spherical.theta = ((Math.sin(offsetTime * 0.0001) * Math.sin(offsetTime * 0.000321)) * 0.5 + 0.5) * Math.PI * 2
        this.offset.direction.setFromSpherical(this.offset.spherical)
        this.offset.direction.multiplyScalar(this.timeFrequency * 2)

        this.material.uniforms.uOffset.value.add(this.offset.direction)

        // Time
        this.material.uniforms.uTime.value += this.elapsedTime
    }
}