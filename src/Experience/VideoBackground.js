import * as THREE from 'three'
import Experience from './Experience.js'

export default class VideoBackground
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.debug = this.experience.debug
        
        this.isLoaded = false
        this.opacity = 0.3 // Subtle background presence
        
        this.setVideo()
        this.setGeometry()
        this.setMaterial()
        this.setMesh()
        
        if(this.debug)
        {
            this.setDebug()
        }
    }
    
    setVideo()
    {
        // Create video element
        this.video = document.createElement('video')
        this.video.src = 'https://preservr.org/videos/video-baleine.mp4'
        this.video.crossOrigin = 'anonymous'
        this.video.loop = true
        this.video.muted = true
        this.video.playsInline = true
        
        // Auto-play when loaded
        this.video.addEventListener('loadeddata', () => {
            this.isLoaded = true
            this.video.play().catch(error => {
                console.warn('Video autoplay failed:', error)
            })
        })
        
        // Handle loading errors gracefully
        this.video.addEventListener('error', (error) => {
            console.warn('Video loading failed:', error)
            this.setFallbackBackground()
        })
        
        // Start loading
        this.video.load()
    }
    
    setFallbackBackground()
    {
        // Create a subtle animated gradient as fallback
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')
        
        // Create gradient
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
        gradient.addColorStop(0, '#1a1a2e')
        gradient.addColorStop(0.5, '#16213e')
        gradient.addColorStop(1, '#0f0f23')
        
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 512, 512)
        
        // Use canvas as texture
        this.texture = new THREE.CanvasTexture(canvas)
        this.material.map = this.texture
        this.material.needsUpdate = true
    }
    
    setGeometry()
    {
        // Large plane positioned far behind the sphere
        this.geometry = new THREE.PlaneGeometry(20, 20)
    }
    
    setMaterial()
    {
        // Create video texture
        this.texture = new THREE.VideoTexture(this.video)
        this.texture.minFilter = THREE.LinearFilter
        this.texture.magFilter = THREE.LinearFilter
        
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide
        })
    }
    
    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        
        // Position far behind sphere
        this.mesh.position.z = -10
        this.mesh.renderOrder = -1 // Render first (behind everything)
        
        this.scene.add(this.mesh)
    }
    
    setDebug()
    {
        const debugFolder = this.debug.addFolder({
            title: 'Video Background',
            expanded: false
        })
        
        debugFolder.addInput(
            this.material,
            'opacity',
            { min: 0, max: 1, step: 0.01, label: 'Opacity' }
        )
        
        debugFolder.addInput(
            this.mesh.position,
            'z',
            { min: -20, max: -5, step: 0.1, label: 'Distance' }
        )
        
        debugFolder.addInput(
            this.mesh.scale,
            'x',
            { min: 0.5, max: 3, step: 0.1, label: 'Scale X' }
        ).on('change', () => {
            this.mesh.scale.y = this.mesh.scale.x // Keep aspect ratio
        })
        
        // Video controls
        const videoFolder = debugFolder.addFolder({
            title: 'Video Controls',
            expanded: false
        })
        
        videoFolder.addButton({
            title: 'Play/Pause'
        }).on('click', () => {
            if (this.video.paused) {
                this.video.play()
            } else {
                this.video.pause()
            }
        })
        
        videoFolder.addInput(
            this.video,
            'playbackRate',
            { min: 0.25, max: 2, step: 0.25, label: 'Speed' }
        )
    }
    
    update()
    {
        // Video texture updates automatically
        // Could add subtle movement or effects here if needed
    }
    
    destroy()
    {
        if (this.video) {
            this.video.pause()
            this.video.src = ''
        }
        
        if (this.texture) {
            this.texture.dispose()
        }
        
        if (this.material) {
            this.material.dispose()
        }
        
        if (this.geometry) {
            this.geometry.dispose()
        }
        
        if (this.mesh) {
            this.scene.remove(this.mesh)
        }
    }
}