package com.servicevault.app;

import com.getcapacitor.BridgeActivity;
import android.os.Build;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.graphics.Rect;

public class MainActivity extends BridgeActivity {
  
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Enable edge-to-edge display
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      getWindow().setDecorFitsSystemWindows(false);
    }
    
    // Setup safe area insets handling after layout is ready
    View rootView = findViewById(android.R.id.content);
    if (rootView != null) {
      rootView.post(() -> applySafeAreaInsets(rootView));
    }
  }
  
  private void applySafeAreaInsets(View view) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      android.view.WindowInsets insets = view.getRootWindowInsets();
      if (insets != null) {
        android.view.WindowInsets.Type systemBarsType = android.view.WindowInsets.Type.systemBars();
        Rect systemWindowInsets = insets.getInsets(systemBarsType);
        
        // Apply padding to WebView to account for status bar and navigation buttons
        view.setPadding(
          systemWindowInsets.left,
          systemWindowInsets.top,
          systemWindowInsets.right,
          systemWindowInsets.bottom
        );
      }
    }
  }
}
