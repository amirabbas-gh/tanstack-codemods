import { appWithTranslation } from "next-i18next";

function App({ Component, pageProps }: any) {
  return (
    <div>
      <Component {...pageProps} />
    </div>
  );
}

export default appWithTranslation(App);
