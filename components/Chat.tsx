import React, { useState, useEffect, useRef } from 'react';
// Chat component with Quran Radio feature
import type { ChatChannel, ChatMessage, MgmtUser, Department, OnlineSession } from '../types';
import { MessageSquare, X, Mic, Phone, Trash2, Edit2, Check, CheckCheck, Headset, MoreVertical, Search, Paperclip, Smile, Send, ArrowLeft, FileText, Image as ImageIcon, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { Modal } from './Shared';
import { GoogleGenAI } from "@google/genai";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface ChatProps {
    currentUser: MgmtUser | null;
    departments: Department[];
    users?: MgmtUser[];
    onlineSessions?: OnlineSession[];
    chatMessages: ChatMessage[];
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    isLoginScreen?: boolean;
    themeColor?: string;
}

const Chat: React.FC<ChatProps> = ({ currentUser, departments, users, onlineSessions, chatMessages, setChatMessages, isLoginScreen, themeColor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string>('general');
    const [newMessage, setNewMessage] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [isRecording, setIsRecording] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [selectedStation, setSelectedStation] = useState({ name: 'إذاعة القرآن الكريم - القاهرة', url: 'https://stream.radiojar.com/8s5u5tpdtwzuv' });
    const [isRadioPlaying, setIsRadioPlaying] = useState(false);
    
    const stations = [
        { name: 'إذاعة القرآن الكريم - القاهرة', url: 'https://stream.radiojar.com/8s5u5tpdtwzuv' },
        { name: 'إذاعة القرآن الكريم - السعودية', url: 'https://stream.radiojar.com/4wqre23fytzuv' }, 
        { name: 'قناة المجد للقرآن الكريم (تراتيل)', url: 'https://backup.qurango.net/radio/tarateel' },
        { name: 'إذاعة الشيخ عبدالباسط عبدالصمد', url: 'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad' },
        { name: 'إذاعة الشيخ محمد صديق المنشاوي', url: 'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi_mojawwad' },
        { name: 'إذاعة الشيخ محمود خليل الحصري', url: 'https://backup.qurango.net/radio/mahmoud_khalil_alhussary_mojawwad' },
    ];

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const radioAudioRef = useRef<HTMLAudioElement>(null);
    const previousMessagesLength = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // WhatsApp-like colors
    const colors = {
        primary: '#008069', // WhatsApp Teal
        header: '#008069',
        chatBg: '#efe7dd', // Beige doodle background
        sentBubble: '#d9fdd3', // Light green
        receivedBubble: '#ffffff',
        inputBg: '#f0f2f5',
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const safeMessages = Array.isArray(chatMessages) ? chatMessages : [];
        if (safeMessages.length > previousMessagesLength.current) {
            const newMsgs = safeMessages.slice(previousMessagesLength.current);
            const hasNewFromOthers = newMsgs.some(m => m && m.senderId !== (currentUser?.id || -1));
            
            if (hasNewFromOthers && !isMuted) {
                // Play audio notification
                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    const playPromise = audioRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.log('Audio play blocked:', error);
                        });
                    }
                }
                
                if (!isOpen) {
                    setUnreadMessages(true);
                }

                // Update unread counts per channel
                setUnreadCounts(prev => {
                    const newCounts = { ...prev };
                    newMsgs.forEach(msg => {
                        if (msg && msg.senderId !== (currentUser?.id || -1) && (!isOpen || activeChannelId !== msg.channelId)) {
                            newCounts[msg.channelId] = (newCounts[msg.channelId] || 0) + 1;
                        }
                    });
                    return newCounts;
                });
            }
        }
        previousMessagesLength.current = safeMessages.length;
    }, [chatMessages, isOpen, activeChannelId, currentUser?.id, isMuted]);

    // Clear unread count when opening a channel
    useEffect(() => {
        if (isOpen) {
            setUnreadCounts(prev => {
                if (prev[activeChannelId]) {
                    const newCounts = { ...prev };
                    delete newCounts[activeChannelId];
                    return newCounts;
                }
                return prev;
            });
        }
    }, [isOpen, activeChannelId]);

    const messagesByChannel = React.useMemo(() => {
        const safeMessages = Array.isArray(chatMessages) ? chatMessages : [];
        return safeMessages.reduce((acc, msg) => {
            if (!msg || !msg.channelId) return acc;
            if (!acc[msg.channelId]) acc[msg.channelId] = [];
            acc[msg.channelId].push(msg);
            return acc;
        }, {} as Record<string, ChatMessage[]>);
    }, [chatMessages]);

    useEffect(() => {
        if (isLoginScreen) {
            setChannels([
                { id: 'support', name: 'الدعم الفني' },
                { id: 'quran', name: 'إذاعة القرآن الكريم' }
            ]);
            setActiveChannelId('support');
            return;
        }
        
        // Filter online users (excluding current user)
        const activeUsers = onlineSessions 
            ? onlineSessions.filter(s => s.userId !== currentUser?.id)
            : [];
        
        const getPrivateChannelId = (id1: number, id2: number) => {
            const sorted = [id1, id2].sort((a, b) => a - b);
            return `private_${sorted[0]}_${sorted[1]}`;
        };

        const initialChannels: ChatChannel[] = [
            { id: 'general', name: 'عام' },
            { id: 'support', name: 'الدعم الفني' },
            { id: 'quran', name: 'إذاعة القرآن الكريم' },
            // Only show online users
            ...activeUsers.map(s => ({ 
                id: getPrivateChannelId(currentUser?.id || 0, s.userId), 
                name: `👤 ${s.userName}` 
            }))
        ];
        setChannels(initialChannels);
    }, [onlineSessions, isLoginScreen, currentUser]);

    const handleAIResponse = async (userMessage: string) => {
        try {
            const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) || import.meta.env.VITE_GEMINI_API_KEY || '';
            const ai = new GoogleGenAI({ apiKey });
            
            const systemInstruction = `أنت مساعد ذكي للدعم الفني لبرنامج محاسبي.
مهمتك هي الإجابة عن كيفية العمل على البرنامج مثل إصدار الفواتير، التكويد بجميع أنواعه، المصروفات، التقارير، وسندات القبض والدفع.
إذا واجهت أي سؤال لا يمكنك الإجابة عليه، أو إذا طلب المستخدم أو الزائر التحدث مع الدعم الفني البشري، يجب عليك الرد حصراً بهذه العبارة: "للتواصل معانا والتحدث مع احد ممثلي الدعم الفني برجاء الاتصال او ارسال واتساب علي الرقم 01007608603".
أجب باللغة العربية وبشكل احترافي ومختصر.`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: userMessage,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                channelId: 'support',
                senderId: -2,
                senderName: 'الدعم الفني الذكي',
                text: response.text || "عذراً، حدث خطأ أثناء معالجة طلبك.",
                timestamp: Date.now(),
            };

            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, aiMessage];
            });
        } catch (error) {
            console.error("AI Error:", error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                channelId: 'support',
                senderId: -2,
                senderName: 'الدعم الفني الذكي',
                text: "بالتواصل عن طريق الواتساب او المكالمات علي الرقم 01007608603",
                timestamp: Date.now(),
            };
            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, errorMessage];
            });
        }
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim()) return;

        if (editingMessageId) {
            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return safePrev.map(msg => 
                    msg.id === editingMessageId 
                        ? { ...msg, text: newMessage.trim(), isEdited: true } 
                        : msg
                );
            });
            setEditingMessageId(null);
            setNewMessage('');
            return;
        }

        const senderId = currentUser?.id || -1;
        const senderName = currentUser?.fullName || 'زائر';

        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: senderId,
            senderName: senderName,
            text: newMessage.trim(),
            timestamp: Date.now(),
        };

        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev, message];
        });

        setNewMessage('');
        setShowEmojiPicker(false);

        if (activeChannelId === 'support') {
            handleAIResponse(message.text);
        }
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const senderId = currentUser?.id || -1;
            const senderName = currentUser?.fullName || 'زائر';
            
            const message: ChatMessage = {
                id: Date.now().toString(),
                channelId: activeChannelId,
                senderId: senderId,
                senderName: senderName,
                text: file.type.startsWith('image/') ? '📷 صورة' : '📎 ملف',
                timestamp: Date.now(),
                attachment: {
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: result,
                    name: file.name
                }
            };

            setChatMessages(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, message];
            });
        };
        reader.readAsDataURL(file);
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("متصفحك لا يدعم تسجيل الصوت.");
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64AudioMessage = reader.result as string;
                    sendAudioMessage(base64AudioMessage);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err: any) {
            // Log error for debugging but keep it clean
            console.warn("Microphone access error:", err.name, err.message);
            
            if (err.name === 'NotFoundError' || err.message.includes('Requested device not found')) {
                alert("لم يتم العثور على ميكروفون. يرجى التأكد من توصيل ميكروفون بجهازك أو التحقق من إعدادات المتصفح.");
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("تم رفض الوصول إلى الميكروفون. يرجى السماح للمتصفح باستخدام الميكروفون من شريط العنوان.");
            } else {
                alert("تعذر الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات وإعادة المحاولة.");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendAudioMessage = (audioData: string) => {
        const senderId = currentUser?.id || -1;
        const senderName = currentUser?.fullName || 'زائر';

        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: senderId,
            senderName: senderName,
            text: 'رسالة صوتية 🎤',
            timestamp: Date.now(),
            audioData: audioData
        };

        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev, message];
        });
    };

    const handleCall = () => {
        const senderId = currentUser?.id || -1;
        const senderName = currentUser?.fullName || 'زائر';

        const message: ChatMessage = {
            id: Date.now().toString(),
            channelId: activeChannelId,
            senderId: senderId,
            senderName: senderName,
            text: '📞 بدأ مكالمة صوتية...',
            timestamp: Date.now(),
            isCall: true
        };

        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev, message];
        });
        
        alert("ميزة المكالمات الصوتية المباشرة (WebRTC) قيد التطوير. تم إرسال إشعار للفرع الآخر.");
    };

    const clearChat = () => {
        setIsClearModalOpen(true);
    };

    const confirmClearChat = () => {
        setChatMessages(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.filter(m => m.channelId !== activeChannelId);
        });
        setIsClearModalOpen(false);
    };

    const startEditing = (msg: ChatMessage) => {
        setEditingMessageId(msg.id);
        setNewMessage(msg.text);
        setShowEmojiPicker(false);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setNewMessage('');
        setShowEmojiPicker(false);
    };

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messagesByChannel, isOpen, activeChannelId]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadMessages(false);
        }
    }

    // Helper to format time like WhatsApp (12:30 PM)
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Radio control effect
    useEffect(() => {
        const audio = radioAudioRef.current;
        if (audio) {
            if (isRadioPlaying) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Radio play error:", error instanceof Error ? error.message : String(error));
                        // Don't automatically stop on all errors to allow buffering/retries
                        if (error && typeof error === 'object' && 'name' in error && error.name === 'NotAllowedError') {
                             setIsRadioPlaying(false);
                        }
                    });
                }
            } else {
                audio.pause();
            }
        }
    }, [isRadioPlaying, selectedStation.url]); // Only depend on URL, not the whole object

    return (
        <>
            <audio ref={audioRef} src="/notification.mp3" preload="auto"></audio>
            <audio 
                ref={radioAudioRef} 
                src={selectedStation.url} 
                preload="none"
                onEnded={() => setIsRadioPlaying(false)}
                onError={(e) => {
                    const target = e.target as HTMLAudioElement;
                    console.error("Radio stream error code:", target.error ? target.error.code : 'unknown');
                    // Only stop if it's a fatal error
                    if (target.error && target.error.code >= 3) {
                         setIsRadioPlaying(false);
                         alert("عذراً، حدث خطأ في تشغيل هذه المحطة. يرجى تجربة محطة أخرى.");
                    }
                }}
            />
            
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center gap-3">
                {/* Radio Floating Button */}
                {!isOpen && (
                    <div className="relative group animate-fade-in-up">
                        <button 
                            onClick={() => setIsRadioPlaying(!isRadioPlaying)}
                            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                                isRadioPlaying ? 'bg-[#008069] text-white ring-4 ring-[#008069]/30' : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                            title="تشغيل/إيقاف إذاعة القرآن الكريم"
                        >
                            {isRadioPlaying ? <Volume2 size={20} className="animate-pulse" /> : <VolumeX size={20} />}
                        </button>
                        {isRadioPlaying && (
                            <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-white px-3 py-1.5 rounded-lg shadow-md text-xs font-bold text-[#008069] whitespace-nowrap border border-gray-100">
                                {selectedStation.name}
                                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white transform rotate-45 border-t border-r border-gray-100"></div>
                            </div>
                        )}
                    </div>
                )}

                {isLoginScreen && !isOpen && (
                    <div className="relative mb-3 bg-[#25D366] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap animate-bounce flex items-center gap-2">
                        نحن هنا لمساعدتك
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#25D366] rotate-45"></div>
                    </div>
                )}
                <button 
                    onClick={toggleChat}
                    className={`bg-[#25D366] text-white rounded-full shadow-xl hover:bg-[#128C7E] focus:outline-none transition-all duration-300 transform hover:scale-105 flex items-center justify-center ${isLoginScreen && !isOpen ? 'px-6 py-3 gap-3' : 'p-4'}`}>
                    {isOpen ? <X size={28} /> : (
                        isLoginScreen ? (
                            <>
                                <Headset size={28} />
                                <span className="font-bold text-lg">الدعم الفني</span>
                            </>
                        ) : (
                            <MessageSquare size={28} fill="currentColor" />
                        )
                    )}
                    {unreadMessages && !isOpen && (
                        <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full bg-red-500 border-2 border-white text-[10px] flex items-center justify-center font-bold">1</span>
                    )}
                </button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div 
                    className={`fixed bottom-24 right-6 bg-[#efe7dd] rounded-[20px] shadow-2xl overflow-hidden flex flex-col animate-fade-in-up z-[9999] font-sans border border-gray-200 transition-all duration-300 ease-in-out ${
                        isExpanded 
                            ? 'w-[90vw] h-[90vh] max-w-[1200px] max-h-[900px]' 
                            : 'w-[500px] max-w-[90vw] h-[650px] max-h-[80vh]'
                    }`}
                >
                    
                    {/* Header */}
                    <div className="bg-[#008069] p-3 flex items-center justify-between text-white shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button onClick={toggleChat} className="md:hidden">
                                    <ArrowLeft size={24} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border border-white/20">
                                    {/* Avatar Placeholder */}
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                                        <MessageSquare size={20} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-base font-bold leading-tight">
                                    {channels.find(c => c.id === activeChannelId)?.name || 'Chat'}
                                </h2>
                                <span className="text-xs text-white/80">متصل الآن</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMuted(!isMuted)} title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "تصغير" : "تكبير"}>
                                {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                            </button>
                            <button onClick={handleCall} title="اتصال">
                                <Phone size={20} />
                            </button>
                            <button title="بحث">
                                <Search size={20} />
                            </button>
                            {currentUser?.id === 1 && (
                                <button onClick={clearChat} title="مسح المحادثة">
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <button title="المزيد">
                                <MoreVertical size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden relative">
                        {/* Sidebar (Channel List) - Vertical */}
                        <div className="w-1/3 bg-white border-l border-gray-200 overflow-y-auto flex flex-col z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-sm">
                                القنوات والأقسام
                            </div>
                            {channels.map(channel => (
                                <button 
                                    key={channel.id}
                                    onClick={() => setActiveChannelId(channel.id)}
                                    className={`text-right px-4 py-3 text-sm font-bold border-b border-gray-100 transition-all flex justify-between items-center ${activeChannelId === channel.id ? 'bg-[#f0f2f5] text-[#008069] border-r-4 border-r-[#008069]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                    <span>{channel.name}</span>
                                    {unreadCounts[channel.id] > 0 && (
                                        <span className="bg-[#25D366] text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                                            {unreadCounts[channel.id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative flex flex-col">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                                backgroundImage: `radial-gradient(#008069 1px, transparent 1px)`,
                                backgroundSize: '20px 20px'
                            }}></div>

                            {activeChannelId === 'quran' ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-4">
                                    <div className={`w-32 h-32 bg-[#008069] rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${isRadioPlaying ? 'animate-pulse scale-110' : ''}`}>
                                        {isRadioPlaying ? (
                                            <Volume2 size={64} className="text-white" />
                                        ) : (
                                            <VolumeX size={64} className="text-white opacity-50" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#008069] mb-2">{selectedStation.name}</h3>
                                        <p className="text-gray-600 text-sm">
                                            {isRadioPlaying ? 'جاري التشغيل...' : 'متوقف'}
                                        </p>
                                    </div>
                                    
                                    <div className="w-full max-w-md space-y-4">
                                        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex justify-center">
                                            <button
                                                onClick={() => setIsRadioPlaying(!isRadioPlaying)}
                                                className={`px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all transform hover:scale-105 ${
                                                    isRadioPlaying 
                                                        ? 'bg-red-500 hover:bg-red-600' 
                                                        : 'bg-[#008069] hover:bg-[#006d59]'
                                                }`}
                                            >
                                                {isRadioPlaying ? 'إيقاف التشغيل' : 'تشغيل الآن'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                                            {stations.map((station, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedStation(station);
                                                        setIsRadioPlaying(true);
                                                    }}
                                                    className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                                                        selectedStation.url === station.url 
                                                            ? 'bg-[#008069] text-white shadow-md' 
                                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                                    }`}
                                                >
                                                    <span>{station.name}</span>
                                                    {selectedStation.url === station.url && isRadioPlaying && (
                                                        <div className="flex gap-1">
                                                            <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '0s' }}></div>
                                                            <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                (messagesByChannel[activeChannelId] || []).map((msg, index) => {
                                    if (!msg) return null;
                                    const isCurrentUser = msg.senderId === (currentUser?.id || -1);
                                    const isSystem = msg.channelId === 'transactions';
                                    
                                    if (isSystem) {
                                        return (
                                            <div key={msg.id || index} className="flex justify-center my-2">
                                                <span className="bg-[#e1f3fb] text-gray-600 text-[10px] px-3 py-1 rounded-lg shadow-sm">
                                                    {msg.text}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id || index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group mb-1`}>
                                            <div 
                                                className={`relative max-w-[80%] px-3 py-1.5 rounded-lg shadow-sm text-sm ${
                                                    isCurrentUser 
                                                        ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' 
                                                        : 'bg-white text-gray-800 rounded-tl-none'
                                                }`}
                                                style={{
                                                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                                                }}
                                            >
                                                {/* Tail SVG */}
                                                {isCurrentUser ? (
                                                    <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -right-2 top-0 text-[#d9fdd3] fill-current">
                                                        <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -left-2 top-0 text-white fill-current transform scale-x-[-1]">
                                                        <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                                                    </svg>
                                                )}

                                                {/* Sender Name (Group Chat style) */}
                                                {!isCurrentUser && (
                                                    <div className="text-[#e542a3] text-xs font-bold mb-0.5">
                                                        {msg.senderName}
                                                    </div>
                                                )}

                                                {/* Message Content */}
                                                <div className="px-1 pt-1 pb-0 relative">
                                                    {msg.isCall ? (
                                                        <div className="flex items-center gap-2 text-gray-800 font-medium pb-2">
                                                            <Phone size={16} className="text-red-500" />
                                                            <span>{msg.text}</span>
                                                        </div>
                                                    ) : msg.audioData ? (
                                                        <div className="flex items-center gap-2 min-w-[200px] pb-2">
                                                            <audio controls src={msg.audioData} className="w-full h-8" />
                                                        </div>
                                                    ) : msg.attachment ? (
                                                        <div className="pb-2">
                                                            {msg.attachment.type === 'image' ? (
                                                                <div className="mb-1 rounded-lg overflow-hidden border border-gray-200">
                                                                    <img src={msg.attachment.url} alt="Attachment" className="max-w-full max-h-[200px] object-cover" />
                                                                </div>
                                                            ) : (
                                                                <a 
                                                                    href={msg.attachment.url} 
                                                                    download={msg.attachment.name}
                                                                    className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors cursor-pointer text-decoration-none"
                                                                    title="اضغط للتحميل"
                                                                >
                                                                    <FileText size={24} className="text-gray-500" />
                                                                    <span className="text-xs truncate max-w-[150px] text-gray-700 font-bold">{msg.attachment.name}</span>
                                                                    <span className="text-[10px] text-blue-600 mr-auto">تنزيل</span>
                                                                </a>
                                                            )}
                                                            <p className="whitespace-pre-wrap leading-relaxed text-[14px] pb-1 mt-1">
                                                                {msg.text}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap leading-relaxed text-[14px] pb-1">
                                                            {msg.text}
                                                        </p>
                                                    )}
                                                    
                                                    {/* Edit Button */}
                                                    {isCurrentUser && !msg.audioData && !msg.isCall && !msg.attachment && (Date.now() - msg.timestamp <= 120000) && (
                                                        <button 
                                                            onClick={() => startEditing(msg)} 
                                                            className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-gray-700"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Metadata (Time & Status) - Moved to bottom right (flex-end) to avoid overlap */}
                                                <div className="flex items-center justify-end gap-1 px-1 pb-1 mt-[-2px]">
                                                    {msg.isEdited && <span className="text-[9px] text-gray-500 italic">معدلة</span>}
                                                    <span className="text-[10px] text-gray-500 min-w-[45px] text-right">
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                    {isCurrentUser && (
                                                        <span className="text-[#53bdeb]">
                                                            <CheckCheck size={16} className="inline" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Footer Input */}
                    <div className="bg-[#f0f2f5] p-2 flex items-end gap-2 z-20 relative">
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-16 left-2 z-50 shadow-2xl rounded-lg overflow-hidden">
                                <EmojiPicker 
                                    onEmojiClick={handleEmojiClick}
                                    width={300}
                                    height={400}
                                    searchDisabled
                                    skinTonesDisabled
                                />
                            </div>
                        )}
                        
                        {activeChannelId === 'transactions' ? (
                            <div className="w-full text-center text-xs text-gray-500 py-3 bg-white rounded-lg shadow-sm">
                                🚫 للقراءة فقط
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 bg-white rounded-[24px] flex items-center px-4 py-2 shadow-sm border border-white focus-within:border-white">
                                    <button 
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`text-gray-500 hover:text-gray-700 ml-2 transition-colors ${showEmojiPicker ? 'text-[#008069]' : ''}`}
                                    >
                                        <Smile size={24} />
                                    </button>
                                    <input 
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={editingMessageId ? "تعديل الرسالة..." : "رسالة"}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-500 text-sm h-6"
                                        disabled={isRecording}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleFileSelect}
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-gray-500 hover:text-gray-700 mr-2 rotate-45"
                                    >
                                        <Paperclip size={22} />
                                    </button>
                                    {editingMessageId && (
                                        <button onClick={cancelEditing} className="text-red-500 hover:text-red-700 mr-2">
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                                
                                {newMessage.trim() || editingMessageId ? (
                                    <button 
                                        onClick={() => handleSendMessage()}
                                        className="bg-[#008069] text-white p-3 rounded-full shadow-md hover:bg-[#006d59] transition-all transform hover:scale-105 flex items-center justify-center w-12 h-12"
                                    >
                                        {editingMessageId ? <Check size={20} /> : <Send size={20} className="ml-1" />}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#008069]'} text-white p-3 rounded-full shadow-md hover:opacity-90 transition-all transform hover:scale-105 flex items-center justify-center w-12 h-12`}
                                    >
                                        {isRecording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <Mic size={20} />}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {isClearModalOpen && (
                <Modal show={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="مسح الدردشة">
                    <div className="p-6 text-center">
                        <Trash2 className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">مسح محتوى الدردشة؟</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">سيتم حذف جميع الرسائل في هذه القناة. هذا الإجراء لا يمكن التراجع عنه.</p>
                        <div className="flex justify-center space-x-4 space-x-reverse">
                            <button onClick={confirmClearChat} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-md">
                                مسح
                            </button>
                            <button onClick={() => setIsClearModalOpen(false)} className="bg-gray-100 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-bold shadow-md border border-gray-300">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default Chat;
