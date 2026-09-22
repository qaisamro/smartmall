import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { registerSchema } from '@/src/features/auth/authApi';
import { useGoogleLogin, useRegister } from '@/src/features/auth/useAuthHooks';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';
import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';
import { handleFormApiError } from '@/src/utils/errorHandling';
import { environment } from '@/src/config/environment';

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const googleLoginMutation = useGoogleLogin();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<RegisterForm | null>(null);
  const [smsCode, setSmsCode] = useState('');

  const { control, handleSubmit, watch, setError, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', password: '', password_confirmation: '' },
  });
  const passwordValue = watch('password');
  const strengthLevel = !passwordValue ? 3 : passwordValue.length >= 8 ? 3 : passwordValue.length >= 4 ? 2 : 1;

  const onSubmit = (data: RegisterForm) => {
    setSmsError(null);
    if (!termsAccepted) {
      setSmsError(t('auth.terms_required'));
      return;
    }
    if (environment.environment === 'development') {
      setPendingRegistration(data);
      setSmsCode('');
      return;
    }
    setSmsError(t('auth.sms_registration_unavailable'));
  };

  const verifySmsAndRegister = () => {
    if (!pendingRegistration) return;
    setSmsError(null);
    if (smsCode !== '000000') {
      setSmsError(t('auth.sms_invalid_code'));
      return;
    }
    registerMutation.mutate(pendingRegistration, {
      onSuccess: () => router.replace('/(customer)/(tabs)'),
      onError: (error) => setSmsError(handleFormApiError(error, setError, t)),
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.card }]}>
      <AuthScreenHeader showBack />
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        bottomOffset={20}
      >
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('auth.sign_up')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t('auth.register_subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <RegisterField
                label={t('auth.name')}
                error={errors.name?.message ? t(errors.name.message) : undefined}
                colors={colors}
              >
                <View style={[styles.inputShell, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="user" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="مثال: محمد عبد الله"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground }]}
                    textAlign="right"
                    accessibilityLabel={t('auth.name')}
                  />
                </View>
              </RegisterField>
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <RegisterField
                label={t('auth.phone')}
                error={errors.phone?.message ? t(errors.phone.message) : undefined}
                colors={colors}
              >
                <View style={[styles.phoneShell, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    placeholder="501234567"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.phoneInput, { color: colors.foreground }]}
                    textAlign="left"
                    accessibilityLabel={t('auth.phone')}
                  />
                  <Feather name="phone" size={16} color={colors.mutedForeground} />
                </View>
              </RegisterField>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <RegisterField
                label={t('auth.password')}
                error={errors.password?.message ? t(errors.password.message) : undefined}
                colors={colors}
              >
                <PasswordField
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  visible={showPassword}
                  onToggle={() => setShowPassword((current) => !current)}
                  colors={colors}
                  label={t('auth.password')}
                />
                <View style={styles.strengthRow}>
                  {[0, 1, 2, 3].map((segment) => (
                    <View
                      key={segment}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: segment < strengthLevel ? colors.success : colors.border },
                      ]}
                    />
                  ))}
                  <Text style={[styles.strengthText, { color: colors.success }]}>{t('auth.password_strength_good')}</Text>
                </View>
              </RegisterField>
            )}
          />

          <Controller
            control={control}
            name="password_confirmation"
            render={({ field: { onChange, onBlur, value } }) => (
              <RegisterField
                label={t('auth.password_confirmation')}
                error={errors.password_confirmation?.message ? t(errors.password_confirmation.message) : undefined}
                colors={colors}
              >
                <PasswordField
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  visible={showConfirmation}
                  onToggle={() => setShowConfirmation((current) => !current)}
                  colors={colors}
                  label={t('auth.password_confirmation')}
                  icon="check-circle"
                />
              </RegisterField>
            )}
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
            onPress={() => setTermsAccepted((current) => !current)}
            style={styles.termsRow}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: termsAccepted ? colors.primary : colors.card,
                  borderColor: termsAccepted ? colors.primary : colors.border,
                },
              ]}
            >
              {termsAccepted ? <Feather name="check" size={12} color={colors.primaryForeground} /> : null}
            </View>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              {t('auth.terms_agreement')}{' '}
              <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' }}>
                {t('auth.terms_of_use')}
              </Text>{' '}
              <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' }}>
                {t('auth.privacy_policy')}
              </Text>
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{t('auth.register_with_sms')}</Text>
            <Feather name="arrow-left" size={16} color={colors.primaryForeground} />
          </Pressable>

          {smsError || googleLoginMutation.error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {smsError ??
                (googleLoginMutation.error instanceof Error &&
                googleLoginMutation.error.message === 'google_native_only'
                  ? t('auth.google_native_only')
                  : googleLoginMutation.error instanceof Error &&
                      googleLoginMutation.error.message === 'google_cancelled'
                    ? t('auth.google_cancelled')
                    : t('auth.google_failed'))}
            </Text>
          ) : null}

          {pendingRegistration ? (
            <View style={[styles.smsVerification, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
              <Text style={[styles.smsVerificationTitle, { color: colors.foreground }]}>{t('auth.sms_verification_title')}</Text>
              <Text style={[styles.smsVerificationHint, { color: colors.mutedForeground }]}>{t('auth.sms_verification_hint')}</Text>
              <TextInput
                value={smsCode}
                onChangeText={setSmsCode}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.smsInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                accessibilityLabel={t('auth.sms_code')}
              />
              <Pressable
                accessibilityRole="button"
                onPress={verifySmsAndRegister}
                disabled={registerMutation.isPending}
                style={[styles.smsConfirmButton, { backgroundColor: colors.primary, opacity: registerMutation.isPending ? 0.6 : 1 }]}
              >
                {registerMutation.isPending ? (
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{t('common.loading')}</Text>
                ) : (
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{t('auth.confirm_sms')}</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPendingRegistration(null);
                  setSmsCode('');
                  setSmsError(null);
                }}
                style={styles.smsBackButton}
              >
                <Text style={[styles.smsBackText, { color: colors.primary }]}>{t('auth.sms_edit_details')}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>{t('auth.quick_register')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <GoogleSignInButton
            loading={googleLoginMutation.isPending}
            onPress={() => googleLoginMutation.mutate()}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{t('auth.have_account')}</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.primary }]}>{t('auth.sign_in')}</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollViewCompat>
      <GuestNavigationBar />
    </View>
  );
}

function RegisterField({
  label,
  error,
  colors,
  children,
}: {
  label: string;
  error?: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {children}
      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

function PasswordField({
  value,
  onChangeText,
  onBlur,
  visible,
  onToggle,
  colors,
  label,
  icon = 'lock',
}: {
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  visible: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  label: string;
  icon?: 'lock' | 'check-circle';
}) {
  return (
    <View style={[styles.passwordShell, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={!visible}
        placeholder="••••••••"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, styles.passwordInput, { color: colors.foreground }]}
        textAlign="right"
        accessibilityLabel={label}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onToggle} style={styles.eyeButton}>
        <Feather name={visible ? 'eye-off' : 'eye'} size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8 },
  heading: { marginBottom: 17, alignItems: 'flex-start' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 4, textAlign: 'right' },
  form: { gap: 1 },
  field: { marginBottom: 9 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 12, marginBottom: 5 },
  inputShell: { minHeight: 43, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  input: { flex: 1, minHeight: 41, paddingHorizontal: 2, fontFamily: 'Inter_400Regular', fontSize: 12 },
  phoneShell: { minHeight: 43, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  phoneInput: { flex: 1, minHeight: 41, paddingHorizontal: 10, fontFamily: 'Inter_400Regular', fontSize: 12 },
  passwordShell: { minHeight: 43, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  passwordInput: { letterSpacing: 2 },
  eyeButton: { padding: 5 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, paddingHorizontal: 2 },
  strengthSegment: { height: 4, flex: 1, borderRadius: 2 },
  strengthText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginLeft: 3 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  termsText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, textAlign: 'right' },
  submitButton: { minHeight: 49, borderRadius: 12, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 4, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 13 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 13, paddingBottom: 2 },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  footerLink: { fontFamily: 'Inter_700Bold', fontSize: 11, textDecorationLine: 'underline' },
  smsVerification: { marginTop: 12, borderWidth: 1, borderRadius: 15, padding: 12, gap: 8 },
  smsVerificationTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, textAlign: 'center' },
  smsVerificationHint: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  smsInput: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 4, textAlign: 'center' },
  smsConfirmButton: { minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  smsBackButton: { minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  smsBackText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textDecorationLine: 'underline' },
});