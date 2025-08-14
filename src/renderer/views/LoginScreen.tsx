import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setToken } from '../store/slices/authSlice';

export default function LoginScreen() {
    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.auth);
    const [tokenInput, setTokenInput] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (tokenInput.trim()) {
            dispatch(setToken(tokenInput.trim()));
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">DevOps Control Center</h1>
                    <p className="text-gray-600">Connect with your GitHub account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                            GitHub Personal Access Token
                        </label>
                        <input
                            id="token"
                            type="password"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            className="input"
                            required
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Generate a token at{' '}
                            <a
                                href="#"
                                onClick={() => {/* Open external link */ }}
                                className="text-primary-600 hover:text-primary-700"
                            >
                                GitHub Settings → Developer settings → Personal access tokens
                            </a>
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !tokenInput.trim()}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Connecting...' : 'Connect'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        Required scopes: repo, user, workflow
                    </p>
                </div>
            </div>
        </div>
    );
}
