import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleClearAndReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '640px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
                !
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                  Si è verificato un errore imprevisto
                </h1>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  LUPO 2.0 - Gestione Laboratorio Chimico
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
              L'applicazione ha riscontrato un problema imprevisto durante l'avvio o la visualizzazione di un componente:
            </p>

            <div style={{
              backgroundColor: '#0f172a',
              color: '#f87171',
              padding: '12px 16px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              wordBreak: 'break-word',
              marginBottom: '24px'
            }}>
              {this.state.error?.message || 'Errore sconosciuto'}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Ricarica Pagina
              </button>
              <button
                onClick={this.handleClearAndReset}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancella Cache Locale e Ricarica
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
