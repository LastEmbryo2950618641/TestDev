package com.gamefy.shell;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import com.gamefy.shell.bridge.AndroidBridgeBinder;
import com.gamefy.shell.storage.AppStorageAdapter;

public class MainActivity extends AppCompatActivity {
  private static final String RUNTIME_ENTRY_URL = "file:///android_asset/publish/index.html";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    WebView webView = findViewById(R.id.gamefy_webview);

    // Placeholder only: later turns should wire real platformBridge/androidBridge injection here.
    AndroidBridgeBinder.attach(webView, new AppStorageAdapter(getApplicationContext()));

    // Shared runtime stays in publish/, and the Android shell only loads the packaged asset entry.
    webView.loadUrl(RUNTIME_ENTRY_URL);
  }
}
