import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Check, ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { colors } from '../theme/colors';

const SPECIALTY_OPTIONS = [
  'Psicologia Clinica',
  'Psicologia Infantil',
  'Terapia de Casal e Familia',
  'Neuropsicologia',
  'Psicologia Organizacional',
];

const APPROACH_OPTIONS = [
  'TCC',
  'Psicanalise',
  'Sistemica',
  'Humanista',
  'ACT',
];

type RegistrationDraft = {
  name: string;
  email: string;
  crp: string;
  password: string;
};

type SelectorName = 'specialty' | 'approach' | null;

type SelectorFieldProps = {
  accentTeal: string;
  backgroundColor: string;
  borderColor: string;
  inputLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  options: string[];
  placeholder: string;
  textColor: string;
  value: string;
  mutedColor: string;
};

function SelectorField({
  accentTeal,
  backgroundColor,
  borderColor,
  inputLabel,
  isOpen,
  onToggle,
  onSelect,
  options,
  placeholder,
  textColor,
  value,
  mutedColor,
}: SelectorFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: textColor }]}>{inputLabel}</Text>
      <TouchableOpacity
        style={[styles.dropdownWrapper, { backgroundColor, borderColor }]}
        onPress={onToggle}
        activeOpacity={0.9}
      >
        <Text style={[styles.dropdownText, { color: value ? textColor : mutedColor }]}>
          {value || placeholder}
        </Text>
        {isOpen ? <ChevronUp size={20} color={accentTeal} /> : <ChevronDown size={20} color={accentTeal} />}
      </TouchableOpacity>

      {isOpen ? (
        <View style={[styles.optionsContainer, { backgroundColor, borderColor }]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.optionRow}
              onPress={() => onSelect(option)}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
              {value === option ? <Check size={16} color={accentTeal} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function RegisterStep2Screen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const { register, isSubmitting } = useAuth();

  const [specialty, setSpecialty] = useState('');
  const [approach, setApproach] = useState('');
  const [acceptedEthics, setAcceptedEthics] = useState(false);
  const [openSelector, setOpenSelector] = useState<SelectorName>(null);
  const [error, setError] = useState<string | null>(null);

  const registrationDraft: RegistrationDraft | undefined = route?.params?.registrationDraft;

  const primaryTeal = '#234e5c';
  const accentTeal = '#00f2ff';
  const inputBg = isDark ? '#1e2126' : '#fcfcfb';
  const isSubmitEnabled = Boolean(registrationDraft && specialty && approach && acceptedEthics && !isSubmitting);

  const handleFinishRegistration = async () => {
    if (!registrationDraft) {
      setError('Volte para o passo anterior e preencha os dados iniciais.');
      return;
    }

    if (!specialty || !approach) {
      setError('Selecione a especialidade e a abordagem clinica.');
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
        crp: registrationDraft.crp,
        specialty,
        clinical_approach: approach,
        accepted_ethics: true,
      });
    } catch (registrationError: any) {
      setError(registrationError?.message ?? 'Nao foi possivel concluir o cadastro agora.');
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
          <Text style={[styles.progressTitle, { color: primaryTeal }]}>Especialidade e Etica</Text>
          <Text style={[styles.progressStep, { color: '#00ccdb' }]}>2 de 2</Text>
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View entering={FadeInRight.duration(800)} style={[styles.progressBarFill, { backgroundColor: accentTeal }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text style={[styles.title, { color: primaryTeal }]}>Dados Profissionais</Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            Informe sua area de atuacao e aceite os termos eticos da plataforma para concluir o cadastro clinico.
          </Text>

          <SelectorField
            accentTeal={accentTeal}
            backgroundColor={inputBg}
            borderColor={theme.border}
            inputLabel="Especialidade Principal"
            isOpen={openSelector === 'specialty'}
            onToggle={() => setOpenSelector((current) => (current === 'specialty' ? null : 'specialty'))}
            onSelect={(value) => {
              setSpecialty(value);
              setOpenSelector(null);
            }}
            options={SPECIALTY_OPTIONS}
            placeholder="Selecione sua especialidade"
            textColor={primaryTeal}
            value={specialty}
            mutedColor={theme.mutedForeground}
          />

          <SelectorField
            accentTeal={accentTeal}
            backgroundColor={inputBg}
            borderColor={theme.border}
            inputLabel="Abordagem Clinica"
            isOpen={openSelector === 'approach'}
            onToggle={() => setOpenSelector((current) => (current === 'approach' ? null : 'approach'))}
            onSelect={(value) => {
              setApproach(value);
              setOpenSelector(null);
            }}
            options={APPROACH_OPTIONS}
            placeholder="Escolha sua abordagem"
            textColor={primaryTeal}
            value={approach}
            mutedColor={theme.mutedForeground}
          />

          <TouchableOpacity
            style={[styles.termsContainer, { backgroundColor: isDark ? 'rgba(0,242,255,0.05)' : '#f0f4f3' }]}
            onPress={() => setAcceptedEthics((current) => !current)}
            activeOpacity={0.9}
          >
            <View style={[styles.checkbox, { borderColor: accentTeal, backgroundColor: acceptedEthics ? accentTeal : 'transparent' }]}>
              {acceptedEthics ? <Check size={14} color="#fff" /> : null}
            </View>
            <Text style={[styles.termsText, { color: primaryTeal }]}>
              Li e concordo com o <Text style={styles.boldText}>Codigo de Etica Profissional</Text> do Psicologo e os{' '}
              <Text style={styles.boldText}>Termos de Uso</Text> da plataforma ETHOS. Estou ciente do meu compromisso
              com o sigilo e a pratica baseada em evidencias.
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
              {isSubmitting ? 'Criando conta...' : 'Finalizar Cadastro'}
            </Text>
          </TouchableOpacity>

          <View style={styles.securityBadge}>
            <Text style={[styles.securityBadgeText, { color: theme.mutedForeground }]}>
              AMBIENTE SEGURO & CRIPTOGRAFADO
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
    marginBottom: 40,
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
  dropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'Inter',
    flex: 1,
    paddingRight: 16,
  },
  optionsContainer: {
    borderWidth: 1,
    borderRadius: 20,
    marginTop: 10,
    overflow: 'hidden',
  },
  optionRow: {
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d6dfdd',
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Inter',
    flex: 1,
    paddingRight: 16,
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
