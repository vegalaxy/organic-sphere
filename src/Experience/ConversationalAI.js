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
                    noiseSuppression: true
                }
            })
            
            console.log('ConversationalAI initialized successfully')
            
        } catch (error) {
            console.error('Failed to initialize ConversationalAI:', error)
        }
    }
    
    startConversation()
    {
        if (this.isConnected) return
        
        try {
            // Create WebSocket connection
            const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}`
            this.websocket = new WebSocket(wsUrl)
            
            this.websocket.onopen = () => {
                console.log('Connected to ElevenLabs')
                this.isConnected = true
                
                // Send authentication
                this.websocket.send(JSON.stringify({
                    type: 'auth',
                    xi_api_key: this.apiKey
                }))
                
                this.startRecording()
            }
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event)
            }
            
            this.websocket.onclose = () => {
                console.log('Disconnected from ElevenLabs')
                this.isConnected = false
                this.stopRecording()
            }
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error)
            }
            
        } catch (error) {
            console.error('Failed to start conversation:', error)
        }
    }
    
    endConversation()
    {
        if (this.websocket) {
            this.websocket.close()
        }
        this.stopRecording()
        this.isConnected = false
    }
    
    handleWebSocketMessage(event)
    {
        if (typeof event.data === 'string') {
            try {
                const message = JSON.parse(event.data)
                
                switch (message.type) {
                    case 'conversation_initiation_metadata':
                        console.log('Conversation initiated:', message)
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
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error)
            }
        } else {
            // Binary audio data from agent
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
            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice())
            
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
    
    startRecording()
    {
        if (!this.stream || this.isRecording) return
        
        try {
            // Create media recorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            })
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    // Convert to PCM and send
                    this.convertAndSendAudio(event.data)
                }
            }
            
            // Start recording in small chunks
            this.mediaRecorder.start(100)
            this.isRecording = true
            
            console.log('Started recording')
            
        } catch (error) {
            console.error('Failed to start recording:', error)
        }
    }
    
    stopRecording()
    {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop()
            this.isRecording = false
            console.log('Stopped recording')
        }
    }
    
    async convertAndSendAudio(webmBlob)
    {
        try {
            // Convert WebM to ArrayBuffer
            const arrayBuffer = await webmBlob.arrayBuffer()
            
            // Decode audio
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
            
            // Convert to 16-bit PCM
            const pcmData = this.audioBufferToPCM(audioBuffer)
            
            // Send to ElevenLabs
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(pcmData)
            }
            
        } catch (error) {
            console.error('Failed to convert and send audio:', error)
        }
    }
    
    audioBufferToPCM(audioBuffer)
    {
        const channelData = audioBuffer.getChannelData(0)
        const pcmData = new Int16Array(channelData.length)
        
        for (let i = 0; i < channelData.length; i++) {
            // Convert float32 to int16
            const sample = Math.max(-1, Math.min(1, channelData[i]))
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        }
        
        return pcmData.buffer
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
        // Update input level from existing microphone
        if (this.experience.microphone && this.experience.microphone.ready) {
            this.inputLevel = this.experience.microphone.volume
        }
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