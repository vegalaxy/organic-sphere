import * as THREE from 'three'
import Experience from './Experience.js'
import Sphere from './Sphere.js'
import VideoBackground from './VideoBackground.js'

export default class World
{
    constructor(_options)
    {
        this.experience = new Experience()
        this.config = this.experience.config
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        
        this.resources.on('groupEnd', (_group) =>
        {
            if(_group.name === 'base')
            {
                this.setVideoBackground()
                this.setSphere()
            }
        })
    }

    setVideoBackground()
    {
        this.videoBackground = new VideoBackground()
    }

    setSphere()
    {
        this.sphere = new Sphere()
    }

    resize()
    {
    }

    update()
    {
        if(this.videoBackground)
            this.videoBackground.update()
            
        if(this.sphere)
            this.sphere.update()
    }

    destroy()
    {
        if(this.videoBackground)
            this.videoBackground.destroy()
    }
}