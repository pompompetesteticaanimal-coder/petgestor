
import React, { useState } from 'react';
import { Lock, Mail, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
    onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('Pompompetesteticaanimal@gmail.com');
    const [password, setPassword] = useState('Pompom@2025');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            if (email === 'Pompompetesteticaanimal@gmail.com' && password === 'Pompom@2025') {
                onLogin();
            } else {
                setError('Email ou senha inválidos.');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-6 z-[100]">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-100 animate-scale-up">
                <div className="bg-brand-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paw-prints.png')]"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg">
                            <Lock size={40} />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">PetGestor AI</h1>
                        <p className="text-brand-100 text-sm">Acesso Administrativo</p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium text-gray-700 placeholder-gray-300"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium text-gray-700 placeholder-gray-300"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-200 transition-all flex items-center justify-center gap-2 group ${isLoading ? 'opacity-70 cursor-wait' : 'hover:-translate-y-1'}`}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Entrar no Sistema
                                    <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-400">© 2025 PetGestor AI. Todos os direitos reservados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
