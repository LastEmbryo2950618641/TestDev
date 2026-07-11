package com.gamefy.shell.storage;

import android.content.Context;
import android.content.SharedPreferences;

public final class AppStorageAdapter {
  private static final String RAW_STORE_NAME = "gamefy_raw_store";
  private final Context appContext;
  private final SharedPreferences rawStore;

  public AppStorageAdapter(Context context) {
    this.appContext = context == null ? null : context.getApplicationContext();
    this.rawStore = this.appContext == null
      ? null
      : this.appContext.getSharedPreferences(RAW_STORE_NAME, Context.MODE_PRIVATE);
  }

  public Context getAppContext() {
    return appContext;
  }

  public String readRaw(String key) {
    if (rawStore == null || key == null) {
      return null;
    }
    return rawStore.getString(key, null);
  }

  public void writeRaw(String key, String value) {
    if (rawStore == null || key == null) {
      return;
    }
    rawStore.edit().putString(key, value).apply();
  }

  public void removeRaw(String key) {
    if (rawStore == null || key == null) {
      return;
    }
    rawStore.edit().remove(key).apply();
  }

  public String readSettings(String key) {
    return readRaw(key);
  }

  public void writeSettings(String key, String value) {
    writeRaw(key, value);
  }
}
