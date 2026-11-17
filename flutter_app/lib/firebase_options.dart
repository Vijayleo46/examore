import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static const String firestoreDatabaseId =
      'ai-studio-a424a45a-642f-4a57-b2e1-2cf2fca8e554';

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are configured for Android and Web platforms.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDz8Oth2Dglpm6nqzinRhahwE_aBhX9clw',
    appId: '1:219177770643:web:6d1019e314e6a5bc843766',
    messagingSenderId: '219177770643',
    projectId: 'examverse-8f939',
    authDomain: 'examverse-8f939.firebaseapp.com',
    storageBucket: 'examverse-8f939.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAtRBBnnDc3d1eg_yAh3n8SpeOBQ2sftEs',
    appId: '1:219177770643:android:1ef5f230b91d187a843766',
    messagingSenderId: '219177770643',
    projectId: 'examverse-8f939',
    storageBucket: 'examverse-8f939.firebasestorage.app',
  );
}
