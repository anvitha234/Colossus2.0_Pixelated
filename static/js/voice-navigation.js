/**
 * Enhanced Voice Navigation System for ReMind App
 * Designed for reliability across devices, particularly Android
 * Using direct speech recognition approach similar to AI assistant
 * Optimized for mobile browsers through Pingy
 */

// Create the namespace immediately to ensure availability
window.voiceNav = {
  isListening: false,
  recognition: null,
  startListening: null,
  stopListening: null,
  updateStatus: null,
  lastCommand: null,
  commandTimeout: null,
  retryCount: 0,
  maxRetries: 3,
  microphoneStream: null,
  permissionGranted: false,
  initialized: false,
  // Detect mobile devices with improved Android detection
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  // Specific Android detection
  isAndroid: /Android/i.test(navigator.userAgent),
  // Detect Android Chrome specifically
  isAndroidChrome: /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent),
  // Detect if running through Pingy (check for typical Pingy port or hostname)
  isPingy: window.location.port.match(/\d{4,5}/) !== null || 
          window.location.hostname.includes('localhost') || 
          window.location.hostname.match(/\d+\.\d+\.\d+\.\d+/) !== null
};

// Log environment information for debugging
console.log('Voice Navigation Environment:', {
  userAgent: navigator.userAgent,
  isMobile: window.voiceNav.isMobile,
  isAndroid: window.voiceNav.isAndroid,
  isAndroidChrome: window.voiceNav.isAndroidChrome,
  isPingy: window.voiceNav.isPingy,
  hostname: window.location.hostname,
  port: window.location.port,
  protocol: window.location.protocol
});

// Initialize voice navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing enhanced voice navigation system');
  console.log('Device detected as: ' + (window.voiceNav.isMobile ? 'Mobile' : 'Desktop'));
  if (window.voiceNav.isAndroid) {
    console.log('Android device detected - applying specific optimizations');
    // Add Android-specific class to body for CSS targeting
    document.body.classList.add('android-device');
  }
  console.log('Running via Pingy: ' + (window.voiceNav.isPingy ? 'Yes' : 'No'));
  
  try {
    initializeVoiceNavigation();
  } catch (err) {
    console.error('Error during voice navigation initialization:', err);
    window.voiceNav.initializationError = err.message;
  }

  // For Android devices, add a reload button to help with permission issues
  if (window.voiceNav.isAndroid) {
    addAndroidHelpers();
  }
});

/**
 * Add specific helper elements for Android devices
 */
function addAndroidHelpers() {
  // Add a fix button that appears when issues are detected
  const fixButton = document.createElement('button');
  fixButton.id = 'androidVoiceFixButton';
  fixButton.className = 'btn btn-warning btn-sm voice-android-fix';
  fixButton.innerHTML = '<i class="fas fa-wrench me-1"></i> Fix Voice';
  fixButton.style.display = 'none'; // Hidden by default
  
  // Position it near the voice button
  fixButton.style.position = 'fixed';
  fixButton.style.bottom = '90px';
  fixButton.style.right = '20px';
  fixButton.style.zIndex = '1000';
  fixButton.style.padding = '8px 12px';
  fixButton.style.borderRadius = '20px';
  
  fixButton.addEventListener('click', function() {
    // Reset the voice recognition system
    resetVoiceNavigation();
  });
  
  document.body.appendChild(fixButton);
  
  // Show the fix button after a delay if we detect issues
  setTimeout(checkAndroidVoiceStatus, 5000);
}

/**
 * Check Android voice recognition status and show fix button if needed
 */
function checkAndroidVoiceStatus() {
  const fixButton = document.getElementById('androidVoiceFixButton');
  if (!fixButton) return;
  
  if (window.voiceNav.isAndroid && !window.voiceNav.permissionGranted) {
    console.log('Android voice permission issue detected - showing fix button');
    fixButton.style.display = 'block';
  } else {
    fixButton.style.display = 'none';
  }
}

/**
 * Reset the voice navigation system for Android
 */
function resetVoiceNavigation() {
  console.log('Resetting voice navigation for Android');
  
  // Stop any active recognition
  if (window.voiceNav.recognition) {
    try {
      window.voiceNav.recognition.stop();
    } catch (e) {
      console.warn('Error stopping recognition during reset:', e);
    }
  }
  
  // Release any existing microphone stream
  if (window.voiceNav.microphoneStream) {
    try {
      window.voiceNav.microphoneStream.getTracks().forEach(track => track.stop());
      window.voiceNav.microphoneStream = null;
    } catch (e) {
      console.warn('Error releasing microphone stream:', e);
    }
  }
  
  // Show status update
  showVoiceStatus('Resetting voice navigation...', 2000);
  
  // Re-request microphone permission with a delay for Android
  setTimeout(function() {
    // First clear any existing recognition object
    window.voiceNav.recognition = null;
    window.voiceNav.isListening = false;
    window.voiceNav.permissionGranted = false;
    
    // Request fresh permission
    requestMicrophonePermission();
    
    // Reinitialize after a short delay
    setTimeout(function() {
      try {
        initializeVoiceNavigation();
        showVoiceStatus('Voice navigation reset complete', 2000);
      } catch (err) {
        console.error('Error reinitializing voice navigation:', err);
        showVoiceStatus('Could not reset voice navigation', 2000);
      }
    }, 1000);
  }, 500);
}

/**
 * Show a helper modal when microphone permission is denied
 */
function showPermissionHelper() {
  // Check if we already have a modal
  let helperModal = document.getElementById('micPermissionHelperModal');
  
  // Create modal if it doesn't exist
  if (!helperModal) {
    // Create modal elements
    helperModal = document.createElement('div');
    helperModal.id = 'micPermissionHelperModal';
    helperModal.className = 'modal fade';
    helperModal.setAttribute('tabindex', '-1');
    helperModal.setAttribute('aria-hidden', 'true');
    
    // Special instructions for Android
    const androidInstructions = window.voiceNav.isAndroid ? `
      <div class="alert alert-warning mt-2">
        <strong>For Android:</strong>
        <ol>
          <li>Look for the microphone icon in Chrome's address bar</li>
          <li>Make sure Chrome has microphone permission in your device settings</li>
          <li>Try refreshing the page or using the "Fix Voice" button</li>
        </ol>
      </div>
    ` : '';
    
    const modalHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-microphone me-2"></i>Microphone Access Needed
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <strong>Voice navigation requires microphone access to work.</strong>
            </div>
            <p>You've denied microphone access, which means you won't be able to use voice commands to navigate the app.</p>
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              <strong>How to enable microphone access:</strong>
              <ol class="mb-0 mt-2">
                <li>Look for the microphone icon in your browser's address bar</li>
                <li>Click it and select "Allow" for this site</li>
                <li>Refresh the page after granting permission</li>
              </ol>
            </div>
            ${androidInstructions}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="retryPermissionBtn">
              <i class="fas fa-redo me-2"></i>Try Again
            </button>
          </div>
        </div>
      </div>
    `;
    
    helperModal.innerHTML = modalHTML;
    document.body.appendChild(helperModal);
    
    // Add event listener to retry button
    const retryBtn = document.getElementById('retryPermissionBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        // Close modal
        const modalInstance = bootstrap.Modal.getInstance(helperModal);
        if (modalInstance) modalInstance.hide();
        
        // Try requesting permission again
        setTimeout(requestMicrophonePermission, 500);
      });
    }
  }
  
  // Show the modal
  try {
    const modalInstance = new bootstrap.Modal(helperModal);
    modalInstance.show();
  } catch (error) {
    console.error('Error showing modal:', error);
  }
}

/**
 * Request microphone permission once at the beginning
 * With special handling for Android devices
 */
function requestMicrophonePermission() {
  try {
    console.log('Requesting microphone permission on page load');
    
    // For Android, show a pre-permission message
    if (window.voiceNav.isAndroid) {
      showVoiceStatus('Tap to enable microphone access', 3000);
    }
    
    // Special constraints for Android to improve reliability
    const constraints = { 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    };
    
    // Special handling for Android Chrome which has stricter policies
    if (window.voiceNav.isAndroidChrome) {
      console.log('Using Android Chrome-specific approach for permissions');
      
      // For Android Chrome, we use a prompt-first approach
      showVoiceStatus('Please tap the mic button to enable voice', 4000);
      
      // Store this for later use when user taps button
      window.voiceNav.permissionRequested = false;
      
      // Add helper message for Android Chrome users
      const chromeHelper = document.createElement('div');
      chromeHelper.style.position = 'fixed';
      chromeHelper.style.bottom = '140px';
      chromeHelper.style.right = '20px';
      chromeHelper.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      chromeHelper.style.padding = '8px 12px';
      chromeHelper.style.borderRadius = '8px';
      chromeHelper.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      chromeHelper.style.zIndex = '1000';
      chromeHelper.style.fontSize = '14px';
      chromeHelper.style.maxWidth = '200px';
      chromeHelper.style.textAlign = 'center';
      chromeHelper.innerHTML = '<i class="fas fa-info-circle text-primary me-1"></i> Tap microphone button and allow access when prompted';
      document.body.appendChild(chromeHelper);
      
      // Only show for 10 seconds
      setTimeout(() => {
        chromeHelper.style.display = 'none';
      }, 10000);
      
      return; // Skip immediate permission request for Android Chrome
    }
    
    // Request permission upfront for other browsers
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        console.log('Microphone permission granted on page load');
        
        // For Android, we keep the stream active to maintain permission
        window.voiceNav.microphoneStream = stream;
        window.voiceNav.permissionGranted = true;
        
        // Update the Android fix button visibility
        if (window.voiceNav.isAndroid) {
          const fixButton = document.getElementById('androidVoiceFixButton');
          if (fixButton) fixButton.style.display = 'none';
        }
        
        // Let the user know permission was granted
        showVoiceStatus('Voice navigation ready', 2000);
        
        // Dispatch permission granted event
        document.dispatchEvent(new CustomEvent('voicePermissionGranted'));
      })
      .catch(function(error) {
        console.error('Microphone permission denied on page load:', error);
        window.voiceNav.permissionGranted = false;
        
        // For Android, show a more specific error
        if (window.voiceNav.isAndroid) {
          showVoiceStatus('Microphone access needed for voice commands', 4000);
          
          // Show the Android fix button
          const fixButton = document.getElementById('androidVoiceFixButton');
          if (fixButton) fixButton.style.display = 'block';
        }
        
        // Dispatch permission denied event
        document.dispatchEvent(new CustomEvent('voicePermissionDenied'));
        
        // Show the helper modal after a short delay
        setTimeout(showPermissionHelper, 1000);
      });
  } catch (error) {
    console.error('Error requesting initial microphone permission:', error);
    
    // Dispatch permission error event
    document.dispatchEvent(new CustomEvent('voicePermissionDenied', {
      detail: 'Error requesting permission: ' + error.message
    }));
  }
}

/**
 * Main initialization function - uses direct SpeechRecognition API similar to AI assistant
 * Optimized for mobile browsers, with special handling for Android
 */
function initializeVoiceNavigation() {
  // Feature detection - need to check for webkit prefix for mobile Safari
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('Speech recognition not supported in this browser');
    showVoiceStatus('Voice navigation not available on this browser', 3000);
    disableVoiceButton();
    window.voiceNav.initialized = false;
    return;
  }
  
  try {
    // Set up elements
    const voiceButton = document.getElementById('voiceNavButton');
    const statusIndicator = document.getElementById('voice-status-indicator');
    
    if (!voiceButton || !statusIndicator) {
      throw new Error('Voice navigation UI elements not found');
    }
    
    // Create and configure recognition object with mobile and Android optimization
    const recognition = new SpeechRecognition();
    
    // For Android devices, use specific settings that work better
    if (window.voiceNav.isAndroid) {
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3; // Get more alternatives for better matching on Android
    } else {
      // Non-Android settings
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
    }
    
    recognition.lang = 'en-US';
    
    // Adjust for mobile browsers - shorter timeouts and Android-specific handling
    if (window.voiceNav.isMobile) {
      console.log('Configuring for mobile browser');
      
      // Android-specific configurations
      if (window.voiceNav.isAndroid) {
        console.log('Applying Android-specific configurations');
      }
      
      // Pingy connection handling remains the same
      if (window.voiceNav.isPingy) {
        console.log('Applying Pingy-specific configuration');
        // Rest of Pingy code remains the same...
        
        // On Pingy through mobile, show a prompt to the user
        showVoiceStatus('Touch microphone button to enable voice navigation', 5000);
        
        // Add a special class to the body for Pingy-specific CSS
        document.body.classList.add('pingy-connection');
        
        // For Pingy deployments, we need a user interaction before starting recognition
        // Show an initial message explaining this
        const pingyMessage = document.createElement('div');
        pingyMessage.className = 'pingy-message';
        pingyMessage.innerHTML = `
          <div class="pingy-alert">
            <h4>Voice Navigation on Mobile</h4>
            <p>Please tap the microphone button to enable voice navigation.</p>
            <p>You may need to allow microphone permissions when prompted.</p>
            <button class="btn btn-primary" id="pingyDismiss">Got it</button>
          </div>
        `;
        document.body.appendChild(pingyMessage);
        
        // Add event listener to dismiss button
        document.getElementById('pingyDismiss')?.addEventListener('click', function() {
          pingyMessage.style.display = 'none';
        });
        
        // For Android on Pingy, add an extra helper message
        if (window.voiceNav.isAndroid) {
          const androidTip = document.createElement('p');
          androidTip.className = 'mt-2 text-warning';
          androidTip.innerHTML = '<strong>Android Tip:</strong> Tap the microphone icon and allow access when prompted!';
          document.querySelector('.pingy-alert')?.appendChild(androidTip);
        }
      }
    }
    
    // Store in global namespace
    window.voiceNav.recognition = recognition;
    
    // Set up recognition events - with Android-specific optimizations
    recognition.onstart = function() {
      window.voiceNav.isListening = true;
      statusIndicator.textContent = 'Listening...';
      statusIndicator.classList.add('visible');
      statusIndicator.classList.add('listening');
      voiceButton.classList.add('listening');
      
      // For Android, make the visual indicator very obvious
      if (window.voiceNav.isAndroid) {
        statusIndicator.style.opacity = '1';
        statusIndicator.style.transform = 'scale(1.2)';
        statusIndicator.style.background = 'rgba(40, 167, 69, 0.9)';
        statusIndicator.style.color = 'white';
        statusIndicator.style.fontWeight = 'bold';
      }
      // Make the status more visible on all mobile devices
      else if (window.voiceNav.isMobile) {
        statusIndicator.style.opacity = '1';
        statusIndicator.style.transform = 'scale(1.1)';
        
        // Special handling for Pingy connections
        if (window.voiceNav.isPingy) {
          // Make status extra visible for Pingy connections
          statusIndicator.style.background = 'rgba(220, 53, 69, 0.9)';
          statusIndicator.style.color = '#fff';
          statusIndicator.style.fontWeight = 'bold';
        }
      }
      
      // Dispatch custom event
      document.dispatchEvent(new CustomEvent('voiceNavStarted'));
      
      console.log('Speech recognition started');
      
      // On mobile and especially Android, we need to add a timeout to prevent hanging recognition sessions
      if (window.voiceNav.isMobile) {
        if (window.voiceNav.mobileTimeout) {
          clearTimeout(window.voiceNav.mobileTimeout);
        }
        
        // Set a safety timeout - mobile browsers sometimes don't fire onend
        // Use an even shorter timeout for Android devices
        let timeoutDuration = 10000; // Default
        if (window.voiceNav.isPingy) {
          timeoutDuration = 7000; // Shorter for Pingy
        }
        if (window.voiceNav.isAndroid) {
          timeoutDuration = 6000; // Even shorter for Android
        }
        
        window.voiceNav.mobileTimeout = setTimeout(function() {
          if (window.voiceNav.isListening) {
            console.log(`Mobile safety timeout (${timeoutDuration}ms): forcing recognition to stop`);
            try {
              recognition.stop();
            } catch (e) {
              console.warn('Error stopping recognition in timeout:', e);
              // Manually reset state if stop fails
              window.voiceNav.isListening = false;
              voiceButton.classList.remove('listening');
              statusIndicator.classList.remove('listening');
              statusIndicator.classList.remove('visible');
              voiceButton.disabled = false;
            }
          }
        }, timeoutDuration);
      }
    };
    
    // Enhanced results processing for Android
    recognition.onresult = function(event) {
      try {
        // Get transcript with special handling for Android (which may need different alternatives)
        let transcript = '';
        
        if (window.voiceNav.isAndroid && event.results[0].length > 1) {
          // For Android, check multiple alternatives for better matching
          console.log('Android: checking multiple recognition alternatives');
          const alternatives = Array.from(event.results[0]).map(result => result.transcript.trim().toLowerCase());
          console.log('Recognition alternatives:', alternatives);
          
          // First try to find commands in alternatives
          for (const alt of alternatives) {
            if (isValidCommand(alt)) {
              transcript = alt;
              console.log('Found valid command in alternative:', transcript);
              break;
            }
          }
          
          // If no valid command found, use the top result
          if (!transcript) {
            transcript = alternatives[0];
          }
        } else {
          // Standard processing for other platforms
          transcript = event.results[0][0].transcript.trim().toLowerCase();
        }
        
        console.log(`Recognized: "${transcript}"`);
        
        // Show what was heard
        statusIndicator.textContent = `I heard: ${transcript}`;
        statusIndicator.classList.add('visible');
        
        // Process the command
        processVoiceCommand(transcript);
        
        // Dispatch custom event with the result
        document.dispatchEvent(new CustomEvent('voiceNavResult', {
          detail: transcript
        }));
        
        // Store the last successful command
        window.voiceNav.lastCommand = transcript;
      } catch (error) {
        console.error('Error processing speech result:', error);
        showVoiceStatus('Could not understand command', 2000);
        
        // For Android, provide more helpful feedback
        if (window.voiceNav.isAndroid) {
          showVoiceStatus('Please try speaking more clearly', 3000);
        }
        
        // Dispatch error event
        document.dispatchEvent(new CustomEvent('voiceNavError', {
          detail: 'Recognition result processing failed'
        }));
      }
    };
    
    recognition.onerror = function(event) {
      console.error('Recognition error:', event.error);
      
      let errorMessage = 'Recognition error';
      
      // Handle specific error types with mobile optimizations
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied';
          window.voiceNav.permissionGranted = false;
          
          // On mobile, we need to be more explicit about permission instructions
          if (window.voiceNav.isMobile) {
            errorMessage = 'Microphone permission needed - check browser settings';
          }
          
          // Show permission helper
          setTimeout(showPermissionHelper, 1000);
          break;
        case 'network':
          errorMessage = 'Network error - check your connection';
          break;
        case 'aborted':
          errorMessage = 'Recognition aborted';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected';
          // Give feedback similar to AI assistant
          speakResponse('I didn\'t hear anything. Please try again.');
          break;
        case 'audio-capture':
          // This is common on mobile when the microphone isn't working properly
          errorMessage = 'Could not access microphone';
          if (window.voiceNav.isMobile) {
            errorMessage = 'Microphone access problem - try reloading the page';
          }
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      showVoiceStatus(errorMessage, 3000);
      
      // Dispatch error event
      document.dispatchEvent(new CustomEvent('voiceNavError', {
        detail: errorMessage
      }));
      
      // Clear any mobile timeout
      if (window.voiceNav.mobileTimeout) {
        clearTimeout(window.voiceNav.mobileTimeout);
        window.voiceNav.mobileTimeout = null;
      }
    };
    
    recognition.onend = function() {
      console.log('Recognition ended');
      
      // Reset state
      window.voiceNav.isListening = false;
      voiceButton.classList.remove('listening');
      statusIndicator.classList.remove('listening');
      
      // Reset mobile-specific styles
      if (window.voiceNav.isMobile) {
        statusIndicator.style.opacity = '';
        statusIndicator.style.transform = '';
      }
      
      // Dispatch custom event
      document.dispatchEvent(new CustomEvent('voiceNavStopped'));
      
      // Enable button
      if (voiceButton) {
        voiceButton.disabled = false;
      }
      
      // Hide status after a delay
      setTimeout(() => {
        statusIndicator.classList.remove('visible');
      }, 2000);
      
      // Clear any mobile timeout
      if (window.voiceNav.mobileTimeout) {
        clearTimeout(window.voiceNav.mobileTimeout);
        window.voiceNav.mobileTimeout = null;
      }
    };
    
    // Set up button click handler with special Android touch handling
    if (voiceButton) {
      // For Android and other mobile, we need better touch event handling
      const startHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Visual feedback for touch
        voiceButton.classList.add('active');
        
        // For Android, add vibration feedback if available
        if (window.voiceNav.isAndroid && navigator.vibrate) {
          navigator.vibrate(50); // short vibration for feedback
        }
        
        // Special handling for Android Chrome - request permission directly on button tap
        if (window.voiceNav.isAndroidChrome && !window.voiceNav.permissionGranted && !window.voiceNav.permissionRequested) {
          console.log('Android Chrome: requesting microphone permission on button tap');
          window.voiceNav.permissionRequested = true;
          
          showVoiceStatus('Requesting microphone access...', 3000);
          
          // Request permission with specific constraints for Android
          const constraints = { 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          };
          
          navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
              console.log('Microphone permission granted on button tap');
              
              // Store the stream and update state
              window.voiceNav.microphoneStream = stream;
              window.voiceNav.permissionGranted = true;
              
              // Now start recognition after a short delay
              setTimeout(() => {
                try {
                  recognition.start();
                } catch (err) {
                  console.error('Error starting recognition after permission:', err);
                  voiceButton.disabled = false;
                  showVoiceStatus('Error starting voice recognition', 2000);
                }
              }, 500);
            })
            .catch(function(error) {
              console.error('Microphone permission denied on button tap:', error);
              window.voiceNav.permissionGranted = false;
              voiceButton.disabled = false;
              
              showVoiceStatus('Microphone access denied. Voice commands unavailable.', 3000);
              
              // Show the Android fix button
              const fixButton = document.getElementById('androidVoiceFixButton');
              if (fixButton) fixButton.style.display = 'block';
            });
          
          return; // Exit early - we'll handle recognition after permission response
        }
        
        if (window.voiceNav.isListening) {
          try {
            recognition.stop();
          } catch (error) {
            console.warn('Error stopping recognition:', error);
          }
        } else {
          try {
            // Disable button temporarily to prevent double-clicks
            voiceButton.disabled = true;
            
            // For Android, we need a longer delay to ensure proper initialization
            if (window.voiceNav.isAndroid) {
              showVoiceStatus('Starting voice recognition...', 2000);
              setTimeout(() => {
                try {
                  recognition.start();
                } catch (err) {
                  console.error('Error starting recognition after delay:', err);
                  voiceButton.disabled = false;
                  showVoiceStatus('Error starting voice recognition', 2000);
                  
                  // For Android, show fix button on error
                  const fixButton = document.getElementById('androidVoiceFixButton');
                  if (fixButton) fixButton.style.display = 'block';
                }
              }, 500); // longer delay for Android
            } 
            // For other mobile devices
            else if (window.voiceNav.isMobile) {
              showVoiceStatus('Starting voice recognition...', 2000);
              setTimeout(() => {
                try {
                  recognition.start();
                } catch (err) {
                  console.error('Error starting recognition after delay:', err);
                  voiceButton.disabled = false;
                  showVoiceStatus('Error starting voice recognition', 2000);
                }
              }, 300);
            } else {
              recognition.start();
            }
          } catch (error) {
            console.error('Error starting recognition:', error);
            voiceButton.disabled = false;
            
            // Try to reinitialize if there's an error
            if (error.name === 'InvalidStateError') {
              try {
                recognition.stop();
                setTimeout(() => {
                  recognition.start();
                }, 300);
              } catch (e) {
                showVoiceStatus('Speech recognition error. Please try again.', 2000);
                speakResponse('Speech recognition error. Please try again.');
              }
            } else {
              showVoiceStatus('Could not start voice recognition', 2000);
              speakResponse('Could not start voice recognition. Please try again.');
              
              // For Android-specific errors, show the fix button
              if (window.voiceNav.isAndroid) {
                const fixButton = document.getElementById('androidVoiceFixButton');
                if (fixButton) fixButton.style.display = 'block';
              }
            }
          }
        }
      };
      
      const endHandler = function() {
        voiceButton.classList.remove('active');
      };
      
      // Add both touch and click handlers for better mobile support
      voiceButton.addEventListener('click', startHandler);
      
      // For mobile, add touch events with passive: false to prevent scrolling
      if (window.voiceNav.isMobile) {
        voiceButton.addEventListener('touchstart', startHandler, { passive: false });
        voiceButton.addEventListener('touchend', endHandler, { passive: false });
      }
    }
    
    // Export public methods
    window.voiceNav.startListening = function() {
      if (recognition && !window.voiceNav.isListening) {
        try {
          voiceButton.disabled = true;
          
          // For mobile, add a slight delay
          if (window.voiceNav.isMobile) {
            setTimeout(() => {
              recognition.start();
            }, 300);
          } else {
            recognition.start();
          }
        } catch (error) {
          console.error('Error starting recognition:', error);
          voiceButton.disabled = false;
          
          if (error.name === 'InvalidStateError') {
            try {
              recognition.stop();
              setTimeout(() => {
                recognition.start();
              }, 300);
            } catch (e) {
              showVoiceStatus('Speech recognition error. Please try again.', 2000);
            }
          }
        }
      }
    };
    
    window.voiceNav.stopListening = function() {
      if (recognition && window.voiceNav.isListening) {
        try {
          recognition.stop();
        } catch (error) {
          console.warn('Error stopping recognition:', error);
        }
      }
      
      // Clear any mobile timeout
      if (window.voiceNav.mobileTimeout) {
        clearTimeout(window.voiceNav.mobileTimeout);
        window.voiceNav.mobileTimeout = null;
      }
    };
    
    // Signal successful initialization
    showVoiceStatus('Voice navigation ready', 2000);
    
    // Only speak on desktop to avoid autoplay issues on mobile
    if (!window.voiceNav.isMobile) {
      speakResponse('Voice navigation ready');
    }
    
    console.log('Voice navigation initialized successfully');
    
    // Set initialized flag
    window.voiceNav.initialized = true;
    window.voiceNav.permissionGranted = true;
    
  } catch (error) {
    console.error('Error initializing voice navigation:', error);
    showVoiceStatus('Voice navigation initialization failed', 3000);
    disableVoiceButton();
    window.voiceNav.initialized = false;
    window.voiceNav.initializationError = error.message;
  }
}

/**
 * Check if the transcript contains a valid command
 */
function isValidCommand(transcript) {
  const commandPatterns = [
    /home|dashboard/i,
    /task/i,
    /medication|medicine/i,
    /note/i,
    /memory training|memory.*train/i,
    /photo|album|memories|picture|reminiscence/i,
    /assistant|help me|talk to|chat/i,
    /logout|sign out/i,
    /fitness/i
  ];
  
  return commandPatterns.some(pattern => pattern.test(transcript));
}

/**
 * Process a recognized voice command
 */
function processVoiceCommand(command) {
  // Simple command mapping
  if (command.includes('home') || command.includes('dashboard')) {
    navigateToPage('user_dashboard');
  } 
  else if (command.includes('task')) {
    navigateToPage('tasks');
  }
  else if (command.includes('medication') || command.includes('medicine')) {
    navigateToPage('medications');
  }
  else if (command.includes('note')) {
    navigateToPage('notes');
  }
  else if ((command.includes('memory') && command.includes('train')) || 
          command.includes('memory training')) {
    navigateToPage('memory_training');
  }
  else if (command.includes('photo') || command.includes('album') || 
          command.includes('memories') || command.includes('picture') ||
          command.includes('reminiscence')) {
    navigateToPage('reminiscence_therapy');
  }
  else if (command.includes('assistant') || command.includes('help me') ||
          command.includes('talk to') || command.includes('chat')) {
    navigateToPage('ai_assistant');
  }
  else if (command.includes('logout') || command.includes('sign out')) {
    navigateToPage('logout');
  }
  else if (command.includes('fitness')) {
    navigateToPage('fitness_dashboard');
  }
  else {
    showVoiceStatus('Command not recognized', 3000);
    speakResponse('I did not understand that command. Please try again.');
  }
}

/**
 * Navigate to a specific page
 */
function navigateToPage(route) {
  // Show visual feedback
  showVoiceStatus(`Going to ${route.replace(/_/g, ' ')}...`, 0);
  
  // Create a smooth transition effect for the page
  const content = document.querySelector('.container');
  if (content) {
    content.style.transition = 'opacity 0.4s ease';
    content.style.opacity = '0.7';
  }
  
  // Speak the navigation confirmation
  speakResponse(`Navigating to ${route.replace(/_/g, ' ')}`);
  
  // Calculate appropriate delay based on the environment
  let navigationDelay = 2000; // Default 2 seconds
  
  // Use a shorter delay on Pingy connections to prevent timeout issues
  if (window.voiceNav.isPingy && window.voiceNav.isMobile) {
    navigationDelay = 1500; // 1.5 seconds for Pingy mobile
  } else if (window.voiceNav.isMobile) {
    navigationDelay = 1800; // 1.8 seconds for mobile
  }
  
  // Clear any existing navigation timeout
  if (window.voiceNav.commandTimeout) {
    clearTimeout(window.voiceNav.commandTimeout);
  }
  
  // Set the navigation timeout with the appropriate delay
  window.voiceNav.commandTimeout = setTimeout(function() {
    // Show a loading spinner or transition animation
    if (window.voiceNav.isMobile) {
      // Create a temporary overlay for mobile transitions to make it feel smoother
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
      overlay.style.zIndex = '9999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.transition = 'opacity 0.3s ease';
      
      const spinner = document.createElement('div');
      spinner.className = 'spinner-border text-primary';
      spinner.setAttribute('role', 'status');
      spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
      
      overlay.appendChild(spinner);
      document.body.appendChild(overlay);
    }
    
    // Finally, navigate to the route
    window.location.href = '/' + route;
  }, navigationDelay);
}

/**
 * Update the appearance of the voice button
 */
function updateButtonAppearance(isListening) {
  const button = document.getElementById('voiceNavButton');
  if (!button) return;
  
  if (isListening) {
    button.classList.add('listening');
    const icon = button.querySelector('i');
    if (icon) icon.className = 'fas fa-microphone-slash';
  } else {
    button.classList.remove('listening');
    const icon = button.querySelector('i');
    if (icon) icon.className = 'fas fa-microphone';
  }
}

/**
 * Display status message in the status indicator
 */
function showVoiceStatus(message, duration) {
  const indicator = document.getElementById('voice-status-indicator');
  if (!indicator) return;
  
  // Update the indicator text
  indicator.textContent = message;
  
  // Make it visible
  indicator.classList.add('visible');
  
  // Add listening class if appropriate
  if (message.toLowerCase().includes('listening')) {
    indicator.classList.add('listening');
  } else {
    indicator.classList.remove('listening');
  }
  
  // Hide after duration (if specified)
  if (duration > 0) {
    setTimeout(function() {
      indicator.classList.remove('visible');
    }, duration);
  }
}

/**
 * Disable the voice button if voice navigation is unavailable
 */
function disableVoiceButton() {
  const button = document.getElementById('voiceNavButton');
  if (!button) return;
  
  button.disabled = true;
  button.classList.add('disabled');
  button.title = 'Voice navigation not available on this device';
}

/**
 * Speak a response using speech synthesis
 */
function speakResponse(text) {
  if (!('speechSynthesis' in window)) return;
  
  try {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1.0;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Speak
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Speech synthesis error:', error);
  }
}

// Add page visibility handler to manage permission state
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    // Page is visible again, check permission state
    if (!window.voiceNav.permissionGranted || !window.voiceNav.microphoneStream) {
      requestMicrophonePermission();
    }
  }
});

// Clean up when page is unloaded
window.addEventListener('beforeunload', function() {
  // Release microphone resources when page is closed
  if (window.voiceNav.microphoneStream) {
    window.voiceNav.microphoneStream.getTracks().forEach(track => track.stop());
  }
});

// Add browser compatibility checking function
window.checkVoiceNavCompatibility = function() {
  const results = {
    browser: navigator.userAgent,
    speechRecognitionSupported: false,
    speechSynthesisSupported: false, 
    mediaDevicesSupported: false,
    getUserMediaSupported: false,
    initializationStatus: window.voiceNav ? window.voiceNav.initialized : false,
    errorMessages: []
  };
  
  // Check basic Speech API support
  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    results.speechRecognitionSupported = true;
  } else {
    results.errorMessages.push('Speech Recognition API not supported in this browser');
  }
  
  // Check speech synthesis support
  if ('speechSynthesis' in window) {
    results.speechSynthesisSupported = true;
  } else {
    results.errorMessages.push('Speech Synthesis API not supported in this browser');
  }
  
  // Check media devices API support
  if (navigator.mediaDevices) {
    results.mediaDevicesSupported = true;
    
    if (navigator.mediaDevices.getUserMedia) {
      results.getUserMediaSupported = true;
    } else {
      results.errorMessages.push('getUserMedia not supported in this browser');
    }
  } else {
    results.errorMessages.push('MediaDevices API not supported in this browser');
  }
  
  // Check if voice nav has been initialized
  if (window.voiceNav) {
    results.voiceNavState = {
      isListening: window.voiceNav.isListening,
      hasRecognitionObject: !!window.voiceNav.recognition,
      hasStartListeningFunction: typeof window.voiceNav.startListening === 'function',
      permissionGranted: window.voiceNav.permissionGranted,
      hasMicrophoneStream: !!window.voiceNav.microphoneStream,
      initializationError: window.voiceNav.initializationError || 'None'
    };
  } else {
    results.errorMessages.push('voiceNav object not initialized');
  }
  
  console.log('Voice Navigation Compatibility Check:', results);
  return results;
};

// Automatically run the compatibility check after a delay
setTimeout(function() {
  if (!window.voiceNav || !window.voiceNav.initialized) {
    console.warn('Voice navigation not properly initialized, running compatibility check...');
    window.checkVoiceNavCompatibility();
  }
}, 3000);

// Export fix function to help users repair voice navigation issues
window.fixVoiceNavigation = function() {
  console.log('Attempting to fix voice navigation...');
  
  // First check if voiceNav exists
  if (!window.voiceNav) {
    console.error('voiceNav object missing, recreating...');
    window.voiceNav = {
      isListening: false,
      recognition: null,
      startListening: null,
      stopListening: null,
      updateStatus: null,
      lastCommand: null,
      commandTimeout: null,
      retryCount: 0,
      maxRetries: 3,
      microphoneStream: null,
      permissionGranted: false,
      initialized: false,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isPingy: window.location.port.match(/\d{4,5}/) !== null || 
              window.location.hostname.includes('localhost') || 
              window.location.hostname.match(/\d+\.\d+\.\d+\.\d+/) !== null
    };
  }
  
  // Try to initialize
  try {
    initializeVoiceNavigation();
    requestMicrophonePermission();
    return true;
  } catch (err) {
    console.error('Failed to fix voice navigation:', err);
    return false;
  }
};