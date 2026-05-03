import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  PermissionsAndroid,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';

// Adjust path if your project structure differs.
import { translateText } from './src/services/translate';

// Tuning knobs for the hands-free loop
const RESTART_AFTER_TTS_MS = 250;
const RESTART_AFTER_ERROR_MS = 500;
const SPEAK_SAFETY_TIMEOUT_MS = 15000;

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [heard, setHeard] = useState<string>('');
  const [targetLang, setTargetLang] = useState<'en' | 'es'>('en');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ---------- refs: latest-value mirrors so the setup effect can stay single-run
  const handsFreeRef = useRef(handsFree);
  const isSpeakingRef = useRef(isSpeaking);
  const isListeningRef = useRef(isListening);
  const targetLangRef = useRef(targetLang);

  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);

  // Safety timer so isSpeaking can't get stuck true if tts-finish never fires
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSpeakTimeout = () => {
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
  };

  // ---------- helpers ----------
  const ensureMicPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone permission',
        message:
          'Converso needs access to your microphone for speech recognition.',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const startListening = useCallback(async () => {
    // Don't start while we're still speaking — avoids self-echo loops
    if (isSpeakingRef.current) return;
    if (isListeningRef.current) return;

    const ok = await ensureMicPermission();
    if (!ok) {
      console.warn('[Converso] mic permission denied');
      return;
    }
    try {
      setHeard('');
      setErrorMsg('');
      console.log('[Voice] calling Voice.start');
      await Voice.start('en-US'); // change locale as needed
      console.log('[Voice] Voice.start resolved → isListening = true');
      setIsListening(true);
    } catch (e) {
      console.warn('[Converso] Voice.start failed:', e);
      setIsListening(false);
    }
  }, [ensureMicPermission]);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.warn('[Converso] Voice.stop failed:', e);
    } finally {
      setIsListening(false);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text) return;
    try {
      setIsSpeaking(true);
      clearSpeakTimeout();
      // Safety net: if tts-finish / tts-cancel / tts-error never fires, release the flag
      speakTimeoutRef.current = setTimeout(() => {
        console.log('[TTS] safety timeout fired, force-releasing isSpeaking');
        setIsSpeaking(false);
      }, SPEAK_SAFETY_TIMEOUT_MS);
      await Tts.speak(text);
    } catch (e) {
      console.warn('[Converso] Tts.speak failed:', e);
      setIsSpeaking(false);
      clearSpeakTimeout();
    }
  }, []);

  const translateAndSpeak = useCallback(
    async (text: string) => {
      console.log('[Speak] translateAndSpeak called, text:', text);
      try {
        const translated = await translateText(text, targetLangRef.current);
        await speak(translated || text);
      } catch (e) {
        console.warn('[Converso] translate failed, speaking original:', e);
        await speak(text);
      }
    },
    [speak],
  );

  // Stable refs to the functions used inside the single-run setup effect
  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  const translateAndSpeakRef = useRef(translateAndSpeak);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { stopListeningRef.current = stopListening; }, [stopListening]);
  useEffect(() => { translateAndSpeakRef.current = translateAndSpeak; }, [translateAndSpeak]);

  // ---------- Effect: wire up Voice + TTS listeners ONCE ----------
  useEffect(() => {
    Voice.onSpeechStart = () => {
      console.log('[Voice] onSpeechStart — recognition active');
      setErrorMsg('');
    };

    Voice.onSpeechEnd = () => {
      console.log('[Voice] onSpeechEnd — recognition stopped');
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      console.log('[Voice] onSpeechPartialResults:', JSON.stringify(e));
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('[Voice] onSpeechResults:', JSON.stringify(e));
      const t = e.value?.[0] ?? '';
      setHeard(t);
      if (!handsFreeRef.current) return;
      // Stop listening, then translate + speak. The tts-finish handler will resume listening.
      stopListeningRef.current().finally(() => {
        translateAndSpeakRef.current(t);
      });
    };

    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      console.log('[Voice] onSpeechError:', JSON.stringify(_e));
      setIsListening(false);
      if (_e.error?.code === 'recognition_fail') {
        setErrorMsg('Speech recognition unavailable. Test on a physical device.');
        return;
      }
      setErrorMsg('');
      if (handsFreeRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (handsFreeRef.current && !isSpeakingRef.current) {
            startListeningRef.current();
          }
        }, RESTART_AFTER_ERROR_MS);
      }
    };

    const startSub = Tts.addEventListener('tts-start', () => {
      console.log('[TTS] tts-start fired');
    });

    const onFinish = () => {
      console.log('[TTS] tts-finish fired, releasing isSpeaking');
      setIsSpeaking(false);
      clearSpeakTimeout();
      // Resume listening after we finish speaking, if hands-free is on
      if (handsFreeRef.current) {
        setTimeout(() => {
          if (handsFreeRef.current && !isSpeakingRef.current) {
            startListeningRef.current();
          }
        }, RESTART_AFTER_TTS_MS);
      }
    };
    const onCancel = () => {
      setIsSpeaking(false);
      clearSpeakTimeout();
    };
    const finishSub = Tts.addEventListener('tts-finish', onFinish);
    const cancelSub = Tts.addEventListener('tts-cancel', onCancel);

    return () => {
      clearSpeakTimeout();
      Voice.destroy()
        .then(() => Voice.removeAllListeners())
        .catch(() => {});
      startSub?.remove?.();
      finishSub?.remove?.();
      cancelSub?.remove?.();
      try {
        Tts.stop();
      } catch {}
    };
  }, []); // <-- empty deps on purpose; refs keep this fresh

  // ---------- UI handlers ----------
  const onPressMic = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const onPressSpeakHeard = useCallback(() => {
    console.log('[Speak] onPress fired, isSpeaking=', isSpeakingRef.current, 'heard=', heard);
    if (!heard) return;
    translateAndSpeak(heard);
  }, [heard, translateAndSpeak]);

  const onToggleHandsFree = useCallback(() => {
    setHandsFree(h => !h);
  }, []);

  const onToggleLang = useCallback(() => {
    setTargetLang(l => (l === 'en' ? 'es' : 'en'));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Converso</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Listening:</Text>
          <Text style={[styles.value, isListening ? styles.on : styles.off]}>
            {isListening ? 'ON' : 'OFF'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Speaking:</Text>
          <Text style={[styles.value, isSpeaking ? styles.on : styles.off]}>
            {isSpeaking ? 'YES' : 'NO'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Hands-free:</Text>
          <Text style={[styles.value, handsFree ? styles.on : styles.off]}>
            {handsFree ? 'ON' : 'OFF'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Target Lang:</Text>
          <Text style={styles.value}>{targetLang.toUpperCase()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sub}>Heard</Text>
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : (
            <Text style={styles.heard} numberOfLines={4}>
              {heard || '—'}
            </Text>
          )}
        </View>

        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sub}>Debug input</Text>
            <TextInput
              style={styles.debugInput}
              value={heard}
              onChangeText={setHeard}
              placeholder="Type text to test translate + speak…"
              placeholderTextColor="#4a6080"
              returnKeyType="done"
            />
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btn} onPress={onPressMic}>
            <Text style={styles.btnText}>
              {isListening ? 'Stop' : 'Listen'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btn}
            onPress={onPressSpeakHeard}
            disabled={!heard}
          >
            <Text style={styles.btnText}>Speak</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={onToggleHandsFree}>
            <Text style={styles.btnText}>
              {handsFree ? 'Hands-free OFF' : 'Hands-free ON'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={onToggleLang}>
            <Text style={styles.btnText}>
              Lang: {targetLang.toUpperCase()} (toggle)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1, padding: 16, gap: 12 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#9db2ce', fontSize: 14, width: 110 },
  value: { color: '#fff', fontSize: 14 },
  on: { color: '#6ee7b7' },
  off: { color: '#fca5a5' },
  section: { marginTop: 16 },
  sub: { color: '#9db2ce', marginBottom: 6 },
  heard: { color: '#fff', fontSize: 16, lineHeight: 22 },
  errorText: { color: '#fca5a5', fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  debugInput: {
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0f1a2e',
  },
  buttons: {
    marginTop: 'auto',
    gap: 10,
  },
  btn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#e5eefc', fontWeight: '600' },
});
