import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as styles from './ErrorBoundary.module.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorContent}>
            <h2>Something went wrong</h2>
            <p>We encountered an error while loading the 3D geological model.</p>
            {this.props.showErrorDetails && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Error Details</summary>
                <pre>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className={styles.errorActions}>
              <button
                onClick={this.handleRetry}
                className={styles.retryButton}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className={styles.reloadButton}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  showErrorDetails: PropTypes.bool
};

ErrorBoundary.defaultProps = {
  showErrorDetails: false
};

export default ErrorBoundary;