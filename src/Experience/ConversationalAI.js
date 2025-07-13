import Experience from './Experience.js'

export default class ConversationalAI
{
    constructor()
    {
        this.experience = new Experience()
        this.debug = this.experience.debug
        
        // ElevenLabs configuration
        this.agentId = 'VKkqHVzHTMdhYVGSj8am'
        this.apiKey = 'sk_5eb294966f9b6ff79344c6fd5addb3edc4a97e5bceb339cc'
        
        // Connection state
        this.isConnected = false
        this.isSpeaking = false
        this.isInitializing = true
        
        // Audio context and processing
        this.audioContext = null
        this.mediaRecorder = null
        this.audioQueue = []
        this.isPlaying = false
        
        // WebSocket
        this.websocket = null
        
        // Audio levels for visualization
        this.inputLevel = 0
        this.outputLevel = 0
        
        // Auto-initialize
        this.createSplashScreen()
        this.autoInit()
    }
    
    createSplashScreen()
    {
        // Create splash screen overlay
        this.splash = document.createElement('div')
        this.splash.className = 'ai-splash'
        this.splash.innerHTML = `
            <div class="ai-splash-content">
                <div class="ai-splash-logo">
                    <div class="ai-splash-orb"></div>
                </div>
                <h1 class="ai-splash-title">AI</h1>
                <p class="ai-splash-status">Initializing neural networks...</p>
                <div class="ai-splash-progress">
                    <div class="ai-splash-progress-bar"></div>
                </div>
            </div>
        `
        document.body.appendChild(this.splash)
        
        // Add splash screen styles
        this.addSplashStyles()
    }
    
    addSplashStyles()
    {
        const style = document.createElement('style')
        style.textContent = `
            .ai-splash {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                transition: opacity 1s ease, visibility 1s ease;
            }
            
            .ai-splash.hidden {
                opacity: 0;
                visibility: hidden;
            }
            
            .ai-splash-content {
                text-align: center;
                color: white;
                font-family: 'Ailerons', Helvetica, Arial, sans-serif;
            }
            
            .ai-splash-logo {
                margin-bottom: 2rem;
                display: flex;
                justify-content: center;
            }
            
            .ai-splash-orb {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                position: relative;
                animation: pulse 2s infinite ease-in-out;
                box-shadow: 0 0 60px rgba(102, 126, 234, 0.4);
            }
            
            .ai-splash-orb::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%);
                animation: rotate 4s linear infinite;
            }
            
            .ai-splash-title {
                font-size: 4rem;
                font-weight: 300;
                margin: 0 0 1rem 0;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .ai-splash-status {
                font-size: 1.2rem;
                font-weight: 300;
                margin: 0 0 2rem 0;
                opacity: 0.8;
                animation: fadeInOut 2s infinite ease-in-out;
            }
            
            .ai-splash-progress {
                width: 300px;
                height: 2px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1px;
                margin: 0 auto;
                overflow: hidden;
            }
            
            .ai-splash-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                border-radius: 1px;
                width: 0%;
                animation: progress 3s ease-in-out;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 60px rgba(102, 126, 234, 0.4); }
                50% { transform: scale(1.05); box-shadow: 0 0 80px rgba(102, 126, 234, 0.6); }
            }
            
            @keyframes rotate {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
            
            @keyframes fadeInOut {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 0.4; }
            }
            
            @keyframes progress {
                0% { width: 0%; }
                100% { width: 100%; }
            }
            
            /* Hide title when splash is active */
            .ai-splash ~ .title {
                opacity: 0;
                transition: opacity 1s ease;
            }
            
            .ai-splash.hidden ~ .title {
                opacity: 1;
            }
        `
        document.head.appendChild(style)
    }
    
    updateSplashStatus(status)
    {
        const statusElement = this.splash.querySelector('.ai-splash-status')
        if (statusElement) {
            statusElement.textContent = status
        }
    }
    
    hideSplash()
    {
        setTimeout(() => {
            this.splash.classList.add('hidden')
            setTimeout(() => {
                this.splash.remove()
                this.isInitializing = false
            }, 1000)
        }, 500)
    }
    
    async autoInit()
    {
        try {
            // Step 1: Initialize audio context
            this.updateSplashStatus('Initializing audio systems...')
            await this.delay(800)
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000,
                channelCount: 1
            })
            
            // Step 2: Request microphone permission
            this.updateSplashStatus('Requesting microphone access...')
            await this.delay(600)
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            })
            
            this.stream = stream
            
            // Step 3: Connect to ElevenLabs
            this.updateSplashStatus('Connecting to AI neural network...')
            await this.delay(800)
            
            await this.connectToElevenLabs()
            
            // Step 4: Complete initialization
            this.updateSplashStatus('AI ready - speak naturally')
            await this.delay(1000)
            
            this.hideSplash()
            
        } catch (error) {
            console.error('Auto-initialization failed:', error)
            this.updateSplashStatus('Initialization failed - click to retry')
            
            // Add click to retry
            this.splash.addEventListener('click', () => {
                this.splash.remove()
                this.createSplashScreen()
                this.autoInit()
            })
        }
    }
    
    async connectToElevenLabs()
    {
        return new Promise((resolve, reject) => {
            const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}`
            
            this.websocket = new WebSocket(wsUrl)
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected to ElevenLabs')
                
                // Send authentication
                const authMessage = {
                    type: 'auth',
                    xi_api_key: this.apiKey
                }
                this.websocket.send(JSON.stringify(authMessage))
            }
            
            this.websocket.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    try {
                        const message = JSON.parse(event.data)
                        
                        switch (message.type) {
                            case 'conversation_initiation_metadata':
                                console.log('AI conversation ready')
                                this.isConnected = true
                                this.startAudioStreaming()
                                resolve()
                                break
                                
                            case 'user_transcript':
                                console.log('You said:', message.user_transcript)
                                break
                                
                            case 'agent_response':
                                console.log('AI response received')
                                break
                                
                            case 'error':
                                console.error('ElevenLabs error:', message)
                                reject(new Error(message.message))
                                break
                        }
                    } catch (error) {
                        console.error('Failed to parse message:', error)
                    }
                } else {
                    // Binary audio data from AI
                    this.handleAudioResponse(event.data)
                }
            }
            
            this.websocket.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason)
                this.isConnected = false
                this.isSpeaking = false
                this.stopAudioStreaming()
            }
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error)
                reject(error)
            }
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'))
                }
            }, 10000)
        })
    }
    
    async handleAudioResponse(audioData)
    {
        try {
            this.audioQueue.push(audioData)
            
            if (!this.isPlaying) {
                this.playAudioQueue()
            }
            
        } catch (error) {
            console.error('Failed to handle audio response:', error)
        }
    }
    
    async playAudioQueue()
    {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false
            this.isSpeaking = false
            this.outputLevel = 0
            return
        }
        
        this.isPlaying = true
        this.isSpeaking = true
        
        const audioData = this.audioQueue.shift()
        
        try {
            const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0))
            
            const source = this.audioContext.createBufferSource()
            const gainNode = this.audioContext.createGain()
            const analyser = this.audioContext.createAnalyser()
            
            source.buffer = audioBuffer
            source.connect(gainNode)
            gainNode.connect(analyser)
            analyser.connect(this.audioContext.destination)
            
            // Audio analysis for visualization
            analyser.fftSize = 256
            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            
            const updateOutputLevel = () => {
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i]
                }
                this.outputLevel = sum / dataArray.length / 255
                
                if (this.isSpeaking) {
                    requestAnimationFrame(updateOutputLevel)
                }
            }
            updateOutputLevel()
            
            source.start()
            
            source.onended = () => {
                setTimeout(() => {
                    this.playAudioQueue()
                }, 50)
            }
            
        } catch (error) {
            console.error('Failed to play audio:', error)
            this.playAudioQueue()
        }
    }
    
    startAudioStreaming()
    {
        if (!this.stream) return
        
        try {
            console.log('Starting audio streaming to AI...')
            
            const source = this.audioContext.createMediaStreamSource(this.stream)
            const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
            
            processor.onaudioprocess = (event) => {
                if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                    return
                }
                
                const inputBuffer = event.inputBuffer.getChannelData(0)
                
                // Convert to 16-bit PCM
                const pcmData = new Int16Array(inputBuffer.length)
                for (let i = 0; i < inputBuffer.length; i++) {
                    const sample = Math.max(-1, Math.min(1, inputBuffer[i]))
                    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
                }
                
                // Send to ElevenLabs
                this.websocket.send(pcmData.buffer)
                
                // Update input level for visualization
                let sum = 0
                for (let i = 0; i < inputBuffer.length; i++) {
                    sum += Math.abs(inputBuffer[i])
                }
                this.inputLevel = sum / inputBuffer.length
            }
            
            source.connect(processor)
            processor.connect(this.audioContext.destination)
            
            this.audioProcessor = processor
            
        } catch (error) {
            console.error('Failed to start audio streaming:', error)
        }
    }
    
    stopAudioStreaming()
    {
        if (this.audioProcessor) {
            this.audioProcessor.disconnect()
            this.audioProcessor = null
        }
        
        this.inputLevel = 0
    }
    
    getCombinedLevel()
    {
        return Math.max(this.inputLevel, this.outputLevel)
    }
    
    isAISpeaking()
    {
        return this.isSpeaking
    }
    
    delay(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
    
    update()
    {
        // This method is called by the main experience loop
        // The sphere will automatically react to audio levels
    }
    
    destroy()
    {
        if (this.websocket) {
            this.websocket.close()
        }
        
        this.stopAudioStreaming()
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop())
        }
        
        if (this.audioContext) {
            this.audioContext.close()
        }
        
        if (this.splash) {
            this.splash.remove()
        }
    }
}