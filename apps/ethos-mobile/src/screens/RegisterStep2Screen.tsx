import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Check, ChevronLeft } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { colors } from '../theme/colors';
import { APPROACH_OPTIONS, SPECIALTY_OPTIONS } from '../constants/professionalOptions';

type RegistrationDraft = {
  name: string;
  email: string;
  crp: string;
  password: string;
  avatar_url?: string;
};

type ChoiceGridProps = {
  title: string;
  options: readonly string[];
  selectedValues: string[];
  allowMultiple?: boolean;
  onToggle: (value: string) => void;
  textColor: string;
  selectedBackground: string;
  selectedText: string;
  borderColor: string;
};

function ChoiceGrid({
  title,
  options,
  selectedValues,
  allowMultiple,
  onToggle,
  textColor,
  selectedBackground,
  selectedText,
  borderColor,
}: ChoiceGridProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: textColor }]}>
        {title}
        {allowMultiple ? ' (pode selecionar mais de uma)' : ''}
      </Text>
      <View style={styles.choiceGrid}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.choiceButton,
                {
                  borderColor,
                  backgroundColor: isSelected ? selectedBackground : 'transparent',
                },
              ]}
              onPress={() => onToggle(option)}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.choiceText,
                  { color: isSelected ? selectedText : textColor },
                ]}
              >
                {option}
              </Text>
              {isSelected ? <Check size={14} color={selectedText} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function RegisterStep2Screen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const { register, isSubmitting } = useAuth();

  const [specialty, setSpecialty] = useState('');
  const [specialtyOther, setSpecialtyOther] = useState('');
  const [approaches, setApproaches] = useState<string[]>([]);
  const [approachOther, setApproachOther] = useState('');
  const [acceptedEthics, setAcceptedEthics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registrationDraft: RegistrationDraft | undefined = route?.params?.registrationDraft;

  const primaryTeal = '#234e5c';
  const accentTeal = '#00f2ff';
  const inputBg = isDark ? '#1e2126' : '#fcfcfb';
  const specialtyList = specialty
    .split(' | ')
    .map((value) => value.trim())
    .filter(Boolean);
  const resolvedSpecialty = specialtyList.includes('Outros')
    ? [...specialtyList.filter((value) => value !== 'Outros'), ...specialtyOther.split(',').map((value) => value.trim()).filter(Boolean)].join(' | ')
    : specialtyList.join(' | ');
  const resolvedApproachList = approaches.includes('Outros')
    ? [...approaches.filter((value) => value !== 'Outros'), ...approachOther.split(',').map((value) => value.trim()).filter(Boolean)]
    : approaches;
  const resolvedApproach = resolvedApproachList.join(' | ');
  const isSubmitEnabled = Boolean(
    registrationDraft &&
      resolvedSpecialty &&
      resolvedApproach &&
      acceptedEthics &&
      !isSubmitting
  );

  const toggleApproach = (value: string) => {
    setApproaches((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const toggleSpecialty = (value: string) => {
    setSpecialty((current) => {
      const parsed = current
        .split(' | ')
        .map((item) => item.trim())
        .filter(Boolean);
      const next = parsed.includes(value)
        ? parsed.filter((item) => item !== value)
        : [...parsed, value];
      return next.join(' | ');
    });
  };

  const handleFinishRegistration = async () => {
    if (!registrationDraft) {
      setError('Volte para o passo anterior e preencha os dados iniciais.');
      return;
    }

    if (!resolvedSpecialty || !resolvedApproach) {
      setError('Selecione a especialidade e ao menos uma abordagem clinica.');
      return;
    }

    if (!acceptedEthics) {
      setError('Voce precisa aceitar o termo etico para concluir.');
      return;
    }

    try {
      setError(null);
      await register({
        name: registrationDraft.name,
        email: registrationDraft.email,
        password: registrationDraft.password,
        avatar_url: registrationDraft.avatar_url,
        crp: registrationDraft.crp,
        specialty: resolvedSpecialty,
        clinical_approach: resolvedApproach,
        accepted_ethics: true,
      });
    } catch (registrationError: any) {
      setError(
        registrationError?.message === 'This email is already registered'
          ? 'Este email ja esta cadastrado. Entre com ele ou recupere o acesso.'
          : registrationError?.message ?? 'Nao foi possivel concluir o cadastro agora.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : '#fcfcfb' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryTeal }]}>Cadastro</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: primaryTeal }]}>Foco clinico e etica</Text>
          <Text style={[styles.progressStep, { color: '#00ccdb' }]}>2 de 2</Text>
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View entering={FadeInRight.duration(800)} style={[styles.progressBarFill, { backgroundColor: accentTeal }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text style={[styles.title, { color: primaryTeal }]}>Atendimento clinico</Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            Escolha seu foco principal de atendimento e as abordagens que voce utiliza.
          </Text>

          <ChoiceGrid
            title="Especialidade/foco principal"
            options={SPECIALTY_OPTIONS}
            selectedValues={specialtyList}
            allowMultiple
            onToggle={toggleSpecialty}
            textColor={primaryTeal}
            selectedBackground={primaryTeal}
            selectedText="#ffffff"
            borderColor={theme.border}
          />

          {specialtyList.includes('Outros') ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: primaryTeal }]}>Outro foco clinico</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: theme.border, color: theme.foreground }]}
                value={specialtyOther}
                onChangeText={setSpecialtyOther}
                placeholder="Separe por virgula"
                placeholderTextColor={theme.mutedForeground}
              />
            </View>
          ) : null}

          <ChoiceGrid
            title="Abordagem clinica"
            options={APPROACH_OPTIONS}
            selectedValues={approaches}
            allowMultiple
            onToggle={toggleApproach}
            textColor={primaryTeal}
            selectedBackground={primaryTeal}
            selectedText="#ffffff"
            borderColor={theme.border}
          />

          {approaches.includes('Outros') ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: primaryTeal }]}>Outras abordagens</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: theme.border, color: theme.foreground }]}
                value={approachOther}
                onChangeText={setApproachOther}
                placeholder="Separe por virgula"
                placeholderTextColor={theme.mutedForeground}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.termsContainer, { backgroundColor: isDark ? 'rgba(0,242,255,0.05)' : '#f0f4f3' }]}
            onPress={() => setAcceptedEthics((current) => !current)}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: accentTeal, backgroundColor: acceptedEthics ? accentTeal : 'transparent' },
              ]}
            >
              {acceptedEthics ? <Check size={14} color="#fff" /> : null}
            </View>
            <Text style={[styles.termsText, { color: primaryTeal }]}>
              Li e concordo com o <Text style={styles.boldText}>Codigo de Etica Profissional</Text> e os{' '}
              <Text style={styles.boldText}>Termos de Uso</Text> da plataforma ETHOS.
            </Text>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: accentTeal, opacity: isSubmitEnabled ? 1 : 0.6 }]}
            onPress={handleFinishRegistration}
            disabled={!isSubmitEnabled}
          >
            <Text style={[styles.primaryButtonText, { color: '#15171a' }]}>
              {isSubmitting ? 'Criando conta...' : 'Finalizar cadastro'}
            </Text>
          </TouchableOpacity>

          <View style={styles.securityBadge}>
            <Text style={[styles.securityBadgeText, { color: theme.mutedForeground }]}>
              AMBIENTE SEGURO E CRIPTOGRAFADO
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  progressSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  progressStep: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e8eeed',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
    borderRadius: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    lineHeight: 24,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
    marginBottom: 12,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceButton: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  textInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  termsContainer: {
    flexDirection: 'row',
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    gap: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
  },
  errorBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#fee2e2',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  primaryButton: {
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00f2ff',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  securityBadge: {
    alignItems: 'center',
    marginTop: 30,
  },
  securityBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.5,
  },
});
