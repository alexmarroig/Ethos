import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

type ErrorBoundaryProps = React.PropsWithChildren<{}>;

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled exception:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.message}>{String(this.state.error?.message ?? 'Erro inesperado')}</Text>
          <TouchableOpacity style={styles.action} onPress={this.reset}>
            <Text style={styles.actionText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111b25',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 12,
    fontWeight: '700',
  },
  message: {
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  action: {
    backgroundColor: '#2c6e8f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
});
