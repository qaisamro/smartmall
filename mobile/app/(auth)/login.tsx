import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { loginSchema } from '@/src/features/auth/authApi';
import { useGoogleLogin, useLogin } from '@/src/features/auth/useAuthHooks';
import { handleFormApiError } from '@/src/utils/errorHandling';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';
import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors }, setError } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = (data: LoginForm) => {
    setServerError(null);
    loginMutation.mutate(data, {
      onError: (error) => setServerError(handleFormApiError(error, setError, t)),
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.card }]}>
      <AuthScreenHeader />
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 22 }]}
        bottomOffset={20}
      >
        <View style={styles.guestRow}>
          <View style={styles.guestSpacer} />
          <View style={styles.brandIntro}>
            <View style={[styles.logoFrame, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
              <Image
                source={require('@/assets/images/smartmall-logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text style={[styles.brandName, { color: colors.foreground }]}>
              <Text>Smart</Text>
              <Text style={{ color: colors.primary }}>Mall</Text>
            </Text>
            <Text style={[styles.greeting, { color: colors.foreground }]}>{t('auth.login_greeting')}</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{t('auth.login_description')}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                label={t('auth.mobile_phone')}
                error={errors.phone?.message ? t(errors.phone.message) : undefined}
                colors={colors}
              >
                  <View style={[styles.phoneShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    placeholder="059 123 4567"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.phoneInput, { color: colors.foreground }]}
                    textAlign="left"
                    accessibilityLabel={t('auth.mobile_phone')}
                  />
                  <Feather name="phone" size={16} color={colors.mutedForeground} />
                </View>
              </AuthField>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                label={t('auth.password')}
                error={errors.password?.message ? t(errors.password.message) : undefined}
                colors={colors}
                trailingLabel={
                  <Link href="/(auth)/forgot-password" asChild>
                    <Pressable>
                      <Text style={[styles.forgot, { color: colors.primary }]}>{t('auth.forgot_password')}</Text>
                    </Pressable>
                  </Link>
                }
              >
                <View style={[styles.passwordShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.passwordInput, { color: colors.foreground }]}
                    textAlign="right"
                    accessibilityLabel={t('auth.password')}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.toggle_password')}
                    onPress={() => setShowPassword((current) => !current)}
                    style={styles.eyeButton}
                  >
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </AuthField>
            )}
          />

          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit(onSubmit)}
            disabled={loginMutation.isPending}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary, opacity: loginMutation.isPending ? 0.6 : pressed ? 0.82 : 1 },
            ]}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{t('auth.sign_in')}</Text>
                <Feather name="arrow-left" size={16} color={colors.primaryForeground} />
              </>
            )}
          </Pressable>

          {serverError || googleLoginMutation.error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {serverError ??
                (googleLoginMutation.error instanceof Error &&
                googleLoginMutation.error.message === 'google_native_only'
                  ? t('auth.google_native_only')
                  : googleLoginMutation.error instanceof Error &&
                      googleLoginMutation.error.message === 'google_cancelled'
                    ? t('auth.google_cancelled')
                    : t('auth.google_failed'))}
            </Text>
          ) : null}

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>{t('auth.quick_continue')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <GoogleSignInButton
            loading={googleLoginMutation.isPending}
            onPress={() => googleLoginMutation.mutate()}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{t('auth.dont_have_account')}</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.primary }]}>{t('auth.sign_up')}</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollViewCompat>
      <GuestNavigationBar />
    </View>
  );
}

function AuthField({
  label,
  trailingLabel,
  error,
  colors,
  children,
}: {
  label: string;
  trailingLabel?: React.ReactNode;
  error?: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
        {trailingLabel}
      </View>
      {children}
      {error ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 4 },
  guestRow: { alignItems: 'center' },
  guestSpacer: { height: 2 },
  brandIntro: { alignItems: 'center', marginTop: 4, marginBottom: 23 },
  logoFrame: {
    width: 70,
    height: 70,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logo: { width: 47, height: 47 },
  brandName: { fontFamily: 'Inter_800ExtraBold', fontSize: 25, letterSpacing: -0.6 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 5 },
  description: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 2, maxWidth: 245 },
  form: { gap: 1 },
  field: { marginBottom: 11 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  forgot: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  phoneShell: { minHeight: 50, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  phoneInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, paddingHorizontal: 12, minHeight: 48 },
  passwordShell: { minHeight: 50, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, paddingHorizontal: 14, minHeight: 48, letterSpacing: 2 },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 14 },
  submitButton: { minHeight: 52, borderRadius: 16, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'center', marginTop: 8 },
  fieldError: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 16, paddingBottom: 3 },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  footerLink: { fontFamily: 'Inter_700Bold', fontSize: 11, textDecorationLine: 'underline' },
});