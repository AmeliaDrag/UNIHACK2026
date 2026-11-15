import { View, StyleSheet, StatusBar, Text, TouchableOpacity } from 'react-native';
import WebView from 'react-native-webview';
import { useRef, useState, useEffect } from 'react';
import * as Location from 'expo-location';

export default function App() {
  const webViewRef = useRef<any>(null);
  const [hasError, setHasError] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
      }
    })();
  }, []);

  const handleReload = () => {
    setHasError(false);
    webViewRef.current?.reload();
  };

  // JavaScript to inject into WebView for geolocation support
  const injectedJavaScript = `
    (function() {
      // ═══════════════════════════════════════════════════════════════════════
      // DEBUG: Log exact redirect_uri sent to Auth0
      // ═══════════════════════════════════════════════════════════════════════
      console.log('[Auth0 Debug] window.location.origin =', window.location.origin);
      console.log('[Auth0 Debug] window.location.href =', window.location.href);
      
      // Intercept fetch/XMLHttpRequest to log Auth0 requests
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('auth0.com')) {
          console.log('[Auth0 Debug] Fetch to Auth0:', url);
          if (url.includes('redirect_uri')) {
            const match = url.match(/redirect_uri=([^&]+)/);
            if (match) {
              const redirectUri = decodeURIComponent(match[1]);
              console.log('════════════════════════════════════════════════════════');
              console.log('   EXACT redirect_uri sent to Auth0:');
              console.log('   ' + redirectUri);
              console.log('════════════════════════════════════════════════════════');
              // Send to React Native for display
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'AUTH0_REDIRECT_URI',
                redirectUri: redirectUri
              }));
            }
          }
        }
        return originalFetch.apply(this, args);
      };

      try {
        // Suprascrie navigator.permissions pentru a raporta geolocation ca granted
        if (navigator.permissions && navigator.permissions.query) {
          const originalQuery = navigator.permissions.query.bind(navigator.permissions);
          navigator.permissions.query = function(permissionDesc) {
            if (permissionDesc && permissionDesc.name === 'geolocation') {
              return Promise.resolve({ state: 'granted', onchange: null });
            }
            return originalQuery(permissionDesc);
          };
        }

        // Definește navigator.geolocation prin Object.defineProperty
        const geolocationAPI = {
          getCurrentPosition: function(success, error, options) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'GET_LOCATION',
              options: options || {}
            }));
            
            window.locationSuccess = success;
            window.locationError = error;
          },
          
          watchPosition: function(success, error, options) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'WATCH_LOCATION',
              options: options || {}
            }));
            
            window.locationSuccess = success;
            window.locationError = error;
            return 1; // Return a dummy watch ID
          },
          
          clearWatch: function(watchId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'CLEAR_WATCH',
              watchId: watchId
            }));
          }
        };

        Object.defineProperty(navigator, 'geolocation', {
          value: geolocationAPI,
          writable: false,
          configurable: true
        });
      } catch (e) {
        // Fallback: suprascriere directă dacă Object.defineProperty eșuează
        navigator.geolocation = {
          getCurrentPosition: function(success, error, options) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'GET_LOCATION',
              options: options || {}
            }));
            
            window.locationSuccess = success;
            window.locationError = error;
          },
          
          watchPosition: function(success, error, options) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'WATCH_LOCATION',
              options: options || {}
            }));
            
            window.locationSuccess = success;
            window.locationError = error;
            return 1;
          },
          
          clearWatch: function(watchId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'CLEAR_WATCH',
              watchId: watchId
            }));
          }
        };
      }
    })();
    true;
  `;

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // ═══════════════════════════════════════════════════════════════════════
      // Captează și afișează redirect_uri pentru Auth0 Dashboard
      // ═══════════════════════════════════════════════════════════════════════
      if (data.type === 'AUTH0_REDIRECT_URI') {
        console.log('════════════════════════════════════════════════════════');
        console.log('📋 COPY THIS to Auth0 Dashboard:');
        console.log('   Allowed Callback URLs:');
        console.log('   ' + data.redirectUri);
        console.log('   ');
        console.log('   Allowed Logout URLs:');
        console.log('   ' + data.redirectUri);
        console.log('   ');
        console.log('   Allowed Web Origins:');
        console.log('   ' + data.redirectUri);
        console.log('════════════════════════════════════════════════════════');
        return;
      }
      
      if (data.type === 'GET_LOCATION' || data.type === 'WATCH_LOCATION') {
        try {
          // Verificăm din nou permisiunea înainte de citire
          let { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('PERMISSION_DENIED');
          }

          // Folosim Balanced cu fallback pe ultima locație cunoscută
          let location;
          try {
            location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
          } catch {
            location = await Location.getLastKnownPositionAsync();
          }

          if (!location) {
            throw new Error('POSITION_UNAVAILABLE');
          }

          const position = {
            coords: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              altitudeAccuracy: location.coords.altitudeAccuracy,
              heading: location.coords.heading,
              speed: location.coords.speed,
            },
            timestamp: location.timestamp,
          };
          
          webViewRef.current?.injectJavaScript(`
            if (window.locationSuccess) {
              window.locationSuccess(${JSON.stringify(position)});
            }
            true;
          `);
        } catch (error: any) {
          // Verificăm dacă este PERMISSION_DENIED sau POSITION_UNAVAILABLE
          const isPermissionDenied = error?.message === 'PERMISSION_DENIED';
          const errorCode = isPermissionDenied ? 1 : 2;
          
          webViewRef.current?.injectJavaScript(`
            if (window.locationError) {
              window.locationError({
                code: ${errorCode},
                message: "${error?.message || 'Location request failed'}",
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3
              });
            }
            true;
          `);
        }
      }
    } catch (error) {
      console.log('Error handling message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Eroare de conexiune</Text>
          <Text style={styles.errorMessage}>
            Serverul LadyMap nu răspunde pe http://127.0.0.1:5173
          </Text>
          <Text style={styles.errorHint}>
            Asigură-te că aplicația web rulează local pe portul 5173
          </Text>
          <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
            <Text style={styles.reloadButtonText}>Reîncearcă</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: 'http://127.0.0.1:5173' }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          geolocationEnabled={true}
          mixedContentMode="always"
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          cacheEnabled={true}
          onError={() => setHasError(true)}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          onMessage={handleMessage}
          onNavigationStateChange={(navState) => {
            // Log pentru debugging Auth0 redirect_uri
            if (navState.url.includes('auth0') || navState.url.includes('redirect_uri')) {
              console.log('[Auth0 Debug] Navigation:', navState.url);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  reloadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
