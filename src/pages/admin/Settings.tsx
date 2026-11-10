import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Textarea } from '../../components/ui';
import { Badge } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { formatPrice } from '../../lib/utils';

interface StoreSettings {
  store_name: string;
  store_description: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  currency: string;
  delivery_fee_cents: number;
  free_delivery_from_cents: number;
  whatsapp_number: string;
  whatsapp_message_template: string;
  google_sheets_webhook_url: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'ELBRO STORE',
  store_description: 'Votre boutique de mode premium au Maroc',
  store_email: 'contact@elbro-store.ma',
  store_phone: '+212 6 00 00 00 00',
  store_address: 'Casablanca, Maroc',
  currency: 'MAD',
  delivery_fee_cents: 3500,
  free_delivery_from_cents: 50000,
  whatsapp_number: '+212600000000',
  whatsapp_message_template: 'Bonjour, je souhaite commander :\n\n{order_ref}\n{items}\n\nTotal: {total}\n\nLivraison: {address}',
  google_sheets_webhook_url: '',
  meta_title: 'ELBRO STORE - Mode Premium au Maroc',
  meta_description: 'Découvrez nos collections de vêtements et accessoires premium. Livraison partout au Maroc.',
  meta_keywords: 'mode, vêtements, accessoires, Maroc, boutique en ligne, ELBRO',
};

export function AdminSettings() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'delivery' | 'whatsapp' | 'integrations' | 'seo'>('general');
  const [testWhatsApp, setTestWhatsApp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // In a real app, fetch from Supabase or a settings table
      // For now, load from localStorage
      const stored = localStorage.getItem('elbro_store_settings');
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('elbro_store_settings', JSON.stringify(settings));
      addToast({ type: 'success', title: 'Enregistré', message: 'Les paramètres ont été sauvegardés avec succès' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de sauvegarder les paramètres' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setTestWhatsApp(true);
    setTestResult(null);
    try {
      // Test if webhook URL is valid
      if (!settings.google_sheets_webhook_url.trim()) {
        setTestResult({ success: false, message: 'URL du webhook Google Sheets non configurée' });
        return;
      }

      // Test webhook with a test order
      const testOrder = {
        order_ref: 'TEST-' + Date.now(),
        customer_name: 'Test Client',
        customer_phone: '+212600000000',
        customer_city: 'Casablanca',
        customer_address: 'Adresse de test',
        total_cents: 50000,
        items: [{ product_name: 'Produit Test', quantity: 1, unit_price_cents: 50000 }],
      };

      const response = await fetch(settings.google_sheets_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', order: testOrder }),
      });

      if (response.ok) {
        setTestResult({ success: true, message: 'Webhook Google Sheets fonctionnel !' });
      } else {
        setTestResult({ success: false, message: `Erreur webhook: ${response.status} ${response.statusText}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}` });
    } finally {
      setTestWhatsApp(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: null },
    { id: 'delivery', label: 'Livraison', icon: null },
    { id: 'whatsapp', label: 'WhatsApp', icon: null },
    { id: 'integrations', label: 'Intégrations', icon: null },
    { id: 'seo', label: 'SEO', icon: null },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-elbro-100">Paramètres de la boutique</h1>
          <p className="text-elbro-400 mt-1">Configurez votre boutique ELBRO STORE</p>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          <Save className="w-5 h-5 mr-2" />
          Enregistrer les modifications
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
        <nav className="flex border-b border-elbro-400/10" aria-label="Settings tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-elbro-100 text-elbro-100 bg-elbro-950'
                  : 'border-transparent text-elbro-400 hover:text-elbro-100 hover:bg-elbro-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-lg font-semibold text-elbro-100">Informations générales</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Nom de la boutique *"
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  required
                />
                <Input
                  label="Email de contact *"
                  value={settings.store_email}
                  onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                  type="email"
                  required
                />
                <Input
                  label="Téléphone *"
                  value={settings.store_phone}
                  onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                  type="tel"
                  required
                />
                <Input
                  label="Devise"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                />
              </div>
              <Textarea
                label="Description de la boutique"
                value={settings.store_description}
                onChange={(e) => setSettings({ ...settings, store_description: e.target.value })}
                placeholder="Description affichée dans le footer et les méta descriptions..."
                rows={3}
              />
              <Textarea
                label="Adresse physique"
                value={settings.store_address}
                onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                placeholder="Adresse complète de la boutique..."
                rows={2}
              />
            </div>
          )}

          {/* Delivery Tab */}
          {activeTab === 'delivery' && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-lg font-semibold text-elbro-100">Configuration de la livraison</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Frais de livraison (MAD) *"
                  value={settings.delivery_fee_cents / 100}
                  onChange={(e) => setSettings({ ...settings, delivery_fee_cents: parseFloat(e.target.value) * 100 || 0 })}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
                <Input
                  label="Livraison gratuite à partir de (MAD) *"
                  value={settings.free_delivery_from_cents / 100}
                  onChange={(e) => setSettings({ ...settings, free_delivery_from_cents: parseFloat(e.target.value) * 100 || 0 })}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="bg-elbro-950 border border-elbro-400/10 rounded-xl p-4">
                <h3 className="font-medium text-elbro-100 mb-3">Aperçu</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-elbro-400">Frais de livraison</p>
                    <p className="font-semibold text-elbro-100">{formatPrice(settings.delivery_fee_cents)}</p>
                  </div>
                  <div>
                    <p className="text-elbro-400">Gratuite dès</p>
                    <p className="font-semibold text-elbro-100">{formatPrice(settings.free_delivery_from_cents)}</p>
                  </div>
                  <div>
                    <p className="text-elbro-400">Exemple panier 300 MAD</p>
                    <p className="font-semibold text-elbro-100">{formatPrice(30000 + settings.delivery_fee_cents)}</p>
                  </div>
                  <div>
                    <p className="text-elbro-400">Exemple panier 600 MAD</p>
                    <p className="font-semibold text-green-400">{formatPrice(60000)} <span className="font-normal text-xs">(gratuite)</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Tab */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-lg font-semibold text-elbro-100">Configuration WhatsApp</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Numéro WhatsApp (format international) *"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  placeholder="+212600000000"
                  required
                />
              </div>
              <Textarea
                label="Modèle de message WhatsApp"
                value={settings.whatsapp_message_template}
                onChange={(e) => setSettings({ ...settings, whatsapp_message_template: e.target.value })}
                placeholder="Variables disponibles: {order_ref}, {items}, {total}, {address}, {customer_name}, {customer_phone}"
                rows={6}
              />
              <div className="bg-elbro-950 border border-elbro-400/10 rounded-xl p-4">
                <h3 className="font-medium text-elbro-100 mb-2">Variables disponibles</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <code className="bg-elbro-900 px-2 py-1 rounded text-elbro-100">{'{' + 'order_ref' + '}'}</code>
                  <code className="bg-elbro-900 px-2 py-1 rounded text-elbro-100">{'{' + 'items' + '}'}</code>
                  <code className="bg-elbro-900 px-2 py-1 rounded text-elbro-100">{'{' + 'total' + '}'}</code>
                  <code className="bg-elbro-900 px-2 py-1 rounded text-elbro-100">{'{' + 'address' + '}'}</code>
                  <code className="bg-elbro-900 px-2 py-1 rounded text-elbro-100">{'{' + 'customer_name' + '}'}</code>
                  <code className="bg-elbro-900 px-2 py-1 rounded text-elbro-100">{'{' + 'customer_phone' + '}'}</code>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-lg font-semibold text-elbro-100">Intégrations externes</h2>

              <div className="bg-elbro-950 border border-elbro-400/10 rounded-xl p-6">
                <h3 className="font-semibold text-elbro-100 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Google Sheets (Archivage des commandes)
                </h3>
                <p className="text-elbro-400 mb-4">
                  Configurez un Google Apps Script déployé en tant qu'application web pour recevoir les nouvelles commandes.
                  Le script doit accepter des requêtes POST avec les données de commande.
                </p>
                <Input
                  label="URL du Webhook Google Apps Script"
                  value={settings.google_sheets_webhook_url}
                  onChange={(e) => setSettings({ ...settings, google_sheets_webhook_url: e.target.value })}
                  placeholder="https://script.google.com/macros/s/XXXXXX/exec"
                />
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={handleTestWhatsApp} loading={testWhatsApp} disabled={testWhatsApp}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tester le webhook
                  </Button>
                  {testResult && (
                    <Badge variant={testResult.success ? 'success' : 'error'} className="self-center">
                      {testResult.success ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {testResult.message}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          {testResult.message}
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-elbro-950 border border-elbro-400/10 rounded-xl p-6">
                <h3 className="font-semibold text-elbro-100 mb-4">Supabase Configuration</h3>
                <p className="text-elbro-400 mb-4">
                  Les clés Supabase sont configurées via les variables d'environnement. Voir <code className="text-elbro-100">.env.example</code>.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Supabase URL"
                    value={import.meta.env.VITE_SUPABASE_URL || ''}
                    readOnly
                  />
                  <Input
                    label="Supabase Anon Key"
                    value={import.meta.env.VITE_SUPABASE_ANON_KEY ? '••••••••' : ''}
                    readOnly
                    type="password"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-lg font-semibold text-elbro-100">Référencement (SEO)</h2>
              <Input
                label="Meta Title"
                value={settings.meta_title}
                onChange={(e) => setSettings({ ...settings, meta_title: e.target.value })}
                placeholder="Titre de la page d'accueil (max 60 caractères)"
                maxLength={60}
              />
              <Textarea
                label="Meta Description"
                value={settings.meta_description}
                onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
                placeholder="Description pour les moteurs de recherche (max 160 caractères)"
                rows={3}
                maxLength={160}
              />
              <Input
                label="Meta Keywords"
                value={settings.meta_keywords}
                onChange={(e) => setSettings({ ...settings, meta_keywords: e.target.value })}
                placeholder="Mots-clés séparés par des virgules"
              />
              <div className="bg-elbro-950 border border-elbro-400/10 rounded-xl p-4">
                <h3 className="font-medium text-elbro-100 mb-2">Aperçu Google</h3>
                <div className="font-medium text-blue-400 text-sm">{settings.meta_title}</div>
                <div className="text-green-400 text-sm">elbro-store.ma/</div>
                <div className="text-gray-400 text-sm mt-1 line-clamp-2">{settings.meta_description}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Reminder */}
      <div className="bg-elbro-900 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span className="text-elbro-100">N'oubliez pas d'enregistrer vos modifications</span>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          <Save className="w-5 h-5 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}