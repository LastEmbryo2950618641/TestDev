package com.gamefy.shell.bridge;

import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import com.gamefy.shell.storage.AppStorageAdapter;

public final class AndroidBridgeBinder {
  private AndroidBridgeBinder() {
  }

  public static void attach(WebView webView, AppStorageAdapter storageAdapter) {
    if (webView == null || storageAdapter == null) {
      return;
    }

    webView.getSettings().setJavaScriptEnabled(true);
    webView.getSettings().setDomStorageEnabled(true);
    webView.addJavascriptInterface(new AndroidStorageBridge(storageAdapter), "androidBridgeStorage");
    webView.addJavascriptInterface(new AndroidHostBridge(), "androidHostBridge");
    injectBridgeBootstrap(webView);
  }

  private static void injectBridgeBootstrap(WebView webView) {
    final String script = "(function(){"
      + "window.androidBridge=window.androidBridge||{};"
      + "window.androidBridge.storage=window.androidBridgeStorage;"
      + "window.platformBridge=window.platformBridge||{};"
      + "window.platformBridge.storage=window.androidBridgeStorage;"
      + "window.platformBridge.host=window.androidHostBridge;"
      + "window.platformBridge.capabilities=window.platformBridge.capabilities||{};"
      + "window.platformBridge.capabilities.storage={ready:true,channel:'androidBridge'};"
      + "window.platformBridge.capabilities.host={ready:true,kind:'mobile'};"
      + "})();";

    webView.evaluateJavascript(script, new ValueCallback<String>() {
      @Override
      public void onReceiveValue(String value) {
        // No-op placeholder. This keeps bootstrap injection explicit without leaking runtime logic here.
      }
    });
  }

  private static final class AndroidHostBridge {
    @JavascriptInterface
    public String kind() {
      return "mobile";
    }

    @JavascriptInterface
    public boolean isAndroidShell() {
      return true;
    }
  }

  private static final class AndroidStorageBridge {
    private final AppStorageAdapter storageAdapter;

    private AndroidStorageBridge(AppStorageAdapter storageAdapter) {
      this.storageAdapter = storageAdapter;
    }

    @JavascriptInterface
    public String readRaw(String key) {
      return storageAdapter.readRaw(key);
    }

    @JavascriptInterface
    public void writeRaw(String key, String value) {
      storageAdapter.writeRaw(key, value);
    }

    @JavascriptInterface
    public void removeRaw(String key) {
      storageAdapter.removeRaw(key);
    }

    @JavascriptInterface
    public String readSettings(String key) {
      return storageAdapter.readSettings(key);
    }

    @JavascriptInterface
    public void writeSettings(String key, String value) {
      storageAdapter.writeSettings(key, value);
    }
  }
}
