
import React from 'react';
import { Message } from '../types';
import { User, Play, Loader2, StopCircle, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
  onPlayAudio: (message: Message) => void;
  isPlaying: boolean;
  isCurrentAudio: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPlayAudio, isPlaying, isCurrentAudio }) => {
  const isUser = message.role === 'user';
  const avatarUrl = "https://i.postimg.cc/fR59MP9T/Shubh-Chats.png";

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `shubh-chat-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 overflow-hidden
          ${isUser ? 'bg-pink-600 shadow-[0_0_10px_#db2777]' : 'bg-cyan-600 shadow-[0_0_10px_#0891b2]'}`}>
          {isUser ? (
            <User size={20} className="text-white" />
          ) : (
            <img 
              src={avatarUrl}
              alt="Shubh AI" 
              className="w-full h-full object-cover" 
            />
          )}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`px-5 py-4 rounded-2xl text-sm md:text-base leading-relaxed transform transition-all duration-300 hover:scale-[1.01] cursor-default backdrop-blur-md
              ${isUser 
                ? 'bg-gradient-to-br from-pink-900/60 to-purple-900/60 border border-pink-500/30 text-white rounded-tr-none hover:shadow-[0_0_20px_rgba(219,39,119,0.3)]' 
                : 'bg-gradient-to-br from-slate-900/60 to-black/60 border border-cyan-500/30 text-gray-100 rounded-tl-none hover:shadow-[0_0_20px_rgba(8,145,178,0.3)]'
              }`}>
              
              {message.imageUrl && (
                <div className="mb-4 relative group/image">
                  <img 
                    src={message.imageUrl} 
                    alt="AI Content" 
                    className="max-w-full rounded-lg border border-white/10 shadow-lg"
                  />
                  {!isUser && (
                    <button 
                      onClick={() => downloadImage(message.imageUrl!)}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-cyan-500 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity border border-white/20"
                    >
                      <Download size={16} />
                    </button>
                  )}
                </div>
              )}

              {message.text && (
                <ReactMarkdown 
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    code: ({node, ...props}) => <code className="bg-black/40 rounded px-1 py-0.5 text-cyan-300 font-mono text-xs" {...props} />
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              )}
            </div>

            {/* Audio Controls (Model Only, Text Only) */}
            {!isUser && message.text && (
              <div className="mt-2 flex items-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onPlayAudio(message)}
                  disabled={message.isAudioLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                    ${isCurrentAudio && isPlaying 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500 animate-pulse' 
                      : 'bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 border border-gray-700 hover:border-cyan-500/50 hover:text-cyan-400'
                    }`}
                >
                  {message.isAudioLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCurrentAudio && isPlaying ? (
                    <StopCircle size={14} />
                  ) : (
                    <Play size={14} />
                  )}
                  {message.isAudioLoading ? 'Synthesizing...' : isCurrentAudio && isPlaying ? 'Stop' : 'Read Aloud'}
                </button>
                
                <div className="flex items-center gap-1.5 border border-gray-800/50 bg-black/30 pl-1 pr-2 py-0.5 rounded-full">
                   <img src={avatarUrl} alt="logo" className="w-3 h-3 rounded-full object-cover" />
                   <span className="text-[10px] text-gray-400 uppercase tracking-wider font-cyber">
                      शुभ.Chats
                   </span>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
