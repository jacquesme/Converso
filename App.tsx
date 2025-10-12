import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  PermissionsAndroid,
  EmitterSubscription,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';

// If you already have this helper, keep it.
// Adjust the import path if your project structure differs.
import { translateText } from './src/services/translate';

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [heard, setHeard] = useState<string>('');
  const [targetLang, setTargetLang] = useState<'en' | 'es'>('en');

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
    const ok = await ensureMicPermission();
    if (!ok) return;
    try {
      setHeard('');
      // Use your preferred locale here
      await Voice.start('en-US');
      setIsListening(true);
    } catch (e) {
      setIsListening(false);
    }
  }, [ensureMicPermission]);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } finally {
      setIsListening(false);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text) return;
    try {
      setIsSpeaking(true);
      // Set a voice / rate / pitch only if you need to. Defaults are fine for most cases.
      // await Tts.setDefaultRate(0.5);
      // await Tts.setDefaultPitch(1.0);
      await Tts.speak(text);
    } catch (e) {
      setIsSpeaking(false);
    }
  }, []);

  const translateAndSpeak = useCallback(
    async (text: string) => {
      try {
        const translated = await translateText(text, targetLang);
        await speak(translated || text);
      } catch {
        // fallback to original text if translation fails
        await speak(text);
      }
    },
    [speak, targetLang],
  );

  // ---------- Voice event handlers ----------
  const onSpeechResults = useCallback(
    (e: SpeechResultsEvent) => {
      const t = e.value?.[0] ?? '';
      setHeard(t);
      if (!handsFree) return;

      // In hands-free mode, stop listening and speak the result immediately
      stopListening().finally(() => {
        // translate & speak
        translateAndSpeak(t);
      });
    },
    [handsFree, stopListening, translateAndSpeak],
  );

  const onSpeechError = useCallback(
    (_e: SpeechErrorEvent) => {
      setIsListening(false);
      // If hands-free, try to restart the microphone quickly
      if (handsFree) {
        // small debounce/backoff can be added if needed
        startListening();
      }
    },
    [handsFree, startListening],
  );

  // ---------- Effect: wire up Voice and TTS listeners ----------

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    const finishSub = Tts.addEventListener('tts-finish', () =>
      setIsSpeaking(false),
    ) as unknown as EmitterSubscription;
    const cancelSub = Tts.addEventListener('tts-cancel', () =>
      setIsSpeaking(false),
    ) as unknown as EmitterSubscription;
    const errorSub = Tts.addEventListener('tts-error', () =>
      setIsSpeaking(false),
    ) as unknown as EmitterSubscription;

    return () => {
      try {
        Voice.destroy().finally(() => Voice.removeAllListeners());
      } catch {}
      try {
        finishSub?.remove();
      } catch {}
      try {
        cancelSub?.remove();
      } catch {}
      try {
        errorSub?.remove();
      } catch {}
      try {
        Tts.stop();
      } catch {}
    };
  }, [onSpeechError, onSpeechResults]);

  // ---------- UI handlers ----------
  const onPressMic = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const onPressSpeakHeard = useCallback(() => {
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
          <Text style={styles.heard} numberOfLines={4}>
            {heard || '—'}
          </Text>
        </View>

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
