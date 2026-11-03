package com.gabrielfbrandao.financas;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Minhas Finanças: mostra o site num WebView.
 *
 * Os arquivos são servidos em https://appassets.androidplatform.net/ (endereço reservado
 * pelo Android para isso), assim o site roda como uma página normal e os dados ficam no
 * localStorage do app. Cada arquivo vem, nesta ordem:
 *   1. do site publicado (GitHub Pages), se houver internet: assim o app se atualiza sozinho;
 *      a cópia baixada fica guardada no aparelho;
 *   2. da última cópia baixada (sem internet);
 *   3. da cópia que veio dentro do APK (assets/www).
 * A ponte "Android" deixa o site salvar arquivos (cópia de segurança e planilha), abrir o
 * login no navegador, saber a versão do app e mudar a cor das barras do sistema.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String INICIO = "https://" + HOST + "/index.html";
    private static final String SITE = "https://gabrielfbrandao9.github.io/controle-financas";
    private static final String PASTA_CACHE = "web";
    // Depois de uma falha de rede, usa só a cópia guardada por um tempo (não fica esperando)
    private volatile long semRedeAte = 0;
    private static final int REQ_SALVAR = 1;
    private static final int REQ_ABRIR = 2;

    private static final String RETORNO_LOGIN = "com.gabrielfbrandao.financas";

    private WebView web;
    private ValueCallback<Uri[]> escolhaArquivo;
    private String pendenteNome;
    private String pendenteConteudo;
    private String loginPendente;
    private boolean paginaPronta;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Ponte(), "Android");
        web.setWebViewClient(new Cliente());
        web.setWebChromeClient(new Chrome());

        limparCacheDeOutraVersao();
        guardarRetornoLogin(getIntent());
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(INICIO);
    }

    private String versaoApp() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "";
        }
    }

    // APK novo instalado: a cópia baixada pela versão anterior pode ser mais velha que a do APK
    private void limparCacheDeOutraVersao() {
        android.content.SharedPreferences p = getSharedPreferences("app", MODE_PRIVATE);
        String atual = versaoApp();
        if (!atual.equals(p.getString("cacheDaVersao", ""))) {
            apagar(new File(getFilesDir(), PASTA_CACHE));
            p.edit().putString("cacheDaVersao", atual).apply();
        }
    }

    private static void apagar(File f) {
        File[] filhos = f.listFiles();
        if (filhos != null) for (File c : filhos) apagar(c);
        f.delete();
    }

    private byte[] baixarDoSite(String path) {
        if (System.currentTimeMillis() < semRedeAte) return null;
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(SITE + path).openConnection();
            c.setConnectTimeout(2500);
            c.setReadTimeout(5000);
            c.setUseCaches(false);
            c.setRequestProperty("Cache-Control", "no-cache");
            if (c.getResponseCode() != 200) return null;
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] b = new byte[16384];
                int n;
                while ((n = in.read(b)) > 0) out.write(b, 0, n);
                return out.toByteArray();
            }
        } catch (IOException e) {
            semRedeAte = System.currentTimeMillis() + 30000;
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private void guardarCopia(String path, byte[] dados) {
        try {
            File f = new File(new File(getFilesDir(), PASTA_CACHE), path.substring(1));
            File dir = f.getParentFile();
            if (dir != null && !dir.isDirectory() && !dir.mkdirs()) return;
            File tmp = new File(f.getPath() + ".tmp");
            try (FileOutputStream o = new FileOutputStream(tmp)) {
                o.write(dados);
            }
            if (!tmp.renameTo(f)) {
                f.delete();
                tmp.renameTo(f);
            }
        } catch (IOException e) {
            // sem espaço: segue sem guardar
        }
    }

    // O app já estava aberto e o navegador devolveu o login
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        guardarRetornoLogin(intent);
        entregarLogin();
    }

    private void guardarRetornoLogin(Intent intent) {
        Uri u = intent == null ? null : intent.getData();
        if (u != null && RETORNO_LOGIN.equals(u.getScheme())) loginPendente = u.toString();
    }

    private void entregarLogin() {
        if (loginPendente == null || !paginaPronta) return;
        String url = loginPendente;
        loginPendente = null;
        web.evaluateJavascript("window.onLoginRetorno && window.onLoginRetorno(" + JSONObject.quote(url) + ")", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    // Voltar: o site fecha o formulário aberto ou volta ao Início; se já estiver no Início, sai.
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.voltarAndroid && window.voltarAndroid()) === true", valor -> {
            if (!"true".equals(valor)) finish();
        });
    }

    private void chamarJs(String js) {
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Uri uri = (resultCode == RESULT_OK && data != null) ? data.getData() : null;

        if (requestCode == REQ_ABRIR) {
            if (escolhaArquivo != null) escolhaArquivo.onReceiveValue(uri != null ? new Uri[]{uri} : null);
            escolhaArquivo = null;
            return;
        }

        if (requestCode == REQ_SALVAR) {
            boolean ok = false;
            if (uri != null && pendenteConteudo != null) {
                try (OutputStream os = getContentResolver().openOutputStream(uri, "w")) {
                    if (os != null) {
                        os.write(pendenteConteudo.getBytes(StandardCharsets.UTF_8));
                        ok = true;
                    }
                } catch (Exception e) {
                    ok = false;
                }
            }
            String nome = pendenteNome == null ? "" : pendenteNome;
            pendenteConteudo = null;
            pendenteNome = null;
            chamarJs("window.onArquivoSalvo && window.onArquivoSalvo(" + ok + ", " + JSONObject.quote(nome) + ")");
        }
    }

    /** Funções que o site chama como window.Android.xxx(...) */
    private class Ponte {
        @JavascriptInterface
        public void salvarArquivo(String nome, String conteudo, String mime) {
            runOnUiThread(() -> {
                pendenteNome = nome;
                pendenteConteudo = conteudo;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                i.putExtra(Intent.EXTRA_TITLE, nome);
                try {
                    startActivityForResult(i, REQ_SALVAR);
                } catch (ActivityNotFoundException e) {
                    pendenteConteudo = null;
                    chamarJs("window.onArquivoSalvo && window.onArquivoSalvo(false, '')");
                }
            });
        }

        @JavascriptInterface
        public String versao() {
            return versaoApp();
        }

        // Login com Google e download de versão nova: abrem no navegador do celular
        // (o Google não aceita login dentro de WebView)
        @JavascriptInterface
        public void abrirNavegador(String url) {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (ActivityNotFoundException e) {
                    chamarJs("window.onLoginRetorno && window.onLoginRetorno('x://login?error=sem_navegador')");
                }
            });
        }

        @JavascriptInterface
        public void tema(boolean escuro, String fundo, String superficie) {
            runOnUiThread(() -> {
                Window w = getWindow();
                int corFundo = cor(fundo, escuro ? 0xFF111518 : 0xFFF3F1EC);
                int corBarra = cor(superficie, escuro ? 0xFF1A2024 : 0xFFFFFFFF);
                w.setStatusBarColor(corFundo);
                w.setNavigationBarColor(corBarra);
                View v = w.getDecorView();
                int flags = v.getSystemUiVisibility();
                flags = escuro ? (flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR) : (flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
                if (Build.VERSION.SDK_INT >= 26) {
                    flags = escuro ? (flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) : (flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                }
                v.setSystemUiVisibility(flags);
                v.setBackgroundColor(corFundo);
            });
        }
    }

    private static int cor(String css, int padrao) {
        try {
            return Color.parseColor(css.trim());
        } catch (Exception e) {
            return padrao;
        }
    }

    /** Entrega os arquivos de assets/www e manda links de fora para o navegador. */
    private class Cliente extends WebViewClient {
        @Override
        public void onPageFinished(WebView view, String url) {
            if (url != null && url.startsWith("https://" + HOST + "/index.html")) {
                paginaPronta = true;
                entregarLogin();
            }
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            if (path.contains("..")) return naoAchou();

            // 1. Versão mais nova, do site publicado
            byte[] novo = baixarDoSite(path);
            if (novo != null) {
                guardarCopia(path, novo);
                return new WebResourceResponse(tipo(path), "UTF-8", new ByteArrayInputStream(novo));
            }
            // 2. Última cópia baixada
            File f = new File(new File(getFilesDir(), PASTA_CACHE), path.substring(1));
            if (f.isFile()) {
                try {
                    return new WebResourceResponse(tipo(path), "UTF-8", new FileInputStream(f));
                } catch (IOException e) {
                    // tenta a do APK
                }
            }
            // 3. Cópia que veio no APK
            try {
                return new WebResourceResponse(tipo(path), "UTF-8", getAssets().open("www" + path));
            } catch (IOException e) {
                return naoAchou();
            }
        }

        private WebResourceResponse naoAchou() {
            WebResourceResponse r = new WebResourceResponse("text/plain", "UTF-8", null);
            r.setStatusCodeAndReasonPhrase(404, "Not Found");
            return r;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (HOST.equals(u.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));
            } catch (ActivityNotFoundException e) {
                // sem navegador: ignora
            }
            return true;
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (escolhaArquivo != null) escolhaArquivo.onReceiveValue(null);
            escolhaArquivo = callback;
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            try {
                startActivityForResult(i, REQ_ABRIR);
            } catch (ActivityNotFoundException e) {
                escolhaArquivo = null;
                return false;
            }
            return true;
        }
    }

    private static String tipo(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }
}
