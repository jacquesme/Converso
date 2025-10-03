import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';

/**
 * If you already have a translate service, replace this with your import:
 *   import { translate } from './src/services/translate';
 * and call it from translateText().
 */
async function translateText(
  text: string,
  _from: string,
  _to: string,
): Promise<string> {
  // TODO: wire up your real translation (returning the same text for now).
  return text;
}

const LANGS = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
];

export default function App() {
  const [sourceLang, setSourceLang] = useState('en-US');
  const [targetLang, setTargetLang] = useState('es-ES');

  const [heard, setHeard] = useState('');
  const [translated, setTranslated] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  const finishSubRef = useRef<{ remove?: () => void } | null>(null);
  const cancelSubRef = useRef<{ remove?: () => void } | null>(null);

  // Ask for mic permission on Android the first time we try to listen.
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

  const speak = useCallback(async (text: string, lang: string) => {
    if (!text?.trim()) return;
    try {
      setIsSpeaking(true);
      // Set voice params (best-effort; ignore if not supported on device)
      Tts.setDefaultLanguage(lang).catch(() => {});
      // You can also tweak rate/pitch if you want:
      // Tts.setDefaultRate(0.5, true);
      // Tts.setDefaultPitch(1.0);

      await Tts.speak(text);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    const ok = await ensureMicPermission();
    if (!ok) return;

    try {
      setHeard('');
      setTranslated('');
      await Voice.start(sourceLang);
      setIsListening(true);
    } catch (e) {
      setIsListening(false);
    }
  }, [ensureMicPermission, sourceLang]);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {}
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    // Initialize TTS
    Tts.getInitStatus().catch(() => {});

    // --- TTS events (use addEventListener and clean up safely)
    const onTtsFinish = () => {
      setIsSpeaking(false);
      if (handsFree) {
        // Resume listening automatically when hands-free mode is ON
        startListening().catch(() => {});
      }
    };
    const onTtsCancel = () => {
      setIsSpeaking(false);
    };

    // Newer react-native-tts returns EmitterSubscription with .remove()
    // Older versions need removeEventListener, so we keep a reference and try both.
    const finishSub = Tts.addEventListener?.('tts-finish', onTtsFinish);
    const cancelSub = Tts.addEventListener?.('tts-cancel', onTtsCancel);
    finishSubRef.current = finishSub ?? null;
    cancelSubRef.current = cancelSub ?? null;

    // --- Voice events
    Voice.onSpeechResults = async (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? '';
      setHeard(text);
      try {
        const out = await translateText(text, sourceLang, targetLang);
        setTranslated(out);
        // Speak translation right away (optional). If you prefer a button, remove this line.
        speak(out, targetLang);
      } catch {
        // ignore translation errors
      }
    };

    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      // In hands-free mode, try to restart automatically on errors.
      if (handsFree) {
        startListening().catch(() => {});
      } else {
        setIsListening(false);
      }
    };

    return () => {
      // Clean up TTS events
      try {
        if (finishSubRef.current?.remove) finishSubRef.current.remove();
        else Tts.removeEventListener?.('tts-finish', onTtsFinish);
      } catch {}

      try {
        if (cancelSubRef.current?.remove) cancelSubRef.current.remove();
        else Tts.removeEventListener?.('tts-cancel', onTtsCancel);
      } catch {}

      try {
        Tts.stop();
      } catch {}

      // Clean up Voice events
      Voice.destroy().catch(() => {});
      Voice.removeAllListeners(); // NOTE: correct casing (capital L)
    };
  }, [handsFree, sourceLang, speak, startListening, targetLang]);

  const swapLangs = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setHeard('');
    setTranslated('');
  }, [sourceLang, targetLang]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Converso</Text>

      <View style={styles.row}>
        <View style={styles.pickerBox}>
          <Text style={styles.label}>Listen</Text>
          <Picker
            selectedValue={sourceLang}
            onValueChange={v => setSourceLang(String(v))}
          >
            {LANGS.map(l => (
              <Picker.Item key={l.code} label={l.label} value={l.code} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={styles.swap} onPress={swapLangs}>
          <Text style={styles.swapTxt}>⇄</Text>
        </TouchableOpacity>

        <View style={styles.pickerBox}>
          <Text style={styles.label}>Speak</Text>
          <Picker
            selectedValue={targetLang}
            onValueChange={v => setTargetLang(String(v))}
          >
            {LANGS.map(l => (
              <Picker.Item key={l.code} label={l.label} value={l.code} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Heard</Text>
        <TextInput
          style={styles.box}
          placeholder="What you said…"
          value={heard}
          onChangeText={setHeard}
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Translation</Text>
        <TextInput
          style={styles.box}
          placeholder="Translation…"
          value={translated}
          onChangeText={setTranslated}
          multiline
        />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, isListening && styles.buttonActive]}
          onPress={toggleListening}
        >
          <Text style={styles.buttonText}>
            {isListening ? 'Stop' : 'Listen'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isSpeaking && styles.buttonActive]}
          onPress={() => speak(translated || heard, targetLang)}
          disabled={!translated && !heard}
        >
          <Text style={styles.buttonText}>Speak</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, handsFree && styles.buttonActive]}
          onPress={() => setHandsFree(s => !s)}
        >
          <Text style={styles.buttonText}>
            {handsFree ? 'Hands-free: ON' : 'Hands-free: OFF'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0b0e13' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerBox: {
    flex: 1,
    backgroundColor: '#151a22',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  label: { color: '#b6c0d1', fontSize: 12, marginTop: 8, marginBottom: 4 },
  swap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e2633',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  swapTxt: { color: 'white', fontSize: 20 },
  section: { marginTop: 14 },
  box: {
    minHeight: 60,
    backgroundColor: '#151a22',
    color: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#2a3446',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonActive: { backgroundColor: '#3f80ff' },
  buttonText: { color: 'white', fontWeight: '600' },
});
