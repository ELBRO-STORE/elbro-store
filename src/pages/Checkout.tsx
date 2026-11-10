import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ChevronRight, Check, User, MapPin, MessageSquare, Truck, Shield, CreditCard, Loader2, ShoppingBag } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Select } from '../components/ui';
import { Textarea } from '../components/ui';
import { useCart } from '../hooks/useCart';
import { createOrder } from '../services/orders';
import { archiveOrderToSheets } from '../services/googleSheets';
import { openWhatsApp } from '../services/whatsapp';
import { formatPrice, validateMoroccanPhone } from '../lib/utils';
import { useToast } from '../components/ui/Toast';

const DELIVERY_FEE_CENTS = 3500;
const FREE_DELIVERY_FROM_CENTS = 50000;
const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Agadir', 'Tanger',
  'Meknès', 'Oujda', 'Kénitra', 'Tétouan', 'Safi', 'Mohammedia',
  'Khouribga', 'El Jadida', 'Beni Mellal', 'Nador', 'Taza', 'Settat',
  'Larache', 'Ksar El Kebir', 'Guelmim', 'Berkane', 'Taourirt',
  'Ouarzazate', 'Errachidia', 'Khenifra', 'Midelt', 'Azrou', 'Ifrane'
].sort();

interface FormData {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  instructions: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
}

const initialFormData: FormData = {
  name: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  instructions: '',
  notes: '',
};

export function Checkout() {
  const navigate = useNavigate();
  const { state, subtotalCents, itemCount, clearCart } = useCart();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [orderData, setOrderData] = useState<{
    order: any;
    orderItems: any[];
    whatsappUrl: string;
  } | null>(null);

  const deliveryFeeCents = subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : DELIVERY_FEE_CENTS;
  const totalCents = subtotalCents + deliveryFeeCents;
  const isFreeDelivery = subtotalCents >= FREE_DELIVERY_FROM_CENTS;

  if (state.items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-elbro-950">
        <Container>
          <div className="text-center py-16">
            <p className="text-elbro-400 text-lg mb-4">Votre panier est vide</p>
            <Link to="/produits">
              <Button>Continuer mes achats</Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Veuillez saisir votre nom complet (minimum 3 caractères)';
    }

    const phone = validateMoroccanPhone(formData.phone);
    if (!phone) {
      newErrors.phone = 'Numéro marocain invalide (ex. 06 12 34 56 78 ou +212 6 12 34 56 78)';
    }

    if (!formData.city.trim() || formData.city.trim().length < 2) {
      newErrors.city = 'Veuillez saisir votre ville';
    }

    if (!formData.address.trim() || formData.address.trim().length < 8) {
      newErrors.address = 'Veuillez saisir une adresse de livraison complète';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Adresse email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // Create order in Supabase
      const result = await createOrder({
        customer_name: formData.name.trim(),
        customer_phone: validateMoroccanPhone(formData.phone)!,
        customer_city: formData.city.trim(),
        customer_address: formData.address.trim(),
        customer_email: formData.email.trim() || undefined,
        delivery_instructions: formData.instructions.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        items: state.items,
        delivery_fee_cents: deliveryFeeCents,
      });

      // Archive to Google Sheets (non-blocking)
      archiveOrderToSheets(result.order, result.orderItems).then((sheetsResult) => {
        if (sheetsResult.ok) {
          console.log('Order synced to Google Sheets:', sheetsResult.orderId);
        } else {
          console.warn('Google Sheets sync failed:', sheetsResult.message);
        }
      });

      setOrderData(result);
      setStep('confirmation');
      addToast({ type: 'success', title: 'Commande créée', message: 'Votre commande a été enregistrée avec succès' });
    } catch (error) {
      console.error('Order creation error:', error);
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de créer la commande. Veuillez réessayer.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (orderData) {
      openWhatsApp(orderData.order, orderData.orderItems);
    }
  };

  if (step === 'confirmation' && orderData) {
    return (
      <div className="min-h-screen bg-elbro-950 py-12">
        <Container>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="mx-auto mb-6 p-4 rounded-full bg-green-500/10 border border-green-500/20 w-16 h-16 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-elbro-100 mb-2">Merci pour votre commande !</h1>
              <p className="text-elbro-400">Votre commande a été enregistrée avec succès.</p>
            </div>

            <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-elbro-100">N° de commande</h2>
                <span className="font-mono text-lg font-bold text-elbro-100 bg-elbro-950 px-4 py-2 rounded-lg">{orderData.order.order_ref}</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-elbro-400">
                  <span>Sous-total</span>
                  <span className="text-elbro-100">{formatPrice(subtotalCents)}</span>
                </div>
                <div className="flex justify-between text-elbro-400">
                  <span>Livraison</span>
                  <span className="text-elbro-100">{isFreeDelivery ? 'Offerte' : formatPrice(deliveryFeeCents)}</span>
                </div>
                <div className="border-t border-elbro-400/10 pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totalCents)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button size="lg" className="w-full" onClick={handleWhatsAppClick}>
                <MessageSquare className="w-5 h-5 mr-2" />
                Envoyer la commande sur WhatsApp
              </Button>

              <p className="text-center text-sm text-elbro-400">
                Votre commande ne sera transmise qu\'une fois le message envoyé dans WhatsApp.
                Appuyez sur « Envoyer » dans la conversation.
              </p>

              <Button variant="outline" className="w-full" onClick={() => { clearCart(); navigate('/'); }}>
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-elbro-950">
      <header className="bg-elbro-900 border-b border-elbro-400/10 py-6">
        <Container>
          <div className="flex items-center gap-4 text-sm text-elbro-400">
            <span className="px-3 py-1 bg-elbro-100 text-elbro-950 rounded-full font-medium">1. Informations</span>
            <ChevronRight className="w-4 h-4" />
            <span className="px-3 py-1 bg-elbro-950 text-elbro-400 rounded-full">2. Paiement</span>
            <ChevronRight className="w-4 h-4" />
            <span className="px-3 py-1 bg-elbro-950 text-elbro-400 rounded-full">3. Confirmation</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-elbro-100 mt-2">Finaliser la commande</h1>
        </Container>
      </header>

      <main className="py-8 lg:py-12">
        <Container>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Contact Info */}
                <fieldset className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
                  <legend className="text-lg font-semibold text-elbro-100 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informations de contact
                  </legend>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Nom complet *"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      error={errors.name}
                      placeholder="Votre nom complet"
                      required
                      autoComplete="name"
                    />
                    <Input
                      label="Téléphone *"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      error={errors.phone}
                      placeholder="06 12 34 56 78"
                      required
                      autoComplete="tel"
                      type="tel"
                    />
                    <Input
                      label="Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                      placeholder="votre@email.com"
                      type="email"
                      autoComplete="email"
                    />
                  </div>
                </fieldset>

                {/* Delivery Address */}
                <fieldset className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
                  <legend className="text-lg font-semibold text-elbro-100 mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Adresse de livraison
                  </legend>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      label="Ville *"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      error={errors.city}
                      options={[{ value: '', label: 'Sélectionner une ville' }, ...MOROCCAN_CITIES.map(c => ({ value: c, label: c }))]}
                      required
                    />
                  </div>

                  <Textarea
                    label="Adresse complète *"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    error={errors.address}
                    placeholder="Numéro, rue, quartier, code postal..."
                    required
                    rows={3}
                  />
                </fieldset>

                {/* Delivery Instructions */}
                <fieldset className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
                  <legend className="text-lg font-semibold text-elbro-100 mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Instructions de livraison (optionnel)
                  </legend>

                  <Textarea
                    label="Instructions pour le livreur"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Ex: Appeler à l'arrivée, laisser à la réception, code d'accès..."
                    rows={3}
                  />

                  <Textarea
                    label="Notes supplémentaires"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Toute information supplémentaire pour votre commande..."
                    rows={2}
                  />
                </fieldset>

                {/* Submit */}
                <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={submitting}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Passer la commande — {formatPrice(totalCents)}
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-elbro-400 mt-4">
                    <span>
                      En validant, vous acceptez nos{' '}
                      <Link to="/cgv" className="underline hover:text-elbro-100">CGV</Link>{' '}
                      et notre{' '}
                      <Link to="/confidentialite" className="underline hover:text-elbro-100">politique de confidentialité</Link>
                    </span>
                  </div>
                </div>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-elbro-100 mb-4">Récapitulatif</h2>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {state.items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-elbro-950">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-elbro-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-elbro-100 text-sm line-clamp-1">{item.productName}</p>
                          <p className="text-xs text-elbro-400">{item.size} • {item.color}</p>
                          <p className="text-sm text-elbro-400">Qté: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-elbro-100 text-sm">{formatPrice(item.unitPriceCents * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-elbro-400/10 my-4 pt-4 space-y-3 text-sm">
                    <div className="flex justify-between text-elbro-400">
                      <span>Sous-total ({itemCount} article{itemCount > 1 ? 's' : ''})</span>
                      <span className="text-elbro-100">{formatPrice(subtotalCents)}</span>
                    </div>

                    {!isFreeDelivery && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-elbro-400">
                          <span>Livraison</span>
                          <span className="text-elbro-100">{formatPrice(DELIVERY_FEE_CENTS)}</span>
                        </div>
                        <div className="h-2 bg-elbro-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-elbro-100 transition-all duration-500"
                            style={{ width: `${(subtotalCents / FREE_DELIVERY_FROM_CENTS) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-elbro-400 text-center">
                          Ajoutez {formatPrice(Math.max(0, FREE_DELIVERY_FROM_CENTS - subtotalCents))} pour la livraison gratuite
                        </p>
                      </div>
                    )}

                    {isFreeDelivery && (
                      <div className="flex justify-between text-green-400">
                        <span className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Livraison
                        </span>
                        <span className="font-medium">Offerte</span>
                      </div>
                    )}

                    <div className="border-t border-elbro-400/10 pt-3 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(totalCents)}</span>
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-elbro-900 border border-elbro-400/10 text-center">
                    <Truck className="w-6 h-6 text-elbro-400 mx-auto mb-2" />
                    <p className="text-xs text-elbro-400">Livraison offerte dès 500 MAD</p>
                  </div>
                  <div className="p-4 rounded-xl bg-elbro-900 border border-elbro-400/10 text-center">
                    <Shield className="w-6 h-6 text-elbro-400 mx-auto mb-2" />
                    <p className="text-xs text-elbro-400">Paiement sécurisé</p>
                  </div>
                  <div className="p-4 rounded-xl bg-elbro-900 border border-elbro-400/10 text-center">
                    <Truck className="w-6 h-6 text-elbro-400 mx-auto mb-2" />
                    <p className="text-xs text-elbro-400">Retours 30 jours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}