
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Menu, Mic, Sparkles, Volume2, Plus, Image as ImageIcon, X, Zap, Search, Clock, Trash2, MessageSquarePlus } from 'lucide-react';
import { Message, AudioState } from './types';
import * as GeminiService from './services/geminiService';
import { decode, decodeAudioData } from './services/audioUtils';
import ChatMessage from './components/ChatMessage';
import Waveform from './components/Waveform';
import TalkingLips from './components/TalkingLips';

const App: React.FC = () => {
  const initialMessage: Message = {
    id: 'welcome',
    role: 'model',
    text: "Welcome to **शुभ.Chats** v2.5. By Shubham Shinde. Experience the ultrarealistic **Female AI Vocal** and visual interface.",
    timestamp: Date.now()
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({ isPlaying: false, currentMessageId: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // History states
  const [promptHistory, setPromptHistory] = useState<{id: string, text: string, time: number}[]>([]);
  const [fileHistory, setFileHistory] = useState<{id: string, url: string, time: number}[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarUrl = "https://i.postimg.cc/fR59MP9T/Shubh-Chats.png";

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    setMessages([{ ...initialMessage, timestamp: Date.now() }]);
    setInputValue('');
    setSelectedFile(null);
    stopAudio();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedFile(base64);
        setImageMode(true);
        setFileHistory(prev => [{id: Date.now().toString(), url: base64, time: Date.now()}, ...prev].slice(0, 20));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    initAudioContext();
    const userText = inputValue;
    const currentFile = selectedFile;
    
    setPromptHistory(prev => [{id: Date.now().toString(), text: userText, time: Date.now()}, ...prev].slice(0, 20));

    setInputValue('');
    setSelectedFile(null);
    setIsProcessing(true);
    stopAudio();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      imageUrl: currentFile || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      if (imageMode) {
        const { text, imageUrl } = await GeminiService.generateImageResponse(userText, currentFile || undefined);
        
        if (imageUrl) {
          setFileHistory(prev => [{id: Date.now().toString(), url: imageUrl, time: Date.now()}, ...prev].slice(0, 20));
        }

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: text || "Image successfully generated.",
          imageUrl: imageUrl,
          timestamp: Date.now(),
          isAudioLoading: !!text
        };

        setMessages(prev => [...prev, botMessage]);
        
        if (text) {
          const base64Audio = await GeminiService.generateSpeechResponse(text);
          setMessages(prev => prev.map(m => m.id === botMessage.id ? { ...m, isAudioLoading: false, audioData: base64Audio || undefined } : m));
          if (base64Audio) playAudioData(base64Audio, botMessage.id);
        } else {
           setMessages(prev => prev.map(m => m.id === botMessage.id ? { ...m, isAudioLoading: false } : m));
        }
      } else {
        const responseText = await GeminiService.generateTextResponse(messages, userText);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: responseText,
          timestamp: Date.now(),
          isAudioLoading: true
        };
        setMessages(prev => [...prev, botMessage]);
        
        const base64Audio = await GeminiService.generateSpeechResponse(responseText);
        setMessages(prev => prev.map(m => m.id === botMessage.id ? { ...m, isAudioLoading: false, audioData: base64Audio || undefined } : m));
        if (base64Audio) playAudioData(base64Audio, botMessage.id);
      }
    } catch (e) {
      console.error("Interaction failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setAudioState({ isPlaying: false, currentMessageId: null });
  };

  const handlePlayAudio = async (msg: Message) => {
    initAudioContext();
    if (audioState.currentMessageId === msg.id && audioState.isPlaying) {
      stopAudio();
      return;
    }
    stopAudio();
    if (msg.audioData) {
      playAudioData(msg.audioData, msg.id);
      return;
    }
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isAudioLoading: true } : m));
    const base64Audio = await GeminiService.generateSpeechResponse(msg.text);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isAudioLoading: false, audioData: base64Audio || undefined } : m));
    if (base64Audio) playAudioData(base64Audio, msg.id);
  };

  const playAudioData = async (base64: string, msgId: string) => {
    if (!audioContextRef.current || !analyserRef.current) return;
    try {
      const audioBytes = decode(base64);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      source.onended = () => setAudioState(prev => ({ ...prev, isPlaying: false }));
      source.start(0);
      sourceNodeRef.current = source;
      setAudioState({ isPlaying: true, currentMessageId: msgId });
    } catch (error) {
      console.error("Playback error", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredHistory = useMemo(() => {
    if (!historySearchTerm) return promptHistory;
    return promptHistory.filter(h => h.text.toLowerCase().includes(historySearchTerm.toLowerCase()));
  }, [promptHistory, historySearchTerm]);

  const clearHistory = () => {
    setPromptHistory([]);
    setFileHistory([]);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* Background Decor */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <img 
          src="https://images.unsplash.com/photo-1577103842603-7cb7d49b5c39?q=80&w=2602&auto=format&fit=crop" 
          alt="Cyberpunk City Background"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-[2px]"></div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 md:left-0 md:right-auto z-[60] w-72 flex flex-col bg-[#0a0a0a]/95 backdrop-blur-2xl border-l md:border-l-0 md:border-r border-gray-800/50 transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-500 shadow-[0_0_10px_#00d4ff]">
                <img src={avatarUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-cyber text-lg font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                शुभ.Chats
              </span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* New Chat Button */}
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-cyan-500/50 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 transition-all font-cyber text-xs tracking-widest shadow-[0_0_15px_rgba(0,212,255,0.1)] group"
          >
            <MessageSquarePlus size={18} className="group-hover:scale-110 transition-transform" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
              <input 
                type="text"
                placeholder="Search history..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Modules</div>
              </div>
              <button 
                onClick={() => setImageMode(!imageMode)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${imageMode 
                    ? 'bg-purple-900/40 border-purple-500 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                    : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
              >
                <Zap size={14} className={imageMode ? 'text-purple-400 animate-pulse' : ''} />
                <span className="text-xs font-medium">Image Generation: {imageMode ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Clock size={10} /> Recent Prompts
                </div>
                {promptHistory.length > 0 && (
                  <button onClick={clearHistory} className="text-[9px] text-gray-600 hover:text-red-400 transition-colors">Clear All</button>
                )}
              </div>
              <div className="space-y-1">
                {filteredHistory.length > 0 ? filteredHistory.map(h => (
                  <button 
                    key={h.id}
                    onClick={() => { setInputValue(h.text); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className="w-full text-left p-2.5 rounded-md hover:bg-white/5 text-xs text-gray-400 hover:text-cyan-400 transition-all truncate border border-transparent hover:border-cyan-900/30"
                  >
                    {h.text}
                  </button>
                )) : (
                  <div className="text-[10px] text-gray-600 italic px-2">No prompt history...</div>
                )}
              </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 transition-all duration-300">
        <header className="flex items-center justify-between p-4 bg-[#0a0a0a]/40 backdrop-blur-sm border-b border-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-500 shadow-[0_0_10px_#00d4ff] md:hidden">
                <img src={avatarUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-cyber font-bold text-lg text-cyan-400 tracking-tighter">शुभ.Chats</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2.5 text-gray-400 hover:text-cyan-400 transition-all rounded-lg hover:bg-white/5 border border-transparent hover:border-gray-800"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
             {messages.map((msg) => (
               <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onPlayAudio={handlePlayAudio}
                  isPlaying={audioState.isPlaying}
                  isCurrentAudio={audioState.currentMessageId === msg.id}
               />
             ))}
             {isProcessing && (
               <div className="flex gap-2 items-center text-cyan-500 text-sm ml-14 mb-4 animate-pulse">
                  <Sparkles size={16} className="animate-spin" />
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-cyan-500">Processing Neural Data...</span>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Visualizer Overlay */}
        <div className={`absolute bottom-32 left-1/2 -translate-x-1/2 transition-all duration-700 z-50 flex flex-col items-center
            ${audioState.isPlaying ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-24 scale-75 pointer-events-none'}`}>
             
             <div className="relative flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 px-10 rounded-full border border-pink-500/40 shadow-[0_0_80px_rgba(255,0,85,0.4)] ring-2 ring-pink-500/20 w-[400px] h-[100px] overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-60">
                   <Waveform analyser={analyserNode} isPlaying={audioState.isPlaying} color="#ff0055" />
                </div>
                <div className="relative z-10 flex items-center justify-center">
                   <TalkingLips analyser={analyserNode} isPlaying={audioState.isPlaying} color="#ff0055" />
                </div>
                <Volume2 size={20} className="absolute left-6 text-pink-500 animate-pulse" />
                <div className="absolute right-6 flex flex-col gap-1">
                   <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping"></div>
                   <div className="w-1.5 h-1.5 bg-pink-500 rounded-full opacity-50"></div>
                </div>
             </div>
             <div className="mt-4 text-[9px] font-cyber text-pink-400 tracking-[0.6em] uppercase animate-pulse">
                High Fidelity Neural Vocal Link
             </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-black to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            {selectedFile && (
              <div className="absolute bottom-full mb-4 left-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative group/preview p-1.5 bg-gray-900 border border-cyan-500/50 rounded-lg shadow-2xl">
                  <img src={selectedFile} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-all scale-75 hover:scale-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className={`absolute -inset-0.5 rounded-2xl opacity-10 group-focus-within:opacity-40 transition duration-700 blur-xl
              ${imageMode ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gradient-to-r from-cyan-600 to-blue-600'}`}></div>
            
            <div className="relative flex items-center bg-[#0f0f0f]/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-gray-800 group-focus-within:border-gray-700 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} title="Upload Image" className="p-4 text-gray-500 hover:text-cyan-400 transition-colors">
                 <Plus size={20} />
              </button>
              <button onClick={() => setImageMode(!imageMode)} title={imageMode ? "Chat Mode" : "Image Mode"} className={`p-4 transition-colors ${imageMode ? 'text-purple-400' : 'text-gray-500 hover:text-cyan-400'}`}>
                 <ImageIcon size={20} />
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ask Anything to shubham"
                className="flex-1 bg-transparent border-none text-gray-100 placeholder-gray-600 focus:ring-0 focus:outline-none p-4 font-sans text-base"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className={`p-4 mr-1 transition-all duration-300
                  ${inputValue.trim() 
                    ? (imageMode ? 'text-purple-400' : 'text-cyan-400') + ' scale-110 drop-shadow-[0_0_8px_currentColor]' 
                    : 'text-gray-700 cursor-not-allowed'}`}
              >
                <Send size={22} />
              </button>
            </div>
            
            <div className="mt-2.5 flex justify-between items-center px-3">
              <div className="flex items-center gap-3">
                <p className={`text-[9px] font-mono tracking-[0.2em] uppercase flex items-center gap-1.5 transition-colors duration-500 ${imageMode ? 'text-purple-500' : 'text-cyan-700'}`}>
                  <span className={`w-1 h-1 rounded-full animate-pulse ${imageMode ? 'bg-purple-500' : 'bg-cyan-500'}`}></span>
                  {imageMode ? 'Visual synthesis active' : 'Linguistic interface active'}
                </p>
              </div>
              <p className="text-[9px] text-gray-700 font-mono italic uppercase tracking-tighter">
                Neural System Interface v2.5
              </p>
            </div>
          </div>
        </div>
      </main>

      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden animate-in fade-in duration-300"
        ></div>
      )}
    </div>
  );
};

export default App;
