import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Icons, AppLogo } from './Icons';

interface LoginViewProps {
    onClose: () => void;
    showNotification: (msg: string, type: 'success' | 'error') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onClose, showNotification }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
            showNotification("登入成功！已切換至雲端模式", "success");
            onClose();
        } catch (error: any) {
            console.error(error);
            showNotification("Google 登入失敗: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
                showNotification("註冊成功！", "success");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                showNotification("登入成功！", "success");
            }
            onClose();
        } catch (error: any) {
            console.error(error);
            let msg = error.message;
            if (error.code === 'auth/invalid-credential') msg = "帳號或密碼錯誤";
            if (error.code === 'auth/email-already-in-use') msg = "此 Email 已被註冊";
            if (error.code === 'auth/weak-password') msg = "密碼強度不足 (需6位以上)";
            showNotification(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose}></div>
            <div className="bg-muji-paper w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-pop relative z-10 flex flex-col">
                <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-muji-text font-sans tracking-wide">
                        {isRegistering ? '註冊帳號' : '登入雲端'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><Icons.X size={20}/></button>
                </div>

                <div className="p-8 flex flex-col gap-6">
                    <div className="text-center">
                        <div className="inline-block p-3 rounded-2xl bg-white shadow-sm mb-3">
                            <AppLogo className="w-10 h-10 text-muji-ink"/>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            登入後資料將儲存於雲端<br/>
                            可跨裝置同步，更換手機也不遺失
                        </p>
                    </div>

                    <button 
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition shadow-sm active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span className="text-sm font-bold text-gray-600">使用 Google 帳號登入</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="h-[1px] bg-gray-200 flex-1"></div>
                        <span className="text-[10px] text-gray-300">或使用 Email</span>
                        <div className="h-[1px] bg-gray-200 flex-1"></div>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-3">
                        <input 
                            type="email" 
                            required
                            placeholder="電子信箱"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-muji-ink outline-none text-sm transition-colors placeholder-gray-400 text-muji-text"
                        />
                        <input 
                            type="password" 
                            required
                            placeholder="密碼"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-muji-ink outline-none text-sm transition-colors placeholder-gray-400 text-muji-text"
                        />
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 bg-muji-ink text-white rounded-xl shadow-lg hover:opacity-90 transition font-bold text-sm tracking-wide mt-2"
                        >
                            {loading ? '處理中...' : (isRegistering ? '註冊' : '登入')}
                        </button>
                    </form>

                    <button 
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-xs text-center text-gray-400 hover:text-muji-ink transition underline decoration-gray-300 underline-offset-4"
                    >
                        {isRegistering ? '已有帳號？點此登入' : '沒有帳號？點此註冊'}
                    </button>
                </div>
            </div>
        </div>
    );
};