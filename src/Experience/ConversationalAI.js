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
        this.isRecording = false
        this.isSpeaking = false
        
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
        
        // Audio processing
        this.audioWorkletNode = null
        this.stream = null
        
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder({
                title: 'Conversational AI',
                expanded: true
            })
            
            this.debugFolder.addButton({
                title: 'Start Conversation'
            }).on('click', () => {
                this.startConversation()
            })
            
            this.debugFolder.addButton({
                title: 'End Conversation'
            }).on('click', () => {
                this.endConversation()
            })
            
            // Add connection status display
            this.connectionStatus = { status: 'Disconnected' }
            this.debugFolder.addMonitor(this.connectionStatus, 'status', {
                label: 'Connection'
            })
        }
        
        this.init()
    }
    
    async init()
    {
        try {
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            })
            
            // Get microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            })
            
            console.log('ConversationalAI initialized successfully')
            
        } catch (error) {
            console.error('Failed to initialize ConversationalAI:', error)
            if(this.debug) {
                this.connectionStatus.status = 'Init Error: ' + error.message
            }
        }
    }
    
    async startConversation()
    {
        if (this.isConnected) {
            console.log('Already connected')
            return
        }
        
        try {
            console.log('Starting conversation...')
            if(this.debug) {
                this.connectionStatus.status = 'Connecting...'
            }
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume()
            }
            
            // Create WebSocket connection with proper URL format
            const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}`
            console.log('Connecting to:', wsUrl)
            
            this.websocket = new WebSocket(wsUrl)
            
            this.websocket.onopen = async () => {
                console.log('WebSocket connected')
                if(this.debug) {
                    this.connectionStatus.status = 'Authenticating...'
                }
                
                // Send authentication message
                const authMessage = {
                    type: 'auth',
                    xi_api_key: this.apiKey
                }
                
                console.log('Sending auth:', authMessage)
                this.websocket.send(JSON.stringify(authMessage))
            }
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event)
            }
            
            this.websocket.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason)
                this.isConnected = false
                this.stopRecording()
                if(this.debug) {
                    this.connectionStatus.status = `Disconnected (${event.code})`
                }
            }
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error)
                if(this.debug) {
                    this.connectionStatus.status = 'Connection Error'
                }
            }
            
        } catch (error) {
            console.error('Failed to start conversation:', error)
            if(this.debug) {
                this.connectionStatus.status = 'Error: ' + error.message
            }
        }
    }
    
    endConversation()
    {
        console.log('Ending conversation...')
        
        if (this.websocket) {
            this.websocket.close()
            this.websocket = null
        }
        
        this.stopRecording()
        this.isConnected = false
        this.isSpeaking = false
        this.outputLevel = 0
        
        if(this.debug) {
            this.connectionStatus.status = 'Disconnected'
        }
    }
    
    handleWebSocketMessage(event)
    {
        if (typeof event.data === 'string') {
            try {
                const message = JSON.parse(event.data)
                console.log('Received message:', message)
                
                switch (message.type) {
                    case 'conversation_initiation_metadata':
                        console.log('Conversation initiated:', message)
                        this.isConnected = true
                        if(this.debug) {
                            this.connectionStatus.status = 'Connected'
                        }
                        this.startRecording()
                        break
                        
                    case 'agent_response':
                        console.log('Agent response:', message)
                        break
                        
                    case 'user_transcript':
                        console.log('User transcript:', message.user_transcript)
                        break
                        
                    case 'internal_tentative_agent_response':
                        console.log('Tentative response:', message.tentative_agent_response)
                        break
                        
                    case 'error':
                        console.error('ElevenLabs error:', message)
                        if(this.debug) {
                            this.connectionStatus.status = 'Error: ' + message.message
                        }
                        break
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error)
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
            // Add to audio queue
            this.audioQueue.push(audioData)
            
            // Start playing if not already playing
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
            // Create audio buffer from PCM data
            const audioBuffer = this.audioContext.createBuffer(1, audioData.byteLength / 2, 16000)
            const channelData = audioBuffer.getChannelData(0)
            
            // Convert from 16-bit PCM to float32
            const view = new DataView(audioData)
            for (let i = 0; i < channelData.length; i++) {
                const sample = view.getInt16(i * 2, true) // little-endian
                channelData[i] = sample / 32768.0 // Convert to -1.0 to 1.0 range
            }
            
            // Create audio source
            const source = this.audioContext.createBufferSource()
            const gainNode = this.audioContext.createGain()
            const analyser = this.audioContext.createAnalyser()
            
            source.buffer = audioBuffer
            source.connect(gainNode)
            gainNode.connect(analyser)
            analyser.connect(this.audioContext.destination)
            
            // Set up audio analysis for visualization
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
            
            // Play audio
            source.start()
            
            source.onended = () => {
                // Continue with next audio in queue
                setTimeout(() => {
                    this.playAudioQueue()
                }, 50)
            }
            
        } catch (error) {
            console.error('Failed to play audio:', error)
            // Continue with next audio in queue
            this.playAudioQueue()
        }
    }
    
    async startRecording()
    {
        if (!this.stream || this.isRecording) {
            console.log('Cannot start recording - no stream or already recording')
            return
        }
        
        try {
            console.log('Starting audio recording...')
            
            // Create audio processing pipeline
            const source = this.audioContext.createMediaStreamSource(this.stream)
            const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
            
            processor.onaudioprocess = (event) => {
                if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                    return
                }
                
                const inputBuffer = event.inputBuffer.getChannelData(0)
                
                // Convert float32 to 16-bit PCM
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
            this.isRecording = true
            
            console.log('Recording started successfully')
            
        } catch (error) {
            console.error('Failed to start recording:', error)
        }
    }
    
    stopRecording()
    {
        if (this.audioProcessor) {
            this.audioProcessor.disconnect()
            this.audioProcessor = null
        }
        
        this.isRecording = false
        this.inputLevel = 0
        console.log('Recording stopped')
    }
    
    // Get combined audio level for sphere visualization
    getCombinedLevel()
    {
        return Math.max(this.inputLevel, this.outputLevel)
    }
    
    // Check if AI is currently speaking
    isAISpeaking()
    {
        return this.isSpeaking
    }
    
    update()
    {
        // Audio levels are updated in real-time via the audio processing callbacks
    }
    
    destroy()
    {
        this.endConversation()
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop())
        }
        
        if (this.audioContext) {
            this.audioContext.close()
        }
    }
}