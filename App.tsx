import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import Voice, {
  SpeechStartEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { translateText } from './src/services/translate';

// -------------------- Language helpers --------------------
type TargetLang = 'en' | 'de' | 'ru' | 'nl' | 'pl' | 'af' | 'fr';

const LANGS: Array<{ code: TargetLang; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'RU' },
  { code: 'nl', label: 'NL' },
  { code: 'pl', label: 'PL' },
  { code: 'af', label: 'AF' },
  { code: 'fr', label: 'FR' },
];

function langToLocale(l: TargetLang) {
  switch (l) {
    case 'en':
      return 'en-US';
    case 'de':
      return 'de-DE';
    case 'ru':
      return 'ru-RU';
    case 'nl':
      return 'nl-NL';
    case 'pl':
      return 'pl-PL';
    case 'af':
      return 'af-ZA';
    case 'fr':
      return 'fr-FR';
    default:
      return 'en-US';
  }
}

// -------------------- TTS safe wrapper --------------------
const TTS = {
  available: !!(Tts as any)?.setDefaultRate, // true only if native module is linked
  init() {
    try {
      (Tts as any)?.setDefaultRate?.(0.5);
    } catch {}
    try {
      (Tts as any)?.setDucking?.(true);
    } catch {}
  },
  async speak(text: string, locale: string) {
    if (!(Tts as any)?.speak) throw new Error('TTS not available');
    try {
      await Tts.setDefaultLanguage(locale);
    } catch {}
    Tts.speak(text);
  },
  on(event: 'tts-finish' | 'tts-cancel', cb: () => void) {
    if (!(Tts as any)?.addEventListener) {
      return { remove: () => {} };
    }
    return Tts.addEventListener(event, cb);
  },
};

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [heard, setHeard] = useState('');
  const [translated, setTranslated] = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('en');
  const lastPartial = useRef('');

  // -------------------- Wiring --------------------
  useEffect(() => {
    // Initialize TTS if present (safe no-op if not)
    TTS.init();

    Voice.onSpeechStart = (_e: SpeechStartEvent) => {};
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const v = e.value?.[0];
      if (v) {
        lastPartial.current = v;
        setHeard(v);
      }
    };
    Voice.onSpeechResults = async (e: SpeechResultsEvent) => {
      const finalText = (e.value?.[0] ?? lastPartial.current)?.trim() ?? '';
      if (finalText) {
        setHeard(finalText);
        if (handsFree && TTS.available) {
          await translateAndSpeak(finalText);
        }
      }
    };
    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      if (handsFree) startListening();
    };

    // Only attach TTS listeners if TTS is available
    const fin = TTS.on('tts-finish', () => {
      setIsSpeaking(false);
      if (handsFree) startListening();
    });
    const can = TTS.on('tts-cancel', () => setIsSpeaking(false));

    return () => {
      Voice.destroy().catch(() => {});
      Voice.removeAllListeners();
      fin.remove();
      can.remove();
      try {
        Tts.stop();
      } catch {}
    };
  }, [handsFree, targetLang]);

  // -------------------- Mic permission --------------------
  const ensureMicPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    return res === PermissionsAndroid.RESULTS.GRANTED;
  };

  // -------------------- STT controls --------------------
  const startListening = async () => {
    if (isListening || isSpeaking) return;
    const ok = await ensureMicPermission();
    if (!ok) {
      Alert.alert('Permission', 'Microphone access is required.');
      return;
    }
    try {
      lastPartial.current = '';
      setHeard('');
      // Supply '' to use device locale, or e.g. 'en-US'/'de-DE'
      await Voice.start('');
      setIsListening(true);
    } catch (e: any) {
      Alert.alert('Voice error', e?.message ?? String(e));
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch {}
    setIsListening(false);
  };

  // -------------------- Translate & Speak --------------------
  const translateAndSpeak = async (text: string) => {
    const msg = (text ?? '').trim();
    if (!msg) return;

    // Stop STT so TTS output isn't re-captured
    await stopListening();

    try {
      const out = await translateText(msg, targetLang);
      setTranslated(out);

      if (!TTS.available) {
        Alert.alert(
          'Text-to-Speech not available',
          'The app will show translations, but cannot speak them until TTS is installed/linked.',
        );
        // In hands-free mode, immediately resume listening:
        if (handsFree) startListening();
        return;
      }

      setIsSpeaking(true);
      await TTS.speak(out, langToLocale(targetLang));
    } catch (e: any) {
      Alert.alert('Translate/TTS error', e?.message ?? String(e));
      setIsSpeaking(false);
      if (handsFree) startListening();
    }
  };

  // -------------------- UI --------------------
  const TTSWarning = !TTS.available ? (
    <View style={styles.warning}>
      <Text style={styles.warningText}>
        TTS module not linked yet — translations will show as text only.
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Converso — Live Translate</Text>
        {TTSWarning}

        <Text style={styles.label}>Target language</Text>
        <View style={styles.langRow}>
          {LANGS.map(l => (
            <TouchableOpacity
              key={l.code}
              style={[
                styles.langChip,
                targetLang === l.code && styles.langChipActive,
              ]}
              onPress={() => setTargetLang(l.code)}
            >
              <Text style={styles.langText}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.toggle,
            handsFree ? styles.toggleOn : styles.toggleOff,
            !TTS.available && styles.toggleDisabled,
          ]}
          disabled={!TTS.available}
          onPress={() => setHandsFree(v => !v)}
        >
          <Text style={styles.btnText}>
            {handsFree ? 'Hands-free: ON' : 'Hands-free: OFF'}
            {!TTS.available ? ' (requires TTS)' : ''}
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Heard</Text>
          <Text style={styles.cardBody}>{heard || '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Translated</Text>
          <Text style={styles.cardBody}>{translated || '—'}</Text>
        </View>

        <View style={styles.buttons}>
          {!isListening ? (
            <TouchableOpacity
              style={[styles.btn, styles.primary]}
              onPress={startListening}
              disabled={isSpeaking}
            >
              <Text style={styles.btnText}>🎤 Start listening</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.danger]}
              onPress={stopListening}
            >
              <Text style={styles.btnText}>■ Stop</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btn, styles.secondary]}
            onPress={() => translateAndSpeak(heard)}
            disabled={!heard}
          >
            <Text style={styles.btnText}>↔ Translate & Speak</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Tip: for better recognition, pass a locale to Voice.start, e.g.{' '}
          <Text style={{ fontFamily: 'monospace' }}>Voice.start('de-DE')</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b0b' },
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 14 },
  label: { color: '#cfcfcf', marginBottom: 6, fontWeight: '600' },

  warning: {
    backgroundColor: '#4a2a00',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  warningText: { color: '#ffd9a6' },

  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  langChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  langChipActive: { backgroundColor: '#375dfb' },
  langText: { color: '#fff', fontWeight: '700' },

  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  toggleOn: { backgroundColor: '#1e7a1e' },
  toggleOff: { backgroundColor: '#444' },
  toggleDisabled: { opacity: 0.5 },

  card: {
    backgroundColor: '#191919',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: { color: '#aaa', marginBottom: 6, fontWeight: '600' },
  cardBody: { color: '#fff' },

  buttons: { gap: 10, marginTop: 12 },
  btn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  primary: { backgroundColor: '#375dfb' },
  secondary: { backgroundColor: '#2e7d32' },
  danger: { backgroundColor: '#b00020' },
  btnText: { color: '#fff', fontWeight: '700' },

  note: { color: '#9e9e9e', marginTop: 16, fontSize: 12 },
});
