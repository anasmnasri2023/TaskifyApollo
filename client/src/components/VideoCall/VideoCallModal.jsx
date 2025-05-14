import React, { useEffect, useRef, useState } from "react";

const VideoCallModal = ({ roomName, onClose }) => {
  const jitsiContainerRef = useRef(null);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [microphoneStatus, setMicrophoneStatus] = useState("waiting");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [translateTo, setTranslateTo] = useState("fr");
  const [showTranslateOptions, setShowTranslateOptions] = useState(false);
  const [originalTextLanguage, setOriginalTextLanguage] = useState("fr");
  const [showTranscript, setShowTranscript] = useState(true);
  
  // Languages list
  const languages = [
    { code: "fr", name: "Français", displayName: "Français" },
    { code: "en", name: "English", displayName: "English" },
    { code: "ar", name: "العربية", displayName: "العربية" },
    { code: "es", name: "Español", displayName: "Español" },
    { code: "de", name: "Deutsch", displayName: "Deutsch" },
    { code: "zh", name: "中文", displayName: "中文" },
    { code: "ru", name: "Русский", displayName: "Русский" },
    { code: "ja", name: "日本語", displayName: "日本語" },
    { code: "it", name: "Italiano", displayName: "Italiano" },
    { code: "pt", name: "Português", displayName: "Português" },
  ];

  // Initialize Jitsi and microphone
  useEffect(() => {
    // Load Jitsi script
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = startConference;
      document.body.appendChild(script);
    } else {
      startConference();
    }

    function startConference() {
      if (!window.JitsiMeetExternalAPI) return;
      
      // Clear any existing content
      if (jitsiContainerRef.current) {
        jitsiContainerRef.current.innerHTML = "";
      }
      
      const domain = "meet.jit.si";
      const options = {
        roomName: roomName,
        parentNode: jitsiContainerRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 
            'fullscreen', 'fodeviceselection', 'hangup', 'profile', 
            'chat', 'recording', 'livestreaming', 'etherpad', 
            'sharedvideo', 'settings', 'raisehand', 'videoquality', 
            'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help',
            'mute-everyone', 'security'
          ],
          SHOW_JITSI_WATERMARK: false,
          FILM_STRIP_MAX_HEIGHT: 100,
          MOBILE_APP_PROMO: false,
        }
      };
      
      new window.JitsiMeetExternalAPI(domain, options);
    }

    // Check microphone access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          console.log("Microphone access granted");
          setMicrophoneStatus("active");
          setRecognitionActive(true);
        })
        .catch((error) => {
          console.error("Microphone access denied:", error);
          setMicrophoneStatus("error");
          setTranscript(
            targetLanguage === "fr"
              ? "Erreur: Accès au microphone refusé."
              : targetLanguage === "en"
              ? "Error: Microphone access denied."
              : "خطأ: تم رفض الوصول إلى الميكروفون."
          );
        });
    } else {
      console.error("getUserMedia not supported");
      setMicrophoneStatus("error");
      setTranscript(
        targetLanguage === "fr"
          ? "Erreur: getUserMedia non supporté."
          : targetLanguage === "en"
          ? "Error: getUserMedia not supported."
          : "خطأ: getUserMedia غير مدعوم."
      );
    }

    // Cleanup
    return () => {
      if (jitsiContainerRef.current) {
        jitsiContainerRef.current.innerHTML = "";
      }
      stopRecognition();
    };
  }, [roomName, targetLanguage]); 

  // Set up speech recognition
  useEffect(() => {
    if (microphoneStatus === "active" && recognitionActive) {
      setupSpeechRecognition();
    }
    return () => stopRecognition();
  }, [recognitionActive, targetLanguage, microphoneStatus]);

  // Stop speech recognition
  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
  };

  // Setup speech recognition
  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript(
        targetLanguage === "fr"
          ? "Reconnaissance vocale non supportée."
          : targetLanguage === "en"
          ? "Speech recognition not supported."
          : "التعرف على الصوت غير مدعوم."
      );
      return;
    }

    stopRecognition();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getRecognitionLanguage(targetLanguage);

    recognition.onstart = () => {
      console.log(`Speech recognition started in ${recognition.lang}`);
      setMicrophoneStatus("active");
      setOriginalTextLanguage(targetLanguage);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        if (!isTranslating) setTranslatedText("");
      }
      setErrorCount(0);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "aborted") {
        setErrorCount((prev) => Math.min(prev + 1, 3));
      } else if (event.error === "network") {
        setTranscript((prev) => prev + " [Network error] ");
      } else if (event.error === "not-allowed") {
        setTranscript((prev) => prev + " [Microphone access denied] ");
        setMicrophoneStatus("error");
        setRecognitionActive(false);
      } else {
        setTranscript((prev) => prev + ` [Error: ${event.error}] `);
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      if (recognitionActive && microphoneStatus === "active") {
        const delay = Math.min(100 * Math.pow(2, errorCount), 5000);
        setTimeout(() => {
          try {
            if (recognitionRef.current && recognitionActive) {
              recognitionRef.current.start();
              console.log("Recognition restarted");
            }
          } catch (e) {
            console.error("Restart failed:", e);
            setErrorCount((prev) => prev + 1);
          }
        }, delay);
      }
    };

    try {
      recognition.start();
      console.log(`Speech recognition initialized in ${recognition.lang}`);
    } catch (e) {
      console.error("Start failed:", e);
      setTranscript((prev) => prev + " [Initialization error] ");
      setMicrophoneStatus("error");
    }
  }

  // Helper functions
  const getRecognitionLanguage = (lang) => {
    const languageMap = {
      "en": "en-US", "fr": "fr-FR", "ar": "ar-SA", "es": "es-ES", 
      "de": "de-DE", "zh": "zh-CN", "ru": "ru-RU", "ja": "ja-JP", 
      "it": "it-IT", "pt": "pt-PT"
    };
    return languageMap[lang] || "en-US";
  };

  const toggleRecognition = () => setRecognitionActive(prev => !prev);

  const changeTargetLanguage = (lang) => {
    if (lang !== targetLanguage) {
      setTranscript("");
      setTranslatedText("");
      setTargetLanguage(lang);
      setRecognitionActive(true);
    }
  };

  // Generate PDF
  const generatePDF = () => {
    if (!window.jsPDF) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = createPDF;
      document.body.appendChild(script);
    } else {
      createPDF();
    }

    function createPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16);
      const title =
        targetLanguage === "fr"
          ? `Transcription de la réunion: ${roomName}`
          : targetLanguage === "en"
          ? `Meeting Transcript: ${roomName}`
          : `نص الاجتماع: ${roomName}`;
      doc.text(title, 20, 20);
      doc.setFontSize(12);
      const date = new Date().toLocaleDateString(
        targetLanguage === "fr" ? "fr-FR" : targetLanguage === "en" ? "en-US" : "ar-SA"
      );
      doc.text(`Date: ${date}`, 20, 30);
      doc.setFontSize(12);
      
      if (targetLanguage === "ar" || translateTo === "ar") doc.setR2L(true);
      
      const textToUse =
        translatedText ||
        transcript ||
        (targetLanguage === "fr"
          ? "Aucune transcription disponible"
          : targetLanguage === "en"
          ? "No transcript available"
          : "لا يوجد نص متاح");
      const splitText = doc.splitTextToSize(textToUse, 170);
      doc.text(splitText, 20, 40);
      doc.save(`transcription-${roomName}-${new Date().toISOString().split("T")[0]}.pdf`);
    }
  };

  // Translate text
  const translateText = async (targetLang) => {
    if (!transcript) {
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);
    setTranslateTo(targetLang);

    try {
      const sourceLang = originalTextLanguage;
      const textToTranslate = encodeURIComponent(transcript);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${textToTranslate}`;
      const response = await fetch(url);
      const data = await response.json();
      const translatedResult = data[0].map(item => item[0]).join(" ");
      setTranslatedText(translatedResult);
      setTargetLanguage(targetLang);
    } catch (error) {
      console.error("Translation error:", error);
      setTranslatedText(getTranslationErrorMessage(targetLang));
    } finally {
      setIsTranslating(false);
      setShowTranslateOptions(false);
    }
  };

  const isRTLLanguage = lang => ["ar", "he", "ur", "fa"].includes(lang);
  
  // Text getter functions
  const getTranslationErrorMessage = (lang) => {
    const messages = {
      "fr": "Erreur de traduction. Veuillez réessayer.",
      "en": "Translation error. Please try again.",
      "ar": "خطأ في الترجمة. يرجى المحاولة مرة أخرى.",
      "es": "Error de traducción. Por favor, inténtelo de nuevo.",
      "de": "Übersetzungsfehler. Bitte versuchen Sie es erneut."
    };
    return messages[lang] || messages["en"];
  };

  const toggleTranslateOptions = () => setShowTranslateOptions(prev => !prev);
  
  const getTranscriptionTitle = () => {
    const titles = {
      "fr": "Transcription en direct :",
      "en": "Real-time Transcript:",
      "ar": "النص المباشر:",
      "es": "Transcripción en vivo:",
      "de": "Echtzeit-Transkript:"
    };
    return titles[targetLanguage] || titles["en"];
  };

  const getMicrophoneStatusMessage = () => {
    if (microphoneStatus === "error") {
      const messages = {
        "fr": "⚠️ Problème d'accès au microphone",
        "en": "⚠️ Microphone access issue",
        "ar": "⚠️ مشكلة في الوصول إلى الميكروفون",
        "es": "⚠️ Problema de acceso al micrófono",
        "de": "⚠️ Problem mit Mikrofonzugriff"
      };
      return messages[targetLanguage] || messages["en"];
    }
    if (microphoneStatus === "waiting") {
      const messages = {
        "fr": "En attente d'accès au microphone...",
        "en": "Waiting for microphone access...",
        "ar": "في انتظار الوصول إلى الميكروفون...",
        "es": "Esperando acceso al micrófono...",
        "de": "Warte auf Mikrofonzugriff..."
      };
      return messages[targetLanguage] || messages["en"];
    }
    return null;
  };

  const getTranslateButtonText = () => {
    const texts = { "fr": "Traduire", "en": "Translate", "ar": "ترجم", 
                   "es": "Traducir", "de": "Übersetzen" };
    return texts[targetLanguage] || texts["en"];
  };
  
  const getRecordButtonText = () => {
    if (recognitionActive) {
      const texts = { "fr": "Pause", "en": "Pause", "ar": "إيقاف مؤقت", 
                     "es": "Pausa", "de": "Pause" };
      return texts[targetLanguage] || texts["en"];
    } else {
      const texts = { "fr": "Reprendre", "en": "Resume", "ar": "استئناف", 
                     "es": "Reanudar", "de": "Fortsetzen" };
      return texts[targetLanguage] || texts["en"];
    }
  };
  
  const getPdfButtonText = () => {
    const texts = { "fr": "PDF", "en": "PDF", "ar": "PDF", 
                   "es": "PDF", "de": "PDF" };
    return texts[targetLanguage] || texts["en"];
  };

  const getTranslationPlaceholderText = () => {
    const texts = {
      "fr": "Parlez maintenant, la transcription apparaîtra ici...",
      "en": "Speak now, the transcript will appear here...",
      "ar": "تحدث الآن، سيظهر النص هنا...",
      "es": "Hable ahora, la transcripción aparecerá aquí...",
      "de": "Sprechen Sie jetzt, das Transkript wird hier angezeigt..."
    };
    return texts[targetLanguage] || texts["en"];
  };

  const getOriginalTranscriptButtonText = () => {
    const texts = {
      "fr": "Voir transcription originale",
      "en": "View original transcript",
      "ar": "عرض النص الأصلي",
      "es": "Ver transcripción original",
      "de": "Original-Transkript anzeigen"
    };
    return texts[translateTo] || texts["en"];
  };

  const getTranslationTitleText = () => {
    const texts = {
      "fr": "Traduction en français :",
      "en": "English translation:",
      "ar": "الترجمة العربية:",
      "es": "Traducción al español:",
      "de": "Deutsche Übersetzung:",
      "zh": "中文翻译:",
      "ru": "Русский перевод:",
      "ja": "日本語訳:",
      "it": "Traduzione italiana:",
      "pt": "Tradução em português:"
    };
    return texts[translateTo] || `Translation to ${translateTo}:`;
  };

  const getTipText = () => {
    const texts = {
      "fr": "Conseil: Parlez clairement dans votre microphone.",
      "en": "Tip: Speak clearly into your microphone.",
      "ar": "نصيحة: تحدث بوضوح في الميكروفون.",
      "es": "Consejo: Hable claramente en su micrófono.",
      "de": "Tipp: Sprechen Sie deutlich in Ihr Mikrofon."
    };
    return texts[targetLanguage] || texts["en"];
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] overflow-hidden">
      {/* Video container - full screen with absolute positioned controls */}
      <div className="relative w-full h-full flex flex-col">
        {/* Top bar - slim and translucent */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-2 bg-black bg-opacity-60">
          <h2 className="text-base font-medium text-white">
            {roomName}
          </h2>
          
          <div className="flex items-center space-x-2">
            {/* Toggle transcript button */}
            <button
              onClick={() => setShowTranscript(prev => !prev)}
              className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-1.5 rounded-md flex items-center justify-center"
              title={showTranscript ? "Hide Transcript" : "Show Transcript"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
            
            {/* Close button - always visible */}
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-md flex items-center justify-center"
              style={{ backgroundColor: "#dc2626" }}
              title="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Main video container - takes up full screen */}
        <div 
          ref={jitsiContainerRef} 
          className="w-full h-full"
        />
        
        {/* Transcript panel - slides up from bottom, collapsible */}
        {showTranscript && (
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-boxdark bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm transition-all duration-300 border-t border-gray-200 dark:border-gray-700">
            <div className="p-1.5 bg-white dark:bg-boxdark">
              {/* Control buttons + language selector in a single row */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <button
                  onClick={toggleRecognition}
                  className={`py-1 px-2 rounded-md text-xs font-medium flex items-center transition-colors ${
                    recognitionActive
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                  style={{
                    backgroundColor: recognitionActive ? "#ef4444" : "#22c55e",
                  }}
                  disabled={microphoneStatus === "error"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {recognitionActive ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    )}
                  </svg>
                  {getRecordButtonText()}
                </button>
                
                <button
                  onClick={generatePDF}
                  className="py-1 px-2 rounded-md text-xs font-medium flex items-center transition-colors bg-primary hover:bg-primary/90 text-white"
                  style={{ backgroundColor: "#3b82f6" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  {getPdfButtonText()}
                </button>
                
                <div className="relative">
                  <button
                    onClick={toggleTranslateOptions}
                    className="py-1 px-2 rounded-md text-xs font-medium flex items-center transition-colors bg-primary hover:bg-primary/90 text-white"
                    style={{ backgroundColor: "#3b82f6" }}
                    disabled={!transcript}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    {getTranslateButtonText()}
                  </button>
                  
                  {showTranslateOptions && (
                    <div className="absolute left-0 bottom-full mb-1 rounded-lg shadow-xl z-20 w-40 max-h-40 overflow-y-auto bg-white dark:bg-boxdark-2 border border-stroke dark:border-strokedark">
                      <div className="sticky top-0 px-3 py-1 text-xs font-medium border-b bg-gray-50 dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white">
                        {getTranslateButtonText()}
                      </div>
                      <ul className="text-xs">
                        {languages.map((lang) => (
                          <li
                            key={lang.code}
                            className={`px-3 py-1 cursor-pointer ${
                              originalTextLanguage === lang.code 
                                ? "opacity-50 " + (isRTLLanguage(lang.code) ? "bg-boxdark text-right" : "bg-gray-50 dark:bg-boxdark text-left") 
                                : isRTLLanguage(lang.code)
                                  ? "hover:bg-gray-50 dark:hover:bg-boxdark text-right text-gray-700 dark:text-bodydark border-gray-100 dark:border-strokedark border-b"
                                  : "hover:bg-gray-50 dark:hover:bg-boxdark text-left text-gray-700 dark:text-bodydark border-gray-100 dark:border-strokedark border-b"
                            }`}
                            onClick={() => {
                              if (originalTextLanguage !== lang.code) {
                                translateText(lang.code);
                              }
                            }}
                          >
                            {lang.displayName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="ml-auto flex items-center">
                  <span className="text-xs font-medium text-gray-800 dark:text-white mr-1">
                    {getTranscriptionTitle()}
                  </span>
                  {microphoneStatus !== "active" && (
                    <span className="text-xs text-red-500">
                      {getMicrophoneStatusMessage()}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 ml-2">
                  {["fr", "en", "ar", "es", "de"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => changeTargetLanguage(lang)}
                      className={`px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        targetLanguage === lang
                          ? "bg-primary text-white shadow-sm"
                          : "bg-gray-100 dark:bg-boxdark-2 text-gray-700 dark:text-bodydark hover:bg-gray-200 dark:hover:bg-opacity-80"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transcript display */}
              <div
                className={`p-2 rounded-lg overflow-y-auto ${
                  isRTLLanguage(targetLanguage) || (isTranslating && isRTLLanguage(translateTo))
                    ? "text-right"
                    : "text-left"
                } bg-gray-50 dark:bg-boxdark-2 text-gray-700 dark:text-bodydark border border-stroke dark:border-strokedark`}
                style={{ height: "80px" }}
                dir={isRTLLanguage(targetLanguage) || (translatedText && isRTLLanguage(translateTo)) 
                    ? "rtl" 
                    : "ltr"}
              >
                {isTranslating ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-pulse text-primary dark:text-blue-400">{
                      targetLanguage === "fr" 
                        ? "Traduction en cours..." 
                        : targetLanguage === "en" 
                          ? "Translating..." 
                          : "جاري الترجمة..."
                    }</div>
                  </div>
                ) : translatedText ? (
                  <>
                    <div className="text-xs mb-1 text-gray-500 dark:text-bodydark-2">
                      {getTranslationTitleText()}
                    </div>
                    <div className="text-gray-800 dark:text-bodydark text-xs">
                      {translatedText}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-800 dark:text-bodydark text-xs">
                    {transcript ||
                      (microphoneStatus === "active" ? (
                        <span className="text-gray-500 dark:text-bodydark-2">
                          {getTranslationPlaceholderText()}
                        </span>
                      ) : (
                        <span className="text-red-500">
                          {getMicrophoneStatusMessage()}
                        </span>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;