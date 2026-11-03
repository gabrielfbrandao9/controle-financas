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

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Minhas Finanças: mostra o site (que vem dentro do APK, em assets/www) num WebView.
 *
 * Os arquivos são servidos em https://appassets.androidplatform.net/ (endereço reservado
 * pelo Android para isso), assim o site roda como uma página normal e os dados ficam no
 * localStorage do app. A ponte "Android" deixa o site salvar arquivos (cópia de segurança e
 * planilha) e mudar a cor das barras do sistema conforme o tema.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String INICIO = "https://" + HOST + "/index.html";
    private static final int REQ_SALVAR = 1;
    private static final int REQ_ABRIR = 2;

    private WebView web;
    private ValueCallback<Uri[]> escolhaArquivo;
    private String pendenteNome;
    private String pendenteConteudo;

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

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(INICIO);
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
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            try {
                InputStream in = getAssets().open("www" + path);
                WebResourceResponse r = new WebResourceResponse(tipo(path), "UTF-8", in);
                return r;
            } catch (Exception e) {
                WebResourceResponse r = new WebResourceResponse("text/plain", "UTF-8", null);
                r.setStatusCodeAndReasonPhrase(404, "Not Found");
                return r;
            }
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
