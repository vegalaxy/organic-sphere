import Experience from './Experience.js'

export default class ConversationalAI
{
    constructor()
    {
        this.experience = new Experience()
        this.debug = this.experience.debug
        
        // ElevenLabs configuration - exactly as per official guide
        this.agentId = 'VKkqHVzHTMdhYVGSj8am'
        this.apiKey = 'sk_5eb294966f9b6ff79344c6fd5addb3edc4a97e5bceb339cc'
        
        // Connection state
        this.isConnected = false
        this.isSpeaking = false
        
        // Audio context and processing - following official guide specs
        this.audioContext = null
        this.mediaRecorder = null
        this.audioQueue = []
        this.isPlaying = false
        
        // WebSocket
        this.websocket = null
        
        // Audio levels for visualization
        this.inputLevel = 0
        this.outputLevel = 0
        
        // UI Elements
        this.ui = {}
        
        this.init()
        this.createUI()
    }
    
    async init()
    {
        try {
            console.log('Initializing ConversationalAI...')
            
            // Initialize audio context with exact specs from ElevenLabs guide
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000,
                channelCount: 1
            })
            
            console.log('ConversationalAI initialized successfully')
            this.updateUIStatus('Ready to connect')
            
        } catch (error) {
            console.error('Failed to initialize ConversationalAI:', error)
            this.updateUIStatus('Initialization failed')
        }
    }
    
    createUI()
    {
        // Main container
        this.ui.container = document.createElement('div')
        this.ui.container.className = 'ai-controls'
        document.body.appendChild(this.ui.container)
        
        // Status indicator
        this.ui.status = document.createElement('div')
        this.ui.status.className = 'ai-status'
        this.ui.status.textContent = 'Initializing...'
        this.ui.container.appendChild(this.ui.status)
        
        // Main button
        this.ui.button = document.createElement('button')
        this.ui.button.className = 'ai-button'
        this.ui.button.innerHTML = `
            <div class="ai-button-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            </div>
            <span class="ai-button-text">Start Conversation</span>
        `
        this.ui.container.appendChild(this.ui.button)
        
        // Audio visualizer
        this.ui.visualizer = document.createElement('div')
        this.ui.visualizer.className = 'ai-visualizer'
        this.ui.container.appendChild(this.ui.visualizer)
        
        // Create visualizer bars
        for (let i = 0; i < 5; i++) {
            const bar = document.createElement('div')
            bar.className = 'ai-visualizer-bar'
            this.ui.visualizer.appendChild(bar)
        }
        
        // Event listeners
        this.ui.button.addEventListener('click', () => {
            if (this.isConnected) {
                this.endConversation()
            } else {
                this.startConversation()
            }
        })
        
        // Add debug controls if debug mode is enabled
        if (this.debug) {
            this.addDebugControls()
        }
        
        // Add styles
        this.addStyles()
    }
    
    addDebugControls()
    {
        const debugFolder = this.debug.addFolder({
            title: 'Conversational AI',
            expanded: true
        })
        
        debugFolder.addButton({
            title: 'Start Conversation'
        }).on('click', () => {
            this.startConversation()
        })
        
        debugFolder.addButton({
            title: 'End Conversation'
        }).on('click', () => {
            this.endConversation()
        })
        
        debugFolder.addMonitor(this, 'isConnected', {
            label: 'Connected'
        })
        
        debugFolder.addMonitor(this, 'isSpeaking', {
            label: 'AI Speaking'
        })
    }
    
    addStyles()
    {
        const style = document.createElement('style')
        style.textContent = `
            .ai-controls {
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                z-index: 1000;
                font-family: 'Roboto', sans-serif;
            }
            
            .ai-status {
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 300;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
                max-width: 200px;
                text-align: center;
            }
            
            .ai-status.connected {
                background: rgba(0, 255, 136, 0.2);
                border-color: rgba(0, 255, 136, 0.3);
                color: #00ff88;
            }
            
            .ai-status.speaking {
                background: rgba(255, 102, 0, 0.2);
                border-color: rgba(255, 102, 0, 0.3);
                color: #ff6600;
            }
            
            .ai-button {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: none;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                transition: all 0.3s ease;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                position: relative;
                overflow: hidden;
            }
            
            .ai-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            }
            
            .ai-button:active {
                transform: translateY(0);
            }
            
            .ai-button.connected {
                background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
                animation: pulse 2s infinite;
            }
            
            .ai-button.speaking {
                background: linear-gradient(135deg, #ff6600 0%, #ff4400 100%);
                animation: speaking 0.5s infinite alternate;
            }
            
            .ai-button-icon {
                font-size: 24px;
                transition: transform 0.3s ease;
            }
            
            .ai-button-text {
                font-size: 8px;
                font-weight: 300;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                opacity: 0.9;
            }
            
            .ai-visualizer {
                display: flex;
                gap: 3px;
                height: 30px;
                align-items: end;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .ai-visualizer.active {
                opacity: 1;
            }
            
            .ai-visualizer-bar {
                width: 3px;
                background: linear-gradient(to top, #667eea, #764ba2);
                border-radius: 2px;
                transition: height 0.1s ease;
                height: 4px;
                min-height: 4px;
            }
            
            @keyframes pulse {
                0% { box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3); }
                50% { box-shadow: 0 8px 32px rgba(0, 255, 136, 0.6); }
                100% { box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3); }
            }
            
            @keyframes speaking {
                0% { transform: scale(1); }
                100% { transform: scale(1.05); }
            }
            
            @media (max-width: 768px) {
                .ai-controls {
                    bottom: 20px;
                    right: 20px;
                }
                
                .ai-button {
                    width: 60px;
                    height: 60px;
                }
                
                .ai-button-icon {
                    font-size: 20px;
                }
                
                .ai-button-text {
                    font-size: 7px;
                }
            }
        `
        document.head.appendChild(style)
    }
    
    updateUIStatus(status)
    {
        if (this.ui.status) {
            this.ui.status.textContent = status
            
            // Update status styling
            this.ui.status.className = 'ai-status'
            if (this.isConnected) {
                this.ui.status.classList.add('connected')
            }
            if (this.isSpeaking) {
                this.ui.status.classList.add('speaking')
            }
        }
    }
    
    updateUIButton()
    {
        if (this.ui.button) {
            const text = this.ui.button.querySelector('.ai-button-text')
            
            this.ui.button.className = 'ai-button'
            
            if (this.isConnected) {
                this.ui.button.classList.add('connected')
                text.textContent = 'End Chat'
                
                if (this.isSpeaking) {
                    this.ui.button.classList.add('speaking')
                }
            } else {
                text.textContent = 'Start Chat'
            }
        }
    }
    
    updateVisualizer()
    {
        if (!this.ui.visualizer) return
        
        const bars = this.ui.visualizer.querySelectorAll('.ai-visualizer-bar')
        const level = this.getCombinedLevel()
        
        if (this.isConnected && level > 0.01) {
            this.ui.visualizer.classList.add('active')
            
            bars.forEach((bar, index) => {
                const height = Math.max(4, level * 30 * (1 + Math.sin(Date.now() * 0.01 + index) * 0.5))
                bar.style.height = `${height}px`
                
                if (this.isSpeaking) {
                    bar.style.background = 'linear-gradient(to top, #ff6600, #ff4400)'
                } else {
                    bar.style.background = 'linear-gradient(to top, #00ff88, #00cc6a)'
                }
            })
        } else {
            this.ui.visualizer.classList.remove('active')
        }
    }
    
    async startConversation()
    {
        if (this.isConnected) return
        
        try {
            console.log('Starting conversation...')
            this.updateUIStatus('Requesting microphone...')
            
            // Step 1: Get microphone access - exactly as per ElevenLabs guide
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            })
            
            console.log('Microphone access granted')
            this.updateUIStatus('Connecting to ElevenLabs...')
            
            // Step 2: Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume()
            }
            
            // Step 3: Create WebSocket connection - exactly as per official guide
            const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}`
            console.log('Connecting to:', wsUrl)
            
            this.websocket = new WebSocket(wsUrl)
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected')
                this.updateUIStatus('Authenticating...')
                
                // Step 4: Send authentication - exactly as per guide
                const authMessage = {
                    type: 'auth',
                    xi_api_key: this.apiKey
                }
                console.log('Sending auth message:', authMessage)
                this.websocket.send(JSON.stringify(authMessage))
            }
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event)
            }
            
            this.websocket.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason)
                this.isConnected = false
                this.isSpeaking = false
                this.stopAudioStreaming()
                this.updateUIStatus('Disconnected')
                this.updateUIButton()
                
                // Stop all tracks
                if (stream) {
                    stream.getTracks().forEach(track => track.stop())
                }
            }
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error)
                this.updateUIStatus('Connection failed')
            }
            
            // Store stream for later cleanup
            this.stream = stream
            
        } catch (error) {
            console.error('Failed to start conversation:', error)
            this.updateUIStatus('Error: ' + error.message)
        }
    }
    
    endConversation()
    {
        console.log('Ending conversation...')
        
        if (this.websocket) {
            this.websocket.close()
            this.websocket = null
        }
        
        this.stopAudioStreaming()
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop())
            this.stream = null
        }
        
        this.isConnected = false
        this.isSpeaking = false
        this.outputLevel = 0
        this.inputLevel = 0
        
        this.updateUIStatus('Disconnected')
        this.updateUIButton()
    }
    
    handleWebSocketMessage(event)
    {
        if (typeof event.data === 'string') {
            try {
                const message = JSON.parse(event.data)
                console.log('Received message:', message)
                
                switch (message.type) {
                    case 'conversation_initiation_metadata':
                        console.log('Conversation initiated successfully')
                        this.isConnected = true
                        this.updateUIStatus('Connected - Speak now!')
                        this.updateUIButton()
                        this.startAudioStreaming()
                        break
                        
                    case 'agent_response':
                        console.log('Agent response received')
                        break
                        
                    case 'user_transcript':
                        console.log('User transcript:', message.user_transcript)
                        this.updateUIStatus(`You: "${message.user_transcript}"`)
                        break
                        
                    case 'internal_tentative_agent_response':
                        console.log('Agent is thinking...')
                        this.updateUIStatus('AI is thinking...')
                        break
                        
                    case 'error':
                        console.error('ElevenLabs error:', message)
                        this.updateUIStatus('Error: ' + message.message)
                        break
                        
                    default:
                        console.log('Unknown message type:', message.type)
                }
            } catch (error) {
                console.error('Failed to parse message:', error)
            }
        } else {
            // Binary audio data from agent
            console.log('Received audio data:', event.data.byteLength, 'bytes')
            this.handleAudioResponse(event.data)
        }
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
            this.updateUIStatus('Listening...')
            this.updateUIButton()
            return
        }
        
        this.isPlaying = true
        this.isSpeaking = true
        this.updateUIStatus('AI is speaking...')
        this.updateUIButton()
        
        const audioData = this.audioQueue.shift()
        
        try {
            // Decode audio data - following ElevenLabs format
            const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0))
            
            // Create audio source
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
            console.log('Starting audio streaming...')
            
            // Create audio processing pipeline - exactly as per ElevenLabs guide
            const source = this.audioContext.createMediaStreamSource(this.stream)
            const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
            
            processor.onaudioprocess = (event) => {
                if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                    return
                }
                
                const inputBuffer = event.inputBuffer.getChannelData(0)
                
                // Convert to 16-bit PCM - exactly as per ElevenLabs guide
                const pcmData = new Int16Array(inputBuffer.length)
                for (let i = 0; i < inputBuffer.length; i++) {
                    const sample = Math.max(-1, Math.min(1, inputBuffer[i]))
                    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
                }
                
                // Send PCM data to ElevenLabs
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
            console.log('Audio streaming started')
            
        } catch (error) {
            console.error('Failed to start audio streaming:', error)
        }
    }
    
    stopAudioStreaming()
    {
        if (this.audioProcessor) {
            this.audioProcessor.disconnect()
            this.audioProcessor = null
            console.log('Audio streaming stopped')
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
    
    update()
    {
        this.updateVisualizer()
    }
    
    destroy()
    {
        this.endConversation()
        
        if (this.audioContext) {
            this.audioContext.close()
        }
        
        if (this.ui.container) {
            this.ui.container.remove()
        }
    }
}