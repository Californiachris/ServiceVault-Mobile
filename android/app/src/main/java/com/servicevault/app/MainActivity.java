package com.servicevault.app;

import com.getcapacitor.BridgeActivity;
import android.os.Build;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends BridgeActivity {
  
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Handle safe area insets for status bar and navigation buttons
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      getWindow().setDecorFitsSystemWindows(false);
    }
    
    // Get root content view and apply window insets as padding
    View rootView = findViewById(android.R.id.content);
    if (rootView != null) {
      ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, insets) -> {
        int top = insets.getSystemWindowInsetTop();
        int bottom = insets.getSystemWindowInsetBottom();
        int left = insets.getSystemWindowInsetLeft();
        int right = insets.getSystemWindowInsetRight();
        
        // Apply padding to WebView container
        v.setPadding(left, top, right, bottom);
        
        return insets;
      });
    }
  }
}
