
import React, { useState, useEffect, useRef } from 'react';
import { JourneyStep, UserResponse, ManifestationResult, Option, Language, SessionRecord } from './types';
import { QUESTIONS, UI_TEXT } from './constants';
import { geminiService } from './services/geminiService';
import { databaseService } from './services/databaseService';
import Soundscape from './components/Soundscape';
import SpaceBackground from './components/SpaceBackground';
import AdminDashboard from './components/AdminDashboard';

const DynamicYinYang: React.FC<{ whitePercentage: number; id?: string }> = ({ whitePercentage, id }) => {
  const p = Math.min(Math.max(whitePercentage, 5), 95) / 100;
  const dt = 200 * p;
  const db = 200 - dt;
  
  const midY = dt;
  const rt = dt / 2;
  const rb = db / 2;

  return (
    <svg 
      id={id} 
      viewBox="0 0 200 200" 
      className="w-full h-full drop-shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all duration-[4000ms] ease-in-out"
    >
      <defs>
        <clipPath id="circleClip">
          <circle cx="100" cy="100" r="99" />
        </clipPath>
      </defs>
      
      <circle cx="100" cy="100" r="99" fill="#000" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      
      <path 
        d={`
          M 100,0 
          A 100,100 0 0,1 100,200
          A ${rb},${rb} 0 0,1 100,${midY}
          A ${rt},${rt} 0 0,0 100,0
          Z
        `}
        fill="#fff"
        clipPath="url(#circleClip)"
        className="transition-all duration-[4000ms] ease-in-out"
      />

      <circle cx="100" cy={rt} r={Math.max(3, rt / 5)} fill="#000" className="opacity-90 transition-all duration-[4000ms]" />
      <circle cx="100" cy={midY + rb} r={Math.max(3, rb / 5)} fill="#fff" className="opacity-90 transition-all duration-[4000ms]" />
    </svg>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [step, setStep] = useState<JourneyStep>(JourneyStep.LANDING);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [result, setResult] = useState<ManifestationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [elaboration, setElaboration] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const journeyStartTimeRef = useRef<number>(0);

  const t = UI_TEXT[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  const startJourney = () => {
    setIsAudioActive(true);
    setStep(JourneyStep.INQUIRY);
    journeyStartTimeRef.current = Date.now();
    setQuestionStartTime(Date.now());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminClick = () => {
    const newCount = adminClickCount + 1;
    if (newCount >= 3) {
      setShowAdminAuth(true);
      setAdminClickCount(0);
    } else {
      setAdminClickCount(newCount);
      setTimeout(() => setAdminClickCount(0), 2000);
    }
  };

  const verifyAdmin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminPasscode === "HAYAM2025" || adminPasscode === "1234") {
      setStep(JourneyStep.ADMIN);
      setShowAdminAuth(false);
      setAdminPasscode("");
      setAdminError(false);
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  };

  const handleShare = async () => {
    const currentUrl = window.location.href;
    const shareData = {
      title: 'HAYAM Invitation',
      text: t.headline,
      url: currentUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentUrl);
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 3000);
      } else {
        throw new Error("Standard share/copy unavailable");
      }
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = currentUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 3000);
      } catch (fallbackErr) {
        alert(isRtl ? "فشل نسخ الرابط. يرجى نسخوه يدوياً." : "Failed to copy link automatically. Please copy it from your address bar.");
      }
    }
  };

  const submitResponse = (optionToSave?: Option | null) => {
    const now = Date.now();
    const timeTaken = now - questionStartTime;
    const finalOption = optionToSave || selectedOption;
    const newResponse: UserResponse = { 
      questionId: QUESTIONS[currentQuestionIndex].id, 
      answer: finalOption?.en || "Expressed through free text",
      elaboration: elaboration.trim() || undefined,
      timeTakenMs: timeTaken
    };
    const newResponses = [...responses, newResponse];
    setResponses(newResponses);
    setElaboration(""); 
    setSelectedOption(null);
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex === QUESTIONS.length) {
      setStep(JourneyStep.NAME_INPUT);
      setQuestionStartTime(Date.now());
    } else if (nextIndex % 5 === 0 && nextIndex < QUESTIONS.length) {
      setStep(JourneyStep.BREATHING);
    } else {
      setCurrentQuestionIndex(nextIndex);
      setQuestionStartTime(now);
    }
  };

  const handleNameSubmit = () => {
    if (fullName.trim()) {
      processManifestation(responses);
    }
  };

  const endBreathing = () => {
    setStep(JourneyStep.INQUIRY);
    setCurrentQuestionIndex(prev => prev + 1);
    setQuestionStartTime(Date.now());
  };

  useEffect(() => {
    if (step === JourneyStep.BREATHING) {
      const timer = setTimeout(() => {
        endBreathing();
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [step]);

  const processManifestation = async (finalResponses: UserResponse[]) => {
    setStep(JourneyStep.SYNTHESIS);
    setLoading(true);
    const totalDuration = Date.now() - journeyStartTimeRef.current;
    try {
      const res = await geminiService.generateManifestation(finalResponses, lang);
      setResult(res);
      const sessionData: SessionRecord = {
        timestamp: new Date().toISOString(),
        fullName: fullName.trim(),
        responses: finalResponses,
        yinYangBalance: res.yinYangBalance,
        stability: res.balanceScore.stability,
        creativity: res.balanceScore.creativity,
        depth: res.balanceScore.depth,
        language: lang,
        totalDurationMs: totalDuration
      };
      await databaseService.saveSession(sessionData);
      setStep(JourneyStep.MANIFESTATION);
    } catch (error) {
      alert(isRtl ? "الفراغ مضطرب. يرجى المحاولة مرة أخرى." : "The void is turbulent. Please try again.");
      setStep(JourneyStep.LANDING);
    } finally {
      setLoading(false);
    }
  };

  const saveManifestationImage = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `hayam-manifestation-${fullName.replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBalanceSymbol = () => {
    const svg = document.getElementById('yinyang-svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hayam-balance-${fullName.replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadReport = () => {
    if (!result) return;
    const reportText = `${t.title} - ${fullName}\n\n${t.analysisTitle}:\n${result.description}\n\n${t.reportTitle}:\n${result.report}\n\n${t.stability}: ${result.balanceScore.stability}%\n${t.creativity}: ${result.balanceScore.creativity}%\n${t.depth}: ${result.balanceScore.depth}%\n${t.yin}: ${result.yinYangBalance}%\n${t.yang}: ${100 - result.yinYangBalance}%`;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hayam-report-${fullName.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentProgress = currentQuestionIndex / QUESTIONS.length;
  const isManifested = step === JourneyStep.MANIFESTATION;
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;
  const hasTypingInput = elaboration.trim().length > 0;
  const isJourneyActive = step !== JourneyStep.LANDING && step !== JourneyStep.ADMIN;

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`relative min-h-screen w-full bg-[#0a0a0a] text-[#f5f5f5] selection:bg-white/20 transition-colors duration-[4000ms] ${isManifested ? 'bg-[#0a0a0a]' : ''} ${isRtl ? 'font-arabic' : 'font-inter'}`}
    >
      <SpaceBackground step={step} />
      <div className="grainy-overlay" />
      <Soundscape active={isAudioActive} progress={currentProgress} step={step} />

      {/* Feedback Overlay */}
      {showCopyFeedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-white text-black text-[10px] tracking-widest uppercase font-bold animate-fade-in shadow-2xl">
          {t.linkCopied}
        </div>
      )}

      {/* Admin Auth Overlay */}
      {showAdminAuth && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl animate-fade-in">
          <div className="max-w-md w-full space-y-8 text-center">
            <h2 className="text-xs tracking-[0.6em] uppercase opacity-40">{t.adminAuth}</h2>
            <form onSubmit={verifyAdmin} className="space-y-6">
              <input 
                autoFocus
                type="password"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder={t.adminPasscode}
                className={`w-full bg-transparent border-b outline-none py-4 text-center text-2xl font-light transition-all duration-500 ${adminError ? 'border-red-500 text-red-500' : 'border-white/10 focus:border-white/60'}`}
              />
              {adminError && <p className="text-[10px] uppercase tracking-widest text-red-500/60">{t.adminInvalid}</p>}
              <div className="flex gap-4 justify-center">
                <button type="submit" className="px-8 py-3 bg-white text-black text-[10px] tracking-widest uppercase font-bold">Verify</button>
                <button type="button" onClick={() => setShowAdminAuth(false)} className="px-8 py-3 border border-white/10 text-[10px] tracking-widest uppercase">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {step === JourneyStep.ADMIN && (
        <AdminDashboard lang={lang} onClose={() => setStep(JourneyStep.LANDING)} />
      )}

      <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-8 transition-all duration-1000 ${isJourneyActive ? 'opacity-0 -translate-y-full' : 'opacity-100'}`}>
        <div className="flex items-center gap-4">
          <span className="text-sm tracking-[0.5em] uppercase font-bold">{t.title}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={toggleLanguage} className="text-[10px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity border border-white/10 px-4 py-2 hover:bg-white/5 backdrop-blur-sm">
            {lang === 'en' ? 'AR | EN' : 'EN | AR'}
          </button>
        </div>
      </header>

      <main className={`relative z-10 flex flex-col items-center ${isJourneyActive ? 'justify-center min-h-screen' : ''}`}>
        
        {step === JourneyStep.LANDING && (
          <div className="w-full">
            {/* Hero Section */}
            <section className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 text-center animate-fade-in">
              <h1 className="text-sm tracking-[0.5em] uppercase mb-8 opacity-60 font-medium">{t.title}</h1>
              <h2 className={`text-5xl md:text-8xl mb-8 leading-tight max-w-5xl ${isRtl ? 'font-arabic font-light' : 'font-playfair italic'}`}>
                {t.headline}
              </h2>
              <p className="text-lg md:text-xl opacity-40 mb-12 font-light leading-relaxed max-w-2xl">
                {t.subheadline}
              </p>
              
              <div className="flex flex-col items-center gap-8">
                <button 
                  onClick={startJourney}
                  className="group relative px-12 py-5 bg-transparent border border-white/20 hover:border-white transition-all duration-700 ease-out min-w-[240px]"
                >
                  <span className="relative z-10 text-xs tracking-[0.4em] uppercase group-hover:tracking-[0.6em] transition-all duration-700">
                    {t.ctaBegin}
                  </span>
                  <div className="absolute inset-0 bg-white scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-700 opacity-5" />
                </button>
              </div>
            </section>

            {/* Philosophy Section */}
            <section id="philosophy" className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 text-center">
               <div className="max-w-4xl space-y-12">
                  <h3 className="text-sm tracking-[0.6em] uppercase opacity-40">{t.navPhilosophy}</h3>
                  <h4 className={`text-4xl md:text-6xl ${isRtl ? 'font-arabic' : 'font-playfair italic'}`}>{t.philosophyTitle}</h4>
                  <p className="text-xl md:text-2xl font-light opacity-60 leading-relaxed italic">{t.philosophyBody}</p>
                  <div className="h-24 w-[1px] bg-gradient-to-b from-white/20 to-transparent mx-auto" />
               </div>
            </section>
          </div>
        )}

        {step === JourneyStep.INQUIRY && (
          <div className="w-full max-w-4xl flex flex-col items-center pb-24 px-6">
            <div className="w-full mt-24 mb-12 opacity-40 flex justify-between items-end text-xs tracking-widest uppercase">
              <span>{t.investigation} {currentQuestionIndex + 1} {t.of} {QUESTIONS.length}</span>
              <div className="w-32 h-[1px] bg-white/10 relative">
                <div className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-0 h-full bg-white transition-all duration-700`} style={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }} />
              </div>
            </div>
            
            <div key={currentQuestionIndex} className="animate-fade-in text-center space-y-8 w-full">
              <h3 className={`text-3xl md:text-5xl text-white/90 leading-relaxed font-light ${isRtl ? 'font-arabic' : 'font-playfair italic'}`}>
                {isRtl ? QUESTIONS[currentQuestionIndex].arabic : QUESTIONS[currentQuestionIndex].text}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {QUESTIONS[currentQuestionIndex].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => submitResponse(option)}
                    className={`group relative p-8 border transition-all duration-500 text-center flex flex-col items-center justify-center overflow-hidden min-h-[120px] backdrop-blur-sm ${
                      selectedOption === option ? 'border-white/60 bg-white/10' : 'border-white/5 hover:border-white/40 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="relative z-10 text-xl md:text-2xl text-white/80 group-hover:text-white transition-colors">{isRtl ? option.ar : option.en}</span>
                    <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </button>
                ))}
              </div>

              <div className="pt-12 w-full max-w-lg mx-auto space-y-4">
                <textarea
                  value={elaboration}
                  onChange={(e) => setElaboration(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full bg-transparent border-b border-white/10 focus:border-white/60 outline-none p-4 text-lg font-light text-center transition-all duration-500 placeholder:opacity-10"
                  rows={1}
                />
              </div>

              <div className={`pt-12 transition-all duration-700 flex justify-center ${hasTypingInput ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <button onClick={() => submitResponse()} className="group relative px-12 py-5 bg-white text-black font-medium transition-all duration-500 hover:tracking-[0.2em] overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <span className="relative z-10 text-xs tracking-widest uppercase">{isLastQuestion ? t.finish : t.next}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === JourneyStep.NAME_INPUT && (
          <div className="animate-fade-in text-center space-y-12 max-w-xl w-full px-6">
            <div className="space-y-4">
              <h2 className="text-sm tracking-[0.5em] uppercase opacity-40">{t.investigation} {t.complete}</h2>
              <h3 className={`text-4xl md:text-5xl ${isRtl ? 'font-arabic' : 'font-playfair italic'}`}>{t.namePrompt}</h3>
            </div>
            <div className="space-y-8">
              <input
                autoFocus
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder={t.namePlaceholder}
                className="w-full bg-transparent border-b border-white/10 focus:border-white outline-none py-6 text-3xl font-light text-center transition-all duration-500 placeholder:opacity-10"
              />
              <div className={`transition-all duration-700 ${fullName.trim().length > 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <button onClick={handleNameSubmit} className="group relative px-12 py-5 bg-white text-black font-medium transition-all duration-500 hover:tracking-[0.2em] overflow-hidden">
                  <span className="relative z-10 text-xs tracking-widest uppercase">{t.finish}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === JourneyStep.BREATHING && (
          <div className="animate-fade-in text-center space-y-12 px-6">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 border border-white/20 rounded-full animate-[ping_4s_infinite]" />
              <div className="w-16 h-16 bg-white/5 rounded-full animate-[pulse_4s_infinite]" />
            </div>
            <p className={`text-2xl md:text-3xl opacity-60 ${isRtl ? 'font-arabic' : 'font-playfair italic'}`}>{t.breathing}</p>
          </div>
        )}

        {step === JourneyStep.SYNTHESIS && (
          <div className="text-center space-y-12 animate-fade-in px-6">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 border border-white/10 rounded-full animate-[ping_3s_infinite]" />
              <div className="absolute inset-4 border border-white/20 rounded-full animate-[ping_3s_infinite_0.5s]" />
              <div className="absolute inset-8 border border-white/30 rounded-full animate-[ping_3s_infinite_1s]" />
            </div>
            <p className={`text-2xl opacity-40 ${isRtl ? 'font-arabic' : 'tracking-[0.6em] uppercase text-xs'}`}>{t.processing}</p>
          </div>
        )}

        {step === JourneyStep.MANIFESTATION && result && (
          <div className="animate-fade-in w-full max-w-7xl py-12 md:py-24 space-y-24 px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative group max-w-xl mx-auto lg:mx-0 w-full">
                <div className="absolute -inset-4 bg-gradient-to-r from-white/20 to-transparent blur-3xl opacity-30"></div>
                <div className="relative aspect-square overflow-hidden bg-black/40 border border-white/10 shadow-2xl rounded-2xl">
                  <img src={result.imageUrl} alt="Soul Manifestation" className="w-full h-full object-cover transition-transform duration-[8000ms] hover:scale-110" />
                  <button onClick={saveManifestationImage} className="absolute bottom-4 right-4 p-3 bg-black/60 hover:bg-white hover:text-black border border-white/10 text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-md rounded-lg">
                    {t.saveArt}
                  </button>
                </div>
              </div>
              <div className={`space-y-10 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div>
                  <h1 className="text-sm tracking-[0.6em] uppercase mb-4 opacity-40">{t.manifestationTitle} {t.ofName} {fullName}</h1>
                  <h2 className={`text-5xl md:text-7xl leading-[1.1] ${isRtl ? 'font-arabic font-light' : 'font-playfair italic'}`}>{t.reflectionTitle}</h2>
                </div>
                <p className="text-xl md:text-2xl font-light opacity-60 italic border-l border-white/10 pl-8 py-2 leading-relaxed">"{result.description}"</p>
                <div className="grid grid-cols-3 gap-8">
                  {[
                    { label: t.stability, val: result.balanceScore.stability },
                    { label: t.creativity, val: result.balanceScore.creativity },
                    { label: t.depth, val: result.balanceScore.depth }
                  ].map((stat, i) => (
                    <div key={i} className="space-y-3">
                      <div className="text-[10px] tracking-widest uppercase opacity-40 font-bold">{stat.label}</div>
                      <div className="text-3xl font-light">{stat.val}%</div>
                      <div className="h-0.5 w-full bg-white/5 overflow-hidden">
                        <div className={`h-full bg-white transition-all duration-1000 delay-${500 + i * 200} ${isRtl ? 'float-right' : ''}`} style={{ width: `${stat.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-12 bg-white/[0.02] border-y border-white/5 py-24 px-6 relative transition-colors duration-[4000ms]">
              <div className="text-center space-y-4 mb-8">
                <h3 className="text-sm tracking-[0.5em] uppercase opacity-40">{t.internalDuality}</h3>
                <h4 className={`text-3xl ${isRtl ? 'font-arabic' : 'font-playfair italic'}`}>{t.geometryTitle}</h4>
              </div>
              <div className="relative group">
                <div className="w-64 h-64 md:w-80 md:h-80 relative">
                  <DynamicYinYang id="yinyang-svg" whitePercentage={result.yinYangBalance} />
                </div>
              </div>
              <div className="max-w-xl text-center space-y-6">
                <p className="text-lg opacity-60 leading-relaxed font-light">{t.insight}</p>
                <button onClick={downloadBalanceSymbol} className="px-6 py-2 border border-white/10 hover:border-white/40 text-[10px] tracking-widest uppercase transition-all duration-500 opacity-60 hover:opacity-100">{t.downloadSvg}</button>
              </div>
            </div>

            <div className={`max-w-4xl mx-auto space-y-12 ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${isRtl ? 'md:flex-row-reverse' : ''}`}>
                <div className="space-y-4">
                  <h3 className="text-sm tracking-[0.6em] uppercase opacity-40">{t.reportTitle}</h3>
                  <h4 className={`text-4xl md:text-5xl ${isRtl ? 'font-arabic' : 'font-playfair italic'}`}>{t.analysisTitle}</h4>
                </div>
                <button onClick={downloadReport} className="px-6 py-3 border border-white/10 hover:border-white/40 text-[10px] tracking-widest uppercase transition-all duration-500 opacity-60 hover:opacity-100">{t.downloadReport}</button>
              </div>
              <div className={`columns-1 md:columns-2 gap-12 text-lg leading-relaxed font-light opacity-70 whitespace-pre-wrap text-justify ${isRtl ? 'border-r pr-8' : 'border-l pl-8'} border-white/10`}>{result.report}</div>
              
              <div className={`pt-12 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-white/5 pt-12 ${isRtl ? 'md:flex-row-reverse' : ''}`}>
                <button onClick={handleShare} className="px-12 py-5 border border-white/10 hover:border-white transition-all duration-700 uppercase tracking-[0.4em] text-[10px] hover:bg-white/5 rounded-xl">{t.shareJourney}</button>
                <button onClick={() => window.location.reload()} className="px-12 py-5 bg-white text-black hover:bg-white/90 transition-all duration-700 uppercase tracking-[0.4em] text-[10px] rounded-xl">{t.return}</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-8 left-0 right-0 z-10 text-center pointer-events-auto">
        <button onClick={handleAdminClick} className="text-[10px] tracking-[1.5em] uppercase opacity-5 hover:opacity-40 transition-opacity cursor-default">{t.footer}</button>
      </footer>
    </div>
  );
};

export default App;
