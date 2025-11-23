package com.servicevault.app;

import com.getcapacitor.BridgeActivity;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
  
  @Override
  protected void onStart() {
    super.onStart();
    
    // Apply safe area insets to WebView - handles status bar and navigation buttons
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      getWindow().setDecorFitsSystemWindows(false);
      
      View webView = getWebView();
      if (webView != null) {
        webView.setOnApplyWindowInsetsListener((v, insets) -> {
          WindowInsets.Type statusBars = WindowInsets.Type.systemBars();
          var systemWindowInsets = insets.getInsets(statusBars);
          
          // Apply padding to account for status bar and navigation buttons
          webView.setPadding(
            systemWindowInsets.left,
            systemWindowInsets.top,
            systemWindowInsets.right,
            systemWindowInsets.bottom
          );
          
          return insets;
        });
      }
    } else {
      // Fallback for older Android versions
      View decorView = getWindow().getDecorView();
      int uiOptions = View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                      View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
      decorView.setSystemUiVisibility(uiOptions);
    }
  }
}
