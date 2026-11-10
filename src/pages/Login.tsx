import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { validateMoroccanPhone } from '../lib/utils';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, login, loginWithGoogle } = useAuth();
  const { addToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const from = (location.state as any)?.from?.pathname || '/';

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (isLogin) {
      if (!formData.password) {
        newErrors.password = 'Le mot de passe est requis';
      }
    } else {
      if (!formData.name.trim() || formData.name.trim().length < 3) {
        newErrors.name = 'Le nom doit contenir au moins 3 caractères';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Le téléphone est requis';
      } else if (!validateMoroccanPhone(formData.phone)) {
        newErrors.phone = 'Numéro marocain invalide (ex: 06 12 34 56 78)';
      }
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        addToast({ type: 'success', title: 'Connexion réussie', message: 'Bienvenue !' });
        navigate(from, { replace: true });
      } else {
        await signUp(formData.email, formData.password, formData.name.trim(), validateMoroccanPhone(formData.phone) || undefined);
        addToast({ type: 'success', title: 'Inscription réussie', message: 'Votre compte a été créé' });
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      const message = error.message || 'Une erreur est survenue';
      if (message.includes('Invalid login credentials')) {
        setErrors({ email: 'Email ou mot de passe incorrect' });
      } else if (message.includes('User already registered')) {
        setErrors({ email: 'Cet email est déjà utilisé' });
      } else {
        addToast({ type: 'error', title: 'Erreur', message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erreur', message: error.message || 'Échec de la connexion Google' });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({ email: '', password: '', name: '', phone: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-screen bg-elbro-950 flex items-center justify-center py-12 px-4">
      <Container>
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-elbro-100">
              <span className="text-elbro-100">ELBRO</span>
              <span className="text-elbro-400">STORE</span>
            </Link>
            <p className="text-elbro-400 mt-2">
              {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-8">
            {/* Tabs */}
            <div className="flex mb-6 border-b border-elbro-400/10">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                  isLogin
                    ? 'border-elbro-100 text-elbro-100'
                    : 'border-transparent text-elbro-400 hover:text-elbro-100'
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                  !isLogin
                    ? 'border-elbro-100 text-elbro-100'
                    : 'border-transparent text-elbro-400 hover:text-elbro-100'
                }`}
              >
                Inscription
              </button>
            </div>

            {/* Google Login */}
            <Button
              variant="outline"
              className="w-full mb-6"
              onClick={handleGoogleLogin}
              loading={loading}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-elbro-400/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-elbro-900 text-elbro-400">Ou continuer avec email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {!isLogin && (
                <>
                  <Input
                    label="Nom complet *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
                    placeholder="Votre nom complet"
                    required
                    autoComplete="name"
                    icon={<User className="w-5 h-5" />}
                  />
                  <Input
                    label="Téléphone *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    error={errors.phone}
                    placeholder="06 12 34 56 78"
                    required
                    type="tel"
                    autoComplete="tel"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                  />
                </>
              )}

              <Input
                label="Email *"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                placeholder="votre@email.com"
                required
                type="email"
                autoComplete={isLogin ? 'email' : 'email'}
                icon={<Mail className="w-5 h-5" />}
              />

              <Input
                label="Mot de passe *"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                placeholder="••••••••"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                icon={<Lock className="w-5 h-5" />}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-elbro-400 hover:text-elbro-100"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />

              {!isLogin && (
                <Input
                  label="Confirmer le mot de passe *"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  error={errors.confirmPassword}
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  icon={<Lock className="w-5 h-5" />}
                  iconRight={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-elbro-400 hover:text-elbro-100"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                    />
                    <span className="text-sm text-elbro-400">Se souvenir de moi</span>
                  </label>
                  <Link to="/mot-de-passe-oublie" className="text-sm text-elbro-400 hover:text-elbro-100">
                    Mot de passe oublié ?
                  </Link>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isLogin ? 'Connexion...' : 'Inscription...'}
                  </>
                ) : (
                  isLogin ? 'Se connecter' : 'Créer mon compte'
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-elbro-400 mt-6">
            {isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
            <button
              onClick={toggleMode}
              className="ml-2 text-elbro-100 font-medium hover:underline"
            >
              {isLogin ? 'S\'inscrire' : 'Se connecter'}
            </button>
          </p>

          <div className="text-center text-xs text-elbro-400/50 mt-4 max-w-xs mx-auto">
            <span>
              En continuant, vous acceptez nos{' '}
              <Link to="/cgv" className="underline hover:text-elbro-100">CGV</Link>{' '}
              et notre{' '}
              <Link to="/confidentialite" className="underline hover:text-elbro-100">politique de confidentialité</Link>
            </span>
          </div>
        </div>
      </Container>
    </div>
  );
}