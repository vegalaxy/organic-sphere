import Experience from './Experience.js'
import { Conversation } from '@elevenlabs/client'

export default class ConversationalAI
{
    constructor()
    {
        this.experience = new Experience()
        this.debug = this.experience.debug
        
        // ElevenLabs configuration - Replace with your actual credentials
        this.agentId = 'VKkqHVzHTMdhYVGSj8am'
        this.apiKey = 'sk_5eb294966f9b6ff79344c6fd5addb3edc4a97e5bceb339cc'
        
        // Connection state
        this.isConnected = false
        this.isSpeaking = false
        this.isInitializing = true
        
        // Audio levels for visualization
        this.inputLevel = 0
        this.outputLevel = 0
        
        // Conversation instance
        this.conversation = null
        
        // Auto-initialize
        this.createSplashScreen()
        this.createOffButton()
        this.createThemeSelector()
        this.autoInit()
    }
    
    createThemeSelector()
    {
        // Create theme selector UI
        this.themeSelector = document.createElement('div')
        this.themeSelector.className = 'ai-theme-selector'
        this.themeSelector.innerHTML = `
            <div class="ai-theme-button" data-theme="energetic" title="Energetic Assistant">⚡</div>
            <div class="ai-theme-button" data-theme="calm" title="Calm Therapist">🌊</div>
            <div class="ai-theme-button" data-theme="mysterious" title="Mysterious Oracle">🔮</div>
            <div class="ai-theme-button" data-theme="professional" title="Professional Assistant">💼</div>
            <div class="ai-theme-button" data-theme="warm" title="Warm Companion">🔥</div>
        `
        document.body.appendChild(this.themeSelector)
        
        // Add theme selector styles
        const style = document.createElement('style')
        style.textContent = `
            .ai-theme-selector {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 1000;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            .ai-theme-selector:hover {
                opacity: 1;
            }
            
            .ai-theme-button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                user-select: none;
            }
            
            .ai-theme-button:hover {
                transform: scale(1.1);
                background: rgba(0, 0, 0, 0.8);
                border-color: rgba(255, 255, 255, 0.3);
            }
            
            .ai-theme-button.active {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.5);
                transform: scale(1.05);
            }
            
            .ai-theme-selector.hidden {
                opacity: 0;
                pointer-events: none;
            }
        `
        document.head.appendChild(style)
        
        // Add click handlers
        this.themeSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('ai-theme-button')) {
                const theme = e.target.dataset.theme
                this.changeTheme(theme)
                
                // Update active state
                this.themeSelector.querySelectorAll('.ai-theme-button').forEach(btn => {
                    btn.classList.remove('active')
                })
                e.target.classList.add('active')
            }
        })
        
        // Set initial active theme
        this.themeSelector.querySelector('[data-theme="energetic"]').classList.add('active')
    }
    
    changeTheme(themeName)
    {
        // Get the sphere instance and change its theme
        if (this.experience && this.experience.world && this.experience.world.sphere) {
            this.experience.world.sphere.transitionToTheme(themeName)
        }
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
                <div class="ai-splash-error" style="display: none;">
                    <p class="ai-splash-error-text"></p>
                    <button class="ai-splash-retry">Retry Connection</button>
                </div>
            </div>
        `
        document.body.appendChild(this.splash)
        
        // Add splash screen styles
        this.addSplashStyles()
        
        // Add retry functionality
        this.splash.querySelector('.ai-splash-retry').addEventListener('click', () => {
            this.hideError()
            this.autoInit()
        })
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
                margin: 0 auto 2rem auto;
                overflow: hidden;
            }
            
            .ai-splash-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                border-radius: 1px;
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .ai-splash-error {
                margin-top: 2rem;
            }
            
            .ai-splash-error-text {
                color: #ff6b6b;
                font-size: 1rem;
                margin-bottom: 1rem;
            }
            
            .ai-splash-retry {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                padding: 12px 24px;
                border-radius: 25px;
                font-family: inherit;
                font-size: 1rem;
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            
            .ai-splash-retry:hover {
                transform: translateY(-2px);
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
    
    createOffButton()
    {
        // Create discrete toggle button
        this.toggleButton = document.createElement('button')
        this.toggleButton.className = 'ai-toggle-button'
        this.toggleButton.innerHTML = '<div class="ai-toggle-indicator"></div>'
        this.toggleButton.title = 'Toggle AI Connection'
        document.body.appendChild(this.toggleButton)
        
        // Add toggle button styles
        const style = document.createElement('style')
        style.textContent = `
            .ai-toggle-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.5);
                cursor: pointer;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                opacity: 0.6;
            }
            
            .ai-toggle-button:hover {
                opacity: 1;
                transform: scale(1.05);
            }
            
            .ai-toggle-button:active {
                transform: scale(0.95);
            }
            
            .ai-toggle-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ff6b6b;
                transition: background-color 0.3s ease;
            }
            
            .ai-toggle-button.connected .ai-toggle-indicator {
                background: #00ff88;
            }
            
            .ai-toggle-button.hidden {
                opacity: 0;
                pointer-events: none;
            }
        `
        document.head.appendChild(style)
        
        // Add toggle handler
        this.toggleButton.addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect()
            } else {
                this.autoInit()
            }
        })
        
        // Show button immediately (always visible)
        // Red dot = disconnected, Green dot = connected
    }
    
    disconnect()
    {
        if (this.conversation) {
            this.conversation.endSession()
            this.conversation = null
        }
        
        this.isConnected = false
        this.isSpeaking = false
        
        // Update toggle button to show disconnected state
        if (this.toggleButton) {
            this.toggleButton.classList.remove('connected')
            this.toggleButton.title = 'Connect AI'
        }
        
        console.log('AI conversation disconnected')
    }
    
    updateSplashStatus(status)
    {
        const statusElement = this.splash.querySelector('.ai-splash-status')
        if (statusElement) {
            statusElement.textContent = status
        }
    }
    
    updateProgress(percentage)
    {
        const progressBar = this.splash.querySelector('.ai-splash-progress-bar')
        if (progressBar) {
            progressBar.style.width = `${percentage}%`
        }
    }
    
    showError(message)
    {
        const errorElement = this.splash.querySelector('.ai-splash-error')
        const errorText = this.splash.querySelector('.ai-splash-error-text')
        const progressElement = this.splash.querySelector('.ai-splash-progress')
        
        if (errorElement && errorText && progressElement) {
            errorText.textContent = message
            errorElement.style.display = 'block'
            progressElement.style.display = 'none'
        }
    }
    
    hideError()
    {
        const errorElement = this.splash.querySelector('.ai-splash-error')
        const progressElement = this.splash.querySelector('.ai-splash-progress')
        
        if (errorElement && progressElement) {
            errorElement.style.display = 'none'
            progressElement.style.display = 'block'
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
            // Check credentials first
            if (!this.agentId || !this.apiKey || 
                this.agentId === 'YOUR_AGENT_ID_HERE' || 
                this.apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error('Please update your ElevenLabs Agent ID and API Key in ConversationalAI.js')
            }
            
            // Step 1: Request microphone permission
            this.updateSplashStatus('Requesting microphone access...')
            this.updateProgress(40)
            await this.delay(600)
            
            await navigator.mediaDevices.getUserMedia({ audio: true })
            
            // Step 2: Connect to ElevenLabs using SDK
            this.updateSplashStatus('Connecting to AI neural network...')
            this.updateProgress(60)
            await this.delay(800)
            
            await this.startConversation()
            
            // Step 3: Complete initialization
            this.updateSplashStatus('AI ready - speak naturally')
            this.updateProgress(100)
            await this.delay(1000)
            
            this.hideSplash()
            
            // Update toggle button to show connected state
            if (this.toggleButton) {
                this.toggleButton.classList.add('connected')
                this.toggleButton.title = 'Disconnect AI'
            }
            
        } catch (error) {
            console.error('Auto-initialization failed:', error)
            this.updateSplashStatus('Connection failed')
            this.updateProgress(0)
            
            let errorMessage = 'Connection failed. Please check your internet connection.'
            
            if (error.message && (error.message.includes('Agent ID') || error.message.includes('API Key'))) {
                errorMessage = 'Please update your ElevenLabs credentials in the code.'
            } else if (error.message && error.message.includes('microphone')) {
                errorMessage = 'Microphone access denied. Please allow microphone access and retry.'
            } else if (error.message && error.message.includes('agent')) {
                errorMessage = 'Failed to connect to ElevenLabs. Please check your API key and agent ID.'
            }
            
            this.showError(errorMessage)
        }
    }
    
    async startConversation()
    {
        return new Promise((resolve, reject) => {
            console.log('Starting ElevenLabs conversation...')
            
            // Start the conversation using ElevenLabs SDK
            Conversation.startSession({
                agentId: this.agentId,
                apiKey: this.apiKey,
                onConnect: () => {
                    console.log('AI conversation connected')
                    this.isConnected = true
                    
                    // Update toggle button
                    if (this.toggleButton) {
                        this.toggleButton.classList.add('connected')
                        this.toggleButton.title = 'Disconnect AI'
                    }
                    
                    resolve()
                },
                onDisconnect: () => {
                    console.log('AI conversation disconnected')
                    this.isConnected = false
                    this.isSpeaking = false
                    
                    // Update toggle button
                    if (this.toggleButton) {
                        this.toggleButton.classList.remove('connected')
                        this.toggleButton.title = 'Connect AI'
                    }
                },
                onError: (error) => {
                    console.error('ElevenLabs error:', error)
                    reject(new Error(`ElevenLabs error: ${error.message || error}`))
                },
                onModeChange: (mode) => {
                    if (mode && mode.mode) {
                        console.log('AI mode changed:', mode.mode)
                        this.isSpeaking = mode.mode === 'speaking'
                    
                        // Update audio levels based on mode
                        if (mode.mode === 'speaking') {
                            this.outputLevel = 0.8
                            this.inputLevel = 0
                        } else if (mode.mode === 'listening') {
                            this.outputLevel = 0
                            this.inputLevel = 0.5
                        } else {
                            this.outputLevel = 0
                            this.inputLevel = 0
                        }
                    }
                }
            }).then((conversation) => {
                this.conversation = conversation
                console.log('Conversation started successfully')
            }).catch((error) => {
                console.error('Failed to start conversation:', error)
                reject(error)
            })
            
            // Timeout after 15 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'))
                }
            }, 15000)
        })
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
        // Audio levels will decay over time for smooth visualization
        this.inputLevel *= 0.95
        this.outputLevel *= 0.95
    }
    
    destroy()
    {
        this.disconnect()
        
        if (this.splash) {
            this.splash.remove()
        }
        
        if (this.toggleButton) {
            this.toggleButton.remove()
        }
    }
}