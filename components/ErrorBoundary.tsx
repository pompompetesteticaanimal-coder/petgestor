
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
                    <h2 className="font-bold text-lg mb-2">Algo deu errado 😕</h2>
                    <p className="text-sm mb-2 opacity-80">
                        Ocorreu um erro ao carregar {this.props.name || 'este componente'}.
                    </p>
                    <div className="bg-white p-3 rounded-lg text-xs font-mono overflow-auto border border-red-100 mb-4 max-h-32">
                        {this.state.error?.toString()}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-sm w-full active:scale-95 transition-transform"
                    >
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
