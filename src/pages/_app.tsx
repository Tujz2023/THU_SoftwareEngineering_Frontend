import { Provider } from 'react-redux';
import store from '../redux/store';
import '../styles/globals.css'; // 确认路径正确
import type { AppProps } from 'next/app';

// eslint-disable-next-line @typescript-eslint/naming-convention
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}

export default MyApp;
