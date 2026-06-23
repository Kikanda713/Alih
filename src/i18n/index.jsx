import { createContext, useContext, useState, useCallback, useMemo } from 'react'

/*
 * Lightweight i18n for Tindisa — no external dependency.
 * Languages: French (default), Lingala (ln), Swahili (sw).
 *
 * NOTE: The Lingala (ln) and Swahili (sw) translations below are PROVISIONAL
 * and MUST be reviewed and corrected by native speakers before production.
 * Only the KEY visible strings are translated; secondary blocks (pricing, etc.)
 * intentionally stay in French and are not part of this dictionary.
 */

const STORAGE_KEY = 'tindisa_lang'
const DEFAULT_LANG = 'fr'
export const LANGS = ['fr', 'ln', 'sw']

const dict = {
  fr: {
    // Nav
    'nav.home': 'Accueil',
    'nav.how': 'Comment ça marche',
    'nav.trust': 'Confiance',
    'nav.pricing': 'Tarifs',
    'nav.contact': 'Contact',

    // Hero
    'hero.badge': "L'intelligence au service des proximités africaines",
    'hero.title.highlight': 'Achetez, vendez',
    'hero.title.rest': 'depuis votre messagerie.',
    'hero.subtitle':
      "Tindisa vous aide à trouver, vendre ou négocier ce dont vous avez besoin par une simple conversation. Aussi facile que d'envoyer un message.",

    // Platform CTAs
    'cta.whatsapp': 'Discuter sur WhatsApp',
    'cta.telegram': 'Discuter sur Telegram',

    // How it works
    'how.title': 'Comment ça marche',
    'how.subtitle': 'Discutez, négociez, payez en sécurité et faites-vous livrer — tout dans votre messagerie.',

    // Trust
    'trust.title': 'Pourquoi faire confiance à Tindisa ?',
    'trust.card1.title': 'Payer en sécurité',
    'trust.card1.text': "Votre argent est protégé : le vendeur n'est payé qu'après votre confirmation.",
    'trust.card2.title': 'Vendeurs vérifiés',
    'trust.card2.text': 'Chaque vendeur est vérifié. Vous discutez seulement avec des personnes de confiance.',
    'trust.card3.title': 'Assistant honnête',
    'trust.card3.text': "L'assistant négocie pour vous avec des prix clairs, sans piège ni surprise.",

    // Final CTA
    'finalcta.title': 'Commencer une conversation',
    'finalcta.subtitle':
      'Rejoignez les milliers de personnes qui achètent et vendent simplement depuis leur messagerie.',

    // Footer
    'footer.text': '© 2026 Tindisa — Acheter et vendre par message.',

    // Merchant panel
    'merchant.title': 'Mon espace commerçant',
    'merchant.subtitle': 'Reliez votre compte Wanzo et publiez votre catalogue sur Tindisa.',
    'merchant.loading': 'Chargement…',
    'merchant.status.linked': 'Compte relié',
    'merchant.status.notLinked': 'Aucun compte relié',
    'merchant.status.company': 'Entreprise',
    'merchant.status.verified': 'Vérifié',
    'merchant.status.notVerified': 'En attente de vérification',
    'merchant.connect.title': 'Connecter mon compte Wanzo',
    'merchant.connect.placeholder': 'ID de votre entreprise Wanzo',
    'merchant.connect.button': 'Connecter',
    'merchant.connect.empty': "Veuillez saisir l'ID de votre entreprise.",
    'merchant.connect.success': 'Compte relié avec succès.',
    'merchant.sync.title': 'Publier / synchroniser mon catalogue',
    'merchant.sync.button': 'Publier mon catalogue',
    'merchant.sync.success': 'Catalogue synchronisé : {count} produit(s).',
    'merchant.sync.notActive': "Votre abonnement n'est pas actif. Activez l'offre Premium pour publier votre catalogue.",
    'merchant.sync.sourceUnavailable': "Votre catalogue Wanzo est indisponible pour le moment. Réessayez plus tard.",
    'merchant.sync.unknown': "Synchronisation impossible pour le moment.",
    'merchant.error': "Une erreur est survenue. Réessayez.",

    // Profil / dropdown
    'profile.dashboard': 'Tableau de bord',
    'profile.logout': 'Se déconnecter',
    'profile.login': 'Se connecter',

    // Mode démo (à retirer en production)
    'demo.login': 'Essayer en démo',
    'demo.exit': 'Quitter la démo',
    'demo.banner': 'Mode démonstration — données fictives, aucune connexion réelle.',

    // Dashboard — navigation & layout
    'dash.nav.home': 'Accueil',
    'dash.nav.catalogue': 'Catalogue',
    'dash.nav.sales': 'Ventes',
    'dash.nav.wallet': 'Wallet',
    'dash.nav.channels': 'Canaux',
    'dash.backToSite': 'Retour au site',
    'dash.toggleSidebar': 'Réduire / développer le menu',
    'dash.loginRequired': 'Connectez-vous pour accéder à votre tableau de bord.',

    // Canaux
    'channels.title': 'Mes canaux',
    'channels.subtitle': "L'essentiel se passe dans la messagerie. Ouvrez vos canaux en un clic.",
    'channels.whatsapp': 'Ouvrir ma session WhatsApp',
    'channels.telegram': 'Ouvrir ma session Telegram',
    'channels.facebook': 'Voir ma page (gérée par Tindisa)',

    // Dashboard — Home
    'dash.home.hello': 'Bonjour {name} 👋',
    'dash.home.subtitle': 'Voici un aperçu de votre activité commerçante sur Tindisa.',
    'dash.home.products': 'Produits',
    'dash.home.inStock': 'En stock',
    'dash.home.wanzo': 'Compte Wanzo',
    'dash.home.wanzoLinked': 'Relié',
    'dash.home.wanzoNotLinked': 'Non relié',
    'dash.home.manageCatalogue': 'Gérer mon catalogue',
    'dash.home.quickAdd': 'Ajouter un produit',

    // Dashboard — Catalogue
    'cat.title': 'Mon catalogue',
    'cat.subtitle': 'Gérez vos produits, prix et stocks. Vos prix planchers restent privés.',
    'cat.tab.local': 'Mes produits',
    'cat.tab.wanzo': 'Catalogue Wanzo',
    'cat.add': 'Ajouter un produit',
    'cat.empty.title': 'Aucun produit pour le moment',
    'cat.empty.text': 'Ajoutez votre premier produit pour commencer à vendre via Tindisa.',
    'cat.col.product': 'Produit',
    'cat.col.category': 'Catégorie',
    'cat.col.price': 'Prix affiché',
    'cat.col.floor': 'Prix plancher',
    'cat.col.stock': 'Stock',
    'cat.col.actions': 'Actions',
    'cat.edit': 'Modifier',
    'cat.delete': 'Supprimer',
    'cat.deleteConfirm': 'Supprimer « {name} » ? Cette action est définitive.',
    'cat.loading': 'Chargement du catalogue…',

    // Produit — formulaire
    'form.create.title': 'Nouveau produit',
    'form.edit.title': 'Modifier le produit',
    'form.name': 'Nom du produit',
    'form.sku': 'Référence (SKU)',
    'form.skuHint': 'Optionnel — générée automatiquement si vide',
    'form.category': 'Catégorie',
    'form.description': 'Description',
    'form.displayPrice': 'Prix affiché (CDF)',
    'form.minPrice': 'Prix plancher (CDF)',
    'form.minPriceHint': "Jamais vendu en dessous. Jamais révélé à l'acheteur.",
    'form.quantity': 'Quantité en stock',
    'form.cancel': 'Annuler',
    'form.save': 'Enregistrer',
    'form.saving': 'Enregistrement…',
    'form.nameRequired': 'Le nom est obligatoire.',

    // Catalogue Wanzo (lecture seule)
    'cat.wanzo.readonly': 'Lecture seule — ces produits sont gérés dans Wanzo. Synchronisez pour mettre à jour.',
    'cat.wanzo.notLinked': "Vous n'avez pas encore relié de compte Wanzo.",
    'cat.wanzo.empty': 'Aucun produit Wanzo synchronisé. Cliquez sur « Publier mon catalogue ».',

    // Image produit (Cloudinary)
    'form.imageUpload': 'Ajouter une photo',
    'form.imageUploading': 'Téléversement…',
    'form.imageRemove': "Retirer l'image",
    'form.imageNoConfig': "L'upload d'images n'est pas configuré (Cloudinary).",
    'form.invalidNumber': 'Les montants doivent être des nombres positifs.',
    'form.floorTooHigh': 'Le prix plancher ne peut pas dépasser le prix affiché.',

    // Boutique
    'shop.rename': 'Renommer ma boutique',
    'shop.name': 'Nom de la boutique',

    // Toasts
    'toast.created': 'Produit ajouté.',
    'toast.updated': 'Produit mis à jour.',
    'toast.deleted': 'Produit supprimé.',
    'toast.shopRenamed': 'Boutique renommée.',

    // Ventes / négociations reçues
    'sales.title': 'Mes ventes',
    'sales.subtitle': 'Les offres et négociations reçues sur vos produits.',
    'sales.empty.title': 'Aucune offre pour le moment',
    'sales.empty.text': 'Les offres des acheteurs apparaîtront ici.',
    'sales.col.date': 'Date',
    'sales.col.product': 'Produit',
    'sales.col.offer': 'Offre',
    'sales.col.counter': 'Contre-offre',
    'sales.col.status': 'Statut',
    'sales.col.delivery': 'Livraison',
    'sales.status.PENDING': 'En attente',
    'sales.status.NEGOTIATING': 'En négociation',
    'sales.status.ACCEPTED': 'Acceptée',
    'sales.status.REJECTED': 'Refusée',
    'sales.status.EXPIRED': 'Expirée',
    'sales.delivery.BOOKED': 'En cours',
    'sales.delivery.CONFIRMED': 'Livrée',
    'sales.delivery.CANCELLED': 'Annulée',

    // Wallet
    'wallet.title': 'Mon wallet',
    'wallet.subtitle': 'Votre solde et vos mouvements. Les fonds sont versés après livraison confirmée.',
    'wallet.balance': 'Solde disponible',
    'wallet.history': 'Derniers mouvements',
    'wallet.credit': 'Versement',
    'wallet.debit': 'Retrait / frais',
    'wallet.col.label': 'Libellé',
    'wallet.col.date': 'Date',
    'wallet.col.amount': 'Montant',
    'wallet.empty.title': 'Aucun mouvement',
    'wallet.empty.text': 'Vos versements apparaîtront ici après vos premières ventes livrées.',
  },

  // PROVISIONAL — to be reviewed by a native Lingala speaker.
  ln: {
    'nav.home': 'Ndako',
    'nav.how': 'Ndenge esalemaka',
    'nav.trust': 'Bondimi',
    'nav.pricing': 'Talo',
    'nav.contact': 'Kcontact',

    'hero.badge': 'Mayele mpo na mombongo ya pene na Afrika',
    'hero.title.highlight': 'Somba, teka',
    'hero.title.rest': 'na nzela ya messages na yo.',
    'hero.subtitle':
      'Tindisa esalisaka yo koluka, koteka to kobongisa talo ya oyo olingi na lisolo ya pɛtɛɛ. Pɛtɛɛ lokola kotinda message.',

    'cta.whatsapp': 'Solola na WhatsApp',
    'cta.telegram': 'Solola na Telegram',

    'how.title': 'Ndenge esalemaka',
    'how.subtitle': 'Solola, bongisa talo, futa na bokengi mpe zwa biloko — nyonso na messages na yo.',

    'trust.title': 'Mpo na nini kotia motema na Tindisa ?',
    'trust.card1.title': 'Futa na bokengi',
    'trust.card1.text': 'Mbongo na yo ebatelami : moteki azwaka mbongo kaka soki ondimi.',
    'trust.card2.title': 'Bateki ba-vérifiés',
    'trust.card2.text': 'Moteki nyonso atalami. Osololaka kaka na bato ya bondimi.',
    'trust.card3.title': 'Mosalisi ya sembo',
    'trust.card3.text': 'Mosalisi abongisaka talo mpo na yo na talo ya polele, mteki te.',

    'finalcta.title': 'Banda lisolo',
    'finalcta.subtitle': 'Sangana na bato ebele oyo basombaka mpe batekaka pɛtɛɛ na messages na bango.',

    'footer.text': '© 2026 Tindisa — Somba mpe teka na message.',

    'merchant.title': 'Esika na ngai ya mombongo',
    'merchant.subtitle': 'Kangisa compte Wanzo na yo mpe tia catalogue na yo na Tindisa.',
    'merchant.loading': 'Ezali kofungwama…',
    'merchant.status.linked': 'Compte ekangami',
    'merchant.status.notLinked': 'Compte moko te ekangami',
    'merchant.status.company': 'Société',
    'merchant.status.verified': 'Eyebani',
    'merchant.status.notVerified': 'Ezali kozela vérification',
    'merchant.connect.title': 'Kangisa compte Wanzo na ngai',
    'merchant.connect.placeholder': 'ID ya société Wanzo na yo',
    'merchant.connect.button': 'Kangisa',
    'merchant.connect.empty': 'Tia ID ya société na yo.',
    'merchant.connect.success': 'Compte ekangami malamu.',
    'merchant.sync.title': 'Tia / bongola catalogue na ngai',
    'merchant.sync.button': 'Tia catalogue na ngai',
    'merchant.sync.success': 'Catalogue ebongolami : biloko {count}.',
    'merchant.sync.notActive': 'Abonnement na yo ezali active te. Fungola offre Premium mpo na kotia catalogue na yo.',
    'merchant.sync.sourceUnavailable': 'Catalogue Wanzo na yo ezali disponible te sik’oyo. Meka lisusu.',
    'merchant.sync.unknown': 'Synchronisation ezali kosalema te sik’oyo.',
    'merchant.error': 'Likambo esalemi. Meka lisusu.',
  },

  // PROVISIONAL — to be reviewed by a native Swahili speaker.
  sw: {
    'nav.home': 'Mwanzo',
    'nav.how': 'Jinsi inavyofanya kazi',
    'nav.trust': 'Uaminifu',
    'nav.pricing': 'Bei',
    'nav.contact': 'Mawasiliano',

    'hero.badge': 'Akili kwa biashara za karibu Afrika',
    'hero.title.highlight': 'Nunua, uza',
    'hero.title.rest': 'kupitia ujumbe wako.',
    'hero.subtitle':
      'Tindisa inakusaidia kutafuta, kuuza au kupatana bei ya unachohitaji kwa mazungumzo rahisi. Rahisi kama kutuma ujumbe.',

    'cta.whatsapp': 'Ongea kwenye WhatsApp',
    'cta.telegram': 'Ongea kwenye Telegram',

    'how.title': 'Jinsi inavyofanya kazi',
    'how.subtitle': 'Ongea, patana bei, lipa kwa usalama na upate kuletewa — yote kupitia ujumbe wako.',

    'trust.title': 'Kwa nini umwamini Tindisa ?',
    'trust.card1.title': 'Lipa kwa usalama',
    'trust.card1.text': 'Pesa zako zinalindwa : muuzaji hulipwa tu baada ya wewe kuthibitisha.',
    'trust.card2.title': 'Wauzaji waliothibitishwa',
    'trust.card2.text': 'Kila muuzaji huthibitishwa. Unaongea tu na watu wa kuaminika.',
    'trust.card3.title': 'Msaidizi mwaminifu',
    'trust.card3.text': 'Msaidizi hupatana bei kwa niaba yako kwa bei wazi, bila hila wala mshangao.',

    'finalcta.title': 'Anza mazungumzo',
    'finalcta.subtitle': 'Jiunge na maelfu ya watu wanaonunua na kuuza kwa urahisi kupitia ujumbe wao.',

    'footer.text': '© 2026 Tindisa — Nunua na uuze kwa ujumbe.',

    'merchant.title': 'Sehemu yangu ya mfanyabiashara',
    'merchant.subtitle': 'Unganisha akaunti yako ya Wanzo na uchapishe katalogi yako kwenye Tindisa.',
    'merchant.loading': 'Inapakia…',
    'merchant.status.linked': 'Akaunti imeunganishwa',
    'merchant.status.notLinked': 'Hakuna akaunti iliyounganishwa',
    'merchant.status.company': 'Kampuni',
    'merchant.status.verified': 'Imethibitishwa',
    'merchant.status.notVerified': 'Inasubiri uthibitisho',
    'merchant.connect.title': 'Unganisha akaunti yangu ya Wanzo',
    'merchant.connect.placeholder': 'Kitambulisho cha kampuni yako ya Wanzo',
    'merchant.connect.button': 'Unganisha',
    'merchant.connect.empty': 'Tafadhali weka kitambulisho cha kampuni yako.',
    'merchant.connect.success': 'Akaunti imeunganishwa kwa mafanikio.',
    'merchant.sync.title': 'Chapisha / sawazisha katalogi yangu',
    'merchant.sync.button': 'Chapisha katalogi yangu',
    'merchant.sync.success': 'Katalogi imesawazishwa : bidhaa {count}.',
    'merchant.sync.notActive': 'Usajili wako haujaamilishwa. Washa kifurushi cha Premium ili kuchapisha katalogi yako.',
    'merchant.sync.sourceUnavailable': 'Katalogi yako ya Wanzo haipatikani kwa sasa. Jaribu tena baadaye.',
    'merchant.sync.unknown': 'Usawazishaji hauwezekani kwa sasa.',
    'merchant.error': 'Hitilafu imetokea. Jaribu tena.',
  },
}

const LanguageContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, t: (k) => k })

function readInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LANGS.includes(saved)) return saved
  } catch {
    /* ignore (e.g. SSR / privacy mode) */
  }
  return DEFAULT_LANG
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key, vars) => {
      const table = dict[lang] || dict[DEFAULT_LANG]
      let str = table[key] ?? dict[DEFAULT_LANG][key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, v)
        }
      }
      return str
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useT() {
  return useContext(LanguageContext)
}

const LANG_LABELS = { fr: 'FR', ln: 'LN', sw: 'SW' }

export function LanguageSwitcher() {
  const { lang, setLang } = useT()
  return (
    <div className="lang-switcher" role="group" aria-label="Langue">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-btn${lang === code ? ' active' : ''}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {LANG_LABELS[code]}
        </button>
      ))}
    </div>
  )
}
