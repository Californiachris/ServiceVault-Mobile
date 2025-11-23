package com.servicevault.app;

import com.getcapacitor.BridgeActivity;
import android.os.Build;

public class MainActivity extends BridgeActivity {
  
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Enable edge-to-edge display with proper safe area handling
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      getWindow().setDecorFitsSystemWindows(false);
    }
  }
}
