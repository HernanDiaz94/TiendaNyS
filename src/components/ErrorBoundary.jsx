import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('NyS UI error', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="crash-screen">
          <span className="eyebrow">ALGO SALIÓ MAL</span>
          <h1>Recargá la página.</h1>
          <p>Tuvimos un problema al mostrar la tienda. Tus datos y tu bolsa siguen guardados.</p>
          <button className="btn btn--primary" type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
