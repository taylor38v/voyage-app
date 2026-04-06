import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import {
  MapPin, Calendar, Compass, CheckSquare, Wallet, ChevronRight, ChevronDown, ChevronUp,
  Star, Clock, Utensils, Camera, Bus, Hotel, AlertTriangle, Check, X, Heart,
  Sun, Sunset, Moon, Coffee, ShoppingBag, Plane, Globe, ArrowRight, Menu,
  Home, Map, List, DollarSign, ChevronLeft, Sparkles, Navigation, Info, Zap,
  Shield, Wifi, Thermometer, Eye, Download, Share2, Bell, TrendingDown, TrendingUp,
  CircleDollarSign
} from "lucide-react";

// ============================================
// DATA
// ============================================
const TRIP_DATA = {
  title: "Thaïlande Explorer",
  subtitle: "12 jours d'aventure tropicale",
  dates: "15 - 26 Mars 2025",
  coverEmoji: "🌴",
  totalBudget: 1850,
  currency: "€",
  travelers: 2,
  days: [
    {
      day: 1, date: "15 Mars", city: "Bangkok", emoji: "🏙️",
      color: "#FF6B6B",
      coords: { lat: 13.7563, lng: 100.5018 },
      activities: [
        { time: "10:00", title: "Arrivée Suvarnabhumi", icon: "plane", duration: "2h", cost: 0, type: "transport", note: "Grab vers hôtel ~350 THB" },
        { time: "12:00", title: "Check-in Khaosan Palace", icon: "hotel", duration: "1h", cost: 35, type: "hotel", note: "Piscine rooftop, petit-déj inclus" },
        { time: "14:00", title: "Wat Pho — Bouddha couché", icon: "camera", duration: "2h", cost: 5, type: "activity", note: "Y aller avant 15h pour éviter la foule" },
        { time: "17:00", title: "Wat Arun au coucher du soleil", icon: "camera", duration: "1h30", cost: 3, type: "activity", note: "Le meilleur moment pour les photos 🌅" },
        { time: "19:00", title: "Street food Yaowarat (Chinatown)", icon: "food", duration: "2h", cost: 8, type: "food", note: "Goûter le pad thai de Thip Samai — file d'attente mais ça vaut le coup" },
      ],
      tips: ["Le BTS Skytrain est le moyen le plus rapide pour se déplacer", "Toujours négocier les tuk-tuks AVANT de monter"],
      budgetDay: { hotel: 35, food: 22, transport: 12, activities: 8, other: 5 }
    },
    {
      day: 2, date: "16 Mars", city: "Bangkok", emoji: "🛕",
      color: "#FF8E53",
      coords: { lat: 13.7516, lng: 100.4927 },
      activities: [
        { time: "08:00", title: "Grand Palace & Wat Phra Kaew", icon: "camera", duration: "3h", cost: 15, type: "activity", note: "Dress code strict : épaules et genoux couverts" },
        { time: "12:00", title: "Déjeuner Tha Maharaj", icon: "food", duration: "1h", cost: 10, type: "food", note: "Food court avec vue sur le fleuve" },
        { time: "14:00", title: "Jim Thompson House", icon: "camera", duration: "2h", cost: 5, type: "activity", note: "Architecture thai traditionnelle magnifique" },
        { time: "17:00", title: "Chatuchak Weekend Market", icon: "shopping", duration: "3h", cost: 25, type: "activity", note: "15 000 stands — concentrez-vous sur les sections 2-4" },
        { time: "20:30", title: "Rooftop bar Vertigo", icon: "food", duration: "2h", cost: 20, type: "food", note: "Vue 360° sur Bangkok, arrivez pour le sunset" },
      ],
      tips: ["Le Grand Palace ferme à 15h30, arrivez à l'ouverture", "Chatuchak : téléchargez la carte avant, c'est un labyrinthe"],
      budgetDay: { hotel: 35, food: 35, transport: 8, activities: 45, other: 10 }
    },
    {
      day: 3, date: "17 Mars", city: "Ayutthaya", emoji: "🏛️",
      color: "#FECA57",
      coords: { lat: 14.3692, lng: 100.5877 },
      activities: [
        { time: "07:00", title: "Train vers Ayutthaya", icon: "transport", duration: "2h", cost: 1, type: "transport", note: "Billet 3ème classe = 20 THB, l'aventure locale !" },
        { time: "09:30", title: "Location vélo", icon: "transport", duration: "30min", cost: 2, type: "transport", note: "50 THB/jour à la gare" },
        { time: "10:00", title: "Wat Mahathat (tête dans l'arbre)", icon: "camera", duration: "1h30", cost: 3, type: "activity", note: "LA photo iconique — mettez-vous plus bas que la tête de Bouddha" },
        { time: "12:00", title: "Roti Sai Mai (street food)", icon: "food", duration: "45min", cost: 3, type: "food", note: "Spécialité locale : crêpe aux fils de sucre" },
        { time: "13:30", title: "Wat Chaiwatthanaram", icon: "camera", duration: "1h30", cost: 3, type: "activity", note: "Le plus photogénique, style Angkor Wat" },
        { time: "16:00", title: "Retour Bangkok en minivan", icon: "transport", duration: "1h30", cost: 3, type: "transport", note: "Plus rapide que le train pour le retour" },
      ],
      tips: ["Crème solaire obligatoire — aucune ombre dans les ruines", "Apportez 2L d'eau minimum"],
      budgetDay: { hotel: 35, food: 15, transport: 6, activities: 6, other: 3 }
    },
    {
      day: 4, date: "18 Mars", city: "Chiang Mai", emoji: "🌿",
      color: "#48DBFB",
      coords: { lat: 18.7883, lng: 98.9853 },
      activities: [
        { time: "06:00", title: "Vol Bangkok → Chiang Mai", icon: "plane", duration: "1h15", cost: 40, type: "transport", note: "AirAsia, réservé 3 semaines avant = pas cher" },
        { time: "09:00", title: "Check-in Old City", icon: "hotel", duration: "1h", cost: 22, type: "hotel", note: "Guest house avec jardin tropical" },
        { time: "11:00", title: "Wat Chedi Luang", icon: "camera", duration: "1h", cost: 1, type: "activity", note: "Monk chat tous les jours à 17h (gratuit)" },
        { time: "13:00", title: "Khao Soi Khun Yai", icon: "food", duration: "1h", cost: 3, type: "food", note: "Le MEILLEUR khao soi de Chiang Mai, pas de débat 🍜" },
        { time: "15:00", title: "Cours de cuisine thai", icon: "activity", duration: "4h", cost: 28, type: "activity", note: "Inclut visite du marché + 5 plats à cuisiner" },
        { time: "20:00", title: "Night Bazaar", icon: "shopping", duration: "2h", cost: 15, type: "activity", note: "Négociez toujours 40% en dessous du prix initial" },
      ],
      tips: ["Chiang Mai est la capitale foodie de la Thaïlande — mangez partout", "Louez un scooter pour 200 THB/jour"],
      budgetDay: { hotel: 22, food: 20, transport: 42, activities: 44, other: 8 }
    },
    {
      day: 5, date: "19 Mars", city: "Chiang Mai", emoji: "🐘",
      color: "#0ABDE3",
      coords: { lat: 18.8425, lng: 98.8855 },
      activities: [
        { time: "07:00", title: "Doi Suthep au lever du soleil", icon: "camera", duration: "3h", cost: 2, type: "activity", note: "309 marches — vue incroyable sur la ville" },
        { time: "11:00", title: "Elephant Nature Park", icon: "activity", duration: "5h", cost: 65, type: "activity", note: "Sanctuaire éthique — aucune balade à dos d'éléphant 🐘" },
        { time: "17:00", title: "Massage thai au temple", icon: "activity", duration: "1h", cost: 8, type: "activity", note: "200 THB pour 1h — les massages de temple sont les meilleurs" },
        { time: "19:00", title: "Dîner Huen Phen", icon: "food", duration: "1h30", cost: 8, type: "food", note: "Cuisine du nord traditionnelle, ambiance magique" },
      ],
      tips: ["Elephant Nature Park : réservez 1 semaine à l'avance minimum", "Évitez TOUT sanctuaire qui propose des balades sur les éléphants"],
      budgetDay: { hotel: 22, food: 18, transport: 5, activities: 75, other: 5 }
    },
    {
      day: 6, date: "20 Mars", city: "Koh Phangan", emoji: "🏝️",
      color: "#00D2D3",
      coords: { lat: 9.7319, lng: 100.0136 },
      activities: [
        { time: "07:00", title: "Vol Chiang Mai → Surat Thani", icon: "plane", duration: "1h30", cost: 45, type: "transport", note: "Puis ferry combiné vers Koh Phangan" },
        { time: "13:00", title: "Ferry vers Koh Phangan", icon: "transport", duration: "2h30", cost: 12, type: "transport", note: "Lomprayah catamaran — le plus fiable" },
        { time: "16:00", title: "Check-in Haad Salad", icon: "hotel", duration: "1h", cost: 30, type: "hotel", note: "Bungalow sur la plage, hamac inclus 🌴" },
        { time: "17:30", title: "Sunset à Zen Beach", icon: "camera", duration: "2h", cost: 8, type: "food", note: "Cocktails les pieds dans le sable" },
      ],
      tips: ["Lomprayah > Seatran pour la ponctualité", "Koh Phangan hors Full Moon Party = paradis tranquille"],
      budgetDay: { hotel: 30, food: 18, transport: 57, activities: 0, other: 8 }
    },
    {
      day: 7, date: "21 Mars", city: "Koh Phangan", emoji: "🤿",
      color: "#10AC84",
      coords: { lat: 9.7579, lng: 100.0607 },
      activities: [
        { time: "08:00", title: "Snorkeling Sail Rock", icon: "activity", duration: "4h", cost: 35, type: "activity", note: "Le meilleur spot de plongée du Golfe — requins baleines possible!" },
        { time: "13:00", title: "Déjeuner Fisherman's Village", icon: "food", duration: "1h", cost: 8, type: "food", note: "Poisson grillé ultra frais" },
        { time: "15:00", title: "Cascade Phaeng", icon: "camera", duration: "2h", cost: 1, type: "activity", note: "Baignade dans la piscine naturelle, quasi personne" },
        { time: "18:00", title: "Yoga sunset à la plage", icon: "activity", duration: "1h30", cost: 8, type: "activity", note: "Sessions drop-in partout sur l'île" },
        { time: "20:00", title: "BBQ seafood sur la plage", icon: "food", duration: "2h", cost: 12, type: "food", note: "Choisissez votre poisson au marché et faites-le griller" },
      ],
      tips: ["Louez un scooter pour explorer l'île (250 THB/jour)", "Emportez des chaussures d'eau pour les cascades"],
      budgetDay: { hotel: 30, food: 25, transport: 5, activities: 44, other: 5 }
    },
    {
      day: 8, date: "22 Mars", city: "Koh Tao", emoji: "🐢",
      color: "#2ED573",
      coords: { lat: 10.0956, lng: 99.8405 },
      activities: [
        { time: "08:00", title: "Speed boat vers Koh Tao", icon: "transport", duration: "1h", cost: 10, type: "transport", note: "Départ depuis Thong Sala" },
        { time: "10:00", title: "Check-in Sairee Beach", icon: "hotel", duration: "30min", cost: 28, type: "hotel", note: "Vue mer, à 30 secondes de la plage" },
        { time: "11:00", title: "Plongée découverte (2 dives)", icon: "activity", duration: "4h", cost: 55, type: "activity", note: "Koh Tao = l'endroit le moins cher au monde pour plonger" },
        { time: "16:00", title: "Viewpoint John Suwan", icon: "camera", duration: "1h30", cost: 1, type: "activity", note: "20 min de marche, vue panoramique insane" },
        { time: "18:30", title: "Dîner The Gallery", icon: "food", duration: "2h", cost: 12, type: "food", note: "Meilleur rapport qualité-prix de l'île" },
      ],
      tips: ["Si vous voulez passer l'Open Water, comptez 3 jours et ~280€", "Sairee Beach = côté bars, Chalok Bay = plus calme"],
      budgetDay: { hotel: 28, food: 22, transport: 10, activities: 56, other: 5 }
    },
    {
      day: 9, date: "23 Mars", city: "Koh Tao", emoji: "🌊",
      color: "#26DE81",
      coords: { lat: 10.1014, lng: 99.8226 },
      activities: [
        { time: "07:00", title: "Kayak baie de Tanote", icon: "activity", duration: "3h", cost: 8, type: "activity", note: "Location kayak 200 THB, tortues marines fréquentes" },
        { time: "11:00", title: "Snorkeling Japanese Gardens", icon: "activity", duration: "2h", cost: 0, type: "activity", note: "Gratuit depuis la plage — apportez votre masque" },
        { time: "14:00", title: "Cooking class thaïe", icon: "food", duration: "3h", cost: 22, type: "food", note: "Cuisinez votre propre green curry" },
        { time: "18:00", title: "Sunset bar Mango Viewpoint", icon: "food", duration: "2h", cost: 10, type: "food", note: "LE spot sunset de Koh Tao, arrivez à 17h30" },
      ],
      tips: ["Allez aux Japanese Gardens tôt le matin = eau cristalline", "Dernier jour d'île, profitez du calme avant le retour"],
      budgetDay: { hotel: 28, food: 35, transport: 3, activities: 8, other: 5 }
    },
    {
      day: 10, date: "24 Mars", city: "Krabi", emoji: "⛰️",
      color: "#A55EEA",
      coords: { lat: 8.0863, lng: 98.9063 },
      activities: [
        { time: "06:00", title: "Ferry + vol vers Krabi", icon: "transport", duration: "5h", cost: 55, type: "transport", note: "Via Surat Thani, combo ferry+vol le plus simple" },
        { time: "13:00", title: "Check-in Ao Nang", icon: "hotel", duration: "1h", cost: 32, type: "hotel", note: "Hôtel avec piscine, 5 min de la plage à pied" },
        { time: "15:00", title: "Railay Beach en longtail", icon: "camera", duration: "3h", cost: 5, type: "activity", note: "La plus belle plage de Thaïlande — eau turquoise, falaises" },
        { time: "19:00", title: "Dîner Last Fisherman Bar", icon: "food", duration: "2h", cost: 10, type: "food", note: "Bar sur les rochers, vue sur les îles" },
      ],
      tips: ["Railay est accessible UNIQUEMENT par bateau — pas de route", "Les longtails se partagent à 4 pour diviser le coût"],
      budgetDay: { hotel: 32, food: 20, transport: 58, activities: 5, other: 5 }
    },
    {
      day: 11, date: "25 Mars", city: "Krabi", emoji: "🚣",
      color: "#8854D0",
      coords: { lat: 7.9810, lng: 98.7676 },
      activities: [
        { time: "07:00", title: "4 Islands Tour (longtail privé)", icon: "activity", duration: "7h", cost: 30, type: "activity", note: "Koh Poda, Chicken Island, Tup Island, Phra Nang Cave" },
        { time: "12:00", title: "Pique-nique sur Koh Poda", icon: "food", duration: "1h", cost: 5, type: "food", note: "Inclus dans le tour, poisson grillé sur la plage" },
        { time: "15:00", title: "Escalade à Railay", icon: "activity", duration: "2h", cost: 25, type: "activity", note: "Pour débutants, les falaises calcaires sont mythiques" },
        { time: "18:00", title: "Phra Nang Cave Beach sunset", icon: "camera", duration: "1h30", cost: 0, type: "activity", note: "Plage cachée entre les falaises — magique" },
        { time: "20:00", title: "Dernier dîner — seafood BBQ", icon: "food", duration: "2h", cost: 15, type: "food", note: "Choisissez homard ou crevettes géantes au marché" },
      ],
      tips: ["Le 4 Islands Tour en longtail privé (1500 THB) > speed boat touristique", "Phra Nang Beach : allez-y à marée basse pour la grotte"],
      budgetDay: { hotel: 32, food: 25, transport: 5, activities: 55, other: 8 }
    },
    {
      day: 12, date: "26 Mars", city: "Bangkok → Retour", emoji: "✈️",
      color: "#FC5C65",
      coords: { lat: 13.6900, lng: 100.7501 },
      activities: [
        { time: "08:00", title: "Vol Krabi → Bangkok", icon: "plane", duration: "1h20", cost: 35, type: "transport", note: "Dernier vol pour maximiser le temps sur place" },
        { time: "11:00", title: "Terminal 21 — shopping dernière minute", icon: "shopping", duration: "2h", cost: 20, type: "activity", note: "Food court au 5ème = meilleur rapport qualité-prix de BKK" },
        { time: "14:00", title: "Massage de fin de trip", icon: "activity", duration: "2h", cost: 12, type: "activity", note: "Health Land Spa — le massage thaï ultime" },
        { time: "17:00", title: "Direction aéroport ✈️", icon: "transport", duration: "1h", cost: 5, type: "transport", note: "Airport Rail Link depuis Phaya Thai" },
      ],
      tips: ["Terminal 21 : chaque étage = un pays différent, le food court est au top", "Gardez 700 THB pour la taxe de départ si pas incluse"],
      budgetDay: { hotel: 0, food: 15, transport: 40, activities: 32, other: 10 }
    }
  ]
};

const CHECKLIST_DATA = [
  { category: "📄 Documents", items: [
    { id: "c1", text: "Passeport valide 6 mois après retour", critical: true },
    { id: "c2", text: "Copies numériques passeport (Google Drive)", critical: true },
    { id: "c3", text: "Assurance voyage (SafetyWing ou Chapka)", critical: true },
    { id: "c4", text: "Billets d'avion imprimés + numériques", critical: false },
    { id: "c5", text: "Réservations hôtels confirmées", critical: false },
  ]},
  { category: "💊 Santé", items: [
    { id: "c6", text: "Trousse de secours (anti-diarrhée, doliprane)", critical: true },
    { id: "c7", text: "Crème solaire SPF50+", critical: false },
    { id: "c8", text: "Anti-moustiques tropical (DEET 50%)", critical: false },
    { id: "c9", text: "Vaccins à jour (Hépatite A/B recommandé)", critical: true },
  ]},
  { category: "📱 Tech", items: [
    { id: "c10", text: "eSIM ou SIM locale (AIS/TrueMove)", critical: false },
    { id: "c11", text: "Batterie externe 20 000 mAh", critical: false },
    { id: "c12", text: "Adaptateur prise (type A/B/C)", critical: false },
    { id: "c13", text: "App Grab installée (= Uber local)", critical: false },
    { id: "c14", text: "Maps hors-ligne téléchargées", critical: true },
  ]},
  { category: "👕 Vêtements", items: [
    { id: "c15", text: "Vêtements couvrant épaules/genoux (temples)", critical: true },
    { id: "c16", text: "Chaussures d'eau (cascades, plages rocheuses)", critical: false },
    { id: "c17", text: "K-way léger (averses tropicales)", critical: false },
    { id: "c18", text: "Maillots de bain x2 minimum", critical: false },
  ]},
  { category: "💰 Argent", items: [
    { id: "c19", text: "Carte Wise ou Revolut (0% frais de change)", critical: true },
    { id: "c20", text: "Cash euros à changer sur place (Super Rich)", critical: false },
    { id: "c21", text: "Budget jour estimé : 50-80€/pers", critical: false },
  ]},
];

// ============================================
// COMPONENTS
// ============================================
const iconMap = {
  plane: Plane, hotel: Hotel, camera: Camera, food: Utensils,
  transport: Bus, activity: Compass, shopping: ShoppingBag
};

const categoryColors = {
  hotel: "#8854D0", food: "#FF6B6B", transport: "#48DBFB", activities: "#FECA57", other: "#A0A0A0"
};
const categoryLabels = {
  hotel: "Hébergement", food: "Nourriture", transport: "Transport", activities: "Activités", other: "Divers"
};
const categoryEmojis = {
  hotel: "🏨", food: "🍜", transport: "🚌", activities: "🎯", other: "📦"
};

// ============================================
// MAIN APP
// ============================================
export default function TravelPlannerApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [selectedDay, setSelectedDay] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [showBudgetAlert, setShowBudgetAlert] = useState(null);
  const [animateIn, setAnimateIn] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [mapHoveredDay, setMapHoveredDay] = useState(null);

  useEffect(() => {
    setAnimateIn(true);
    const t = setTimeout(() => setAnimateIn(false), 600);
    return () => clearTimeout(t);
  }, [activeTab]);

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalChecked = Object.values(checkedItems).filter(Boolean).length;
  const totalItems = CHECKLIST_DATA.reduce((a, c) => a + c.items.length, 0);

  // Budget calculations
  const budgetByDay = TRIP_DATA.days.map(d => {
    const total = Object.values(d.budgetDay).reduce((a, b) => a + b, 0);
    return { ...d.budgetDay, total, day: `J${d.day}`, city: d.city, emoji: d.emoji };
  });
  const cumulativeBudget = budgetByDay.reduce((acc, d, i) => {
    const prev = i > 0 ? acc[i - 1].cumulative : 0;
    acc.push({ ...d, cumulative: prev + d.total, remaining: TRIP_DATA.totalBudget - (prev + d.total) });
    return acc;
  }, []);
  const totalSpent = cumulativeBudget[cumulativeBudget.length - 1]?.cumulative || 0;
  const categoryTotals = {};
  budgetByDay.forEach(d => {
    Object.entries(d).forEach(([k, v]) => {
      if (categoryColors[k]) categoryTotals[k] = (categoryTotals[k] || 0) + v;
    });
  });

  const tabs = [
    { id: "home", icon: Home, label: "Accueil" },
    { id: "map", icon: Map, label: "Carte" },
    { id: "itinerary", icon: Calendar, label: "Jours" },
    { id: "budget", icon: Wallet, label: "Budget" },
    { id: "checklist", icon: CheckSquare, label: "Check" },
  ];

  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", minHeight: "100vh",
      background: "linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)",
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      position: "relative", overflow: "hidden", color: "#fff"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Pacifico&display=swap" rel="stylesheet" />

      {/* Ambient bg elements */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,107,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 100, left: -80, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(72,219,251,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "40%", right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(254,202,87,0.05) 0%, transparent 70%)" }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, paddingBottom: 90 }}>
        {activeTab === "home" && <HomeScreen trip={TRIP_DATA} onStartDay={(d) => { setSelectedDay(d); setActiveTab("itinerary"); }} cumulativeBudget={cumulativeBudget} totalChecked={totalChecked} totalItems={totalItems} />}
        {activeTab === "map" && <MapScreen trip={TRIP_DATA} hoveredDay={mapHoveredDay} setHoveredDay={setMapHoveredDay} onSelectDay={(d) => { setSelectedDay(d); setActiveTab("itinerary"); }} />}
        {activeTab === "itinerary" && <ItineraryScreen trip={TRIP_DATA} selectedDay={selectedDay} setSelectedDay={setSelectedDay} expandedActivity={expandedActivity} setExpandedActivity={setExpandedActivity} />}
        {activeTab === "budget" && <BudgetScreen trip={TRIP_DATA} cumulativeBudget={cumulativeBudget} budgetByDay={budgetByDay} categoryTotals={categoryTotals} totalSpent={totalSpent} showAlert={showBudgetAlert} setShowAlert={setShowBudgetAlert} />}
        {activeTab === "checklist" && <ChecklistScreen data={CHECKLIST_DATA} checked={checkedItems} toggle={toggleCheck} totalChecked={totalChecked} totalItems={totalItems} />}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: "rgba(10,22,40,0.95)", backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "8px 0 12px", zIndex: 100
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== "itinerary") setSelectedDay(null); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "4px 12px", borderRadius: 12,
                transition: "all 0.3s ease"
              }}>
              <div style={{
                padding: "6px 16px", borderRadius: 20,
                background: isActive ? "linear-gradient(135deg, #FF6B6B, #FECA57)" : "transparent",
                transition: "all 0.3s ease"
              }}>
                <Icon size={20} color={isActive ? "#0a1628" : "rgba(255,255,255,0.4)"} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 800 : 600,
                color: isActive ? "#fff" : "rgba(255,255,255,0.35)",
                transition: "all 0.3s ease"
              }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// HOME SCREEN
// ============================================
function HomeScreen({ trip, onStartDay, cumulativeBudget, totalChecked, totalItems }) {
  const nextDay = trip.days[0];
  const remaining = trip.totalBudget - (cumulativeBudget[cumulativeBudget.length - 1]?.cumulative || 0);
  const budgetPercent = Math.round(((cumulativeBudget[cumulativeBudget.length - 1]?.cumulative || 0) / trip.totalBudget) * 100);

  return (
    <div style={{ padding: "0 20px" }}>
      {/* Hero */}
      <div style={{
        padding: "50px 0 30px", textAlign: "center",
        background: "linear-gradient(180deg, rgba(255,107,107,0.12) 0%, transparent 100%)",
        margin: "0 -20px", paddingLeft: 20, paddingRight: 20,
        borderRadius: "0 0 40px 40px"
      }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🌴</div>
        <h1 style={{
          fontFamily: "'Pacifico', cursive", fontSize: 32, color: "#fff",
          marginBottom: 4, fontWeight: 400, letterSpacing: 0.5
        }}>{trip.title}</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>{trip.subtitle}</p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.08)", borderRadius: 20,
          padding: "8px 18px", marginTop: 16
        }}>
          <Calendar size={14} color="#FECA57" />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{trip.dates}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 24 }}>
        {[
          { emoji: "📅", value: `${trip.days.length}`, label: "Jours", color: "#48DBFB" },
          { emoji: "🏙️", value: `${[...new Set(trip.days.map(d => d.city))].length}`, label: "Villes", color: "#FF6B6B" },
          { emoji: "✅", value: `${totalChecked}/${totalItems}`, label: "Checklist", color: "#2ED573" },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.05)", borderRadius: 16,
            padding: "16px 8px", textAlign: "center",
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Budget Mini Widget */}
      <div style={{
        background: "linear-gradient(135deg, rgba(254,202,87,0.12) 0%, rgba(255,107,107,0.08) 100%)",
        borderRadius: 20, padding: 20, marginTop: 20,
        border: "1px solid rgba(254,202,87,0.15)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={18} color="#FECA57" />
            <span style={{ fontWeight: 800, fontSize: 14 }}>Budget Trip</span>
          </div>
          <span style={{ fontSize: 13, color: "#2ED573", fontWeight: 700 }}>{remaining}€ restants</span>
        </div>
        <div style={{ height: 8, background: "rgba(0,0,0,0.3)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{
            width: `${budgetPercent}%`, height: "100%",
            background: budgetPercent > 85 ? "linear-gradient(90deg, #FECA57, #FF6B6B)" : "linear-gradient(90deg, #2ED573, #48DBFB)",
            borderRadius: 10, transition: "width 1s ease"
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{cumulativeBudget[cumulativeBudget.length - 1]?.cumulative || 0}€ estimé</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{trip.totalBudget}€ total</span>
        </div>
      </div>

      {/* Day Cards Scroll */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} color="#FECA57" /> Votre aventure
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {trip.days.map((day, i) => (
            <button key={i} onClick={() => onStartDay(day.day)}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer", transition: "all 0.2s ease", width: "100%", textAlign: "left",
                borderLeft: `3px solid ${day.color}`
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateX(4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "translateX(0)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `linear-gradient(135deg, ${day.color}22, ${day.color}44)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0
              }}>{day.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Jour {day.day} — {day.city}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{day.date} · {day.activities.length} activités</div>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAP SCREEN
// ============================================
function MapScreen({ trip, hoveredDay, setHoveredDay, onSelectDay }) {
  const cities = [];
  const seen = new Set();
  trip.days.forEach(d => {
    if (!seen.has(d.city)) {
      seen.add(d.city);
      cities.push({ city: d.city, coords: d.coords, emoji: d.emoji, color: d.color, days: trip.days.filter(dd => dd.city === d.city) });
    }
  });

  // Simple visual map representation
  const mapBounds = {
    minLat: Math.min(...cities.map(c => c.coords.lat)) - 1,
    maxLat: Math.max(...cities.map(c => c.coords.lat)) + 1,
    minLng: Math.min(...cities.map(c => c.coords.lng)) - 1,
    maxLng: Math.max(...cities.map(c => c.coords.lng)) + 1,
  };
  const getPos = (lat, lng) => ({
    x: ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 85 + 7.5,
    y: (1 - (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * 75 + 12.5
  });

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ padding: "50px 0 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>
          <Map size={22} style={{ verticalAlign: "middle", marginRight: 8, color: "#48DBFB" }} />
          Carte du voyage
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{cities.length} étapes à travers la Thaïlande</p>
      </div>

      {/* Visual Map */}
      <div style={{
        background: "linear-gradient(145deg, rgba(16,172,132,0.08) 0%, rgba(72,219,251,0.06) 50%, rgba(46,213,115,0.04) 100%)",
        borderRadius: 24, padding: 20, position: "relative",
        height: 380, border: "1px solid rgba(72,219,251,0.12)",
        overflow: "hidden"
      }}>
        {/* Grid lines */}
        {[...Array(6)].map((_, i) => (
          <div key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${15 + i * 15}%`, height: 1, background: "rgba(255,255,255,0.03)" }} />
        ))}
        {[...Array(6)].map((_, i) => (
          <div key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${15 + i * 15}%`, width: 1, background: "rgba(255,255,255,0.03)" }} />
        ))}

        {/* Route lines */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {cities.slice(0, -1).map((city, i) => {
            const from = getPos(city.coords.lat, city.coords.lng);
            const to = getPos(cities[i + 1].coords.lat, cities[i + 1].coords.lng);
            return (
              <line key={i} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`}
                stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="6 4" />
            );
          })}
          {cities.slice(0, -1).map((city, i) => {
            const from = getPos(city.coords.lat, city.coords.lng);
            const to = getPos(cities[i + 1].coords.lat, cities[i + 1].coords.lng);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            return (
              <text key={`label${i}`} x={`${midX}%`} y={`${midY - 2}%`} fill="rgba(255,255,255,0.2)" fontSize="10" textAnchor="middle" fontWeight="600">✈</text>
            );
          })}
        </svg>

        {/* City dots */}
        {cities.map((city, i) => {
          const pos = getPos(city.coords.lat, city.coords.lng);
          const isHovered = hoveredDay === city.city;
          return (
            <button key={i}
              onClick={() => onSelectDay(city.days[0].day)}
              onMouseEnter={() => setHoveredDay(city.city)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.2 : 1})`,
                background: "none", border: "none", cursor: "pointer",
                transition: "all 0.3s ease", zIndex: isHovered ? 10 : 5,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4
              }}>
              <div style={{
                width: isHovered ? 52 : 44, height: isHovered ? 52 : 44,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${city.color}, ${city.color}88)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isHovered ? 24 : 20,
                boxShadow: `0 0 ${isHovered ? 25 : 12}px ${city.color}44`,
                border: `2px solid ${city.color}88`,
                transition: "all 0.3s ease"
              }}>{city.emoji}</div>
              <div style={{
                background: isHovered ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)",
                borderRadius: 8, padding: "3px 10px",
                fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
                color: isHovered ? "#fff" : "rgba(255,255,255,0.8)",
                transition: "all 0.3s ease"
              }}>
                {city.city}
                <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>J{city.days[0].day}{city.days.length > 1 ? `-${city.days[city.days.length - 1].day}` : ""}</span>
              </div>
            </button>
          );
        })}

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 12, left: 12,
          background: "rgba(0,0,0,0.6)", borderRadius: 12, padding: "8px 12px",
          fontSize: 10, color: "rgba(255,255,255,0.5)"
        }}>
          <Globe size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Cliquez sur une ville pour voir l'itinéraire
        </div>
      </div>

      {/* City List */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        {cities.map((city, i) => (
          <button key={i} onClick={() => onSelectDay(city.days[0].day)}
            style={{
              background: "rgba(255,255,255,0.04)", border: `1px solid ${city.color}22`,
              borderRadius: 14, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", width: "100%", textAlign: "left",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
          >
            <span style={{ fontSize: 28 }}>{city.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{city.city}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                Jour{city.days.length > 1 ? "s" : ""} {city.days[0].day}{city.days.length > 1 ? `-${city.days[city.days.length - 1].day}` : ""} · {city.days.reduce((a, d) => a + d.activities.length, 0)} activités
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: city.color, fontWeight: 700 }}>
                {city.days.reduce((a, d) => a + Object.values(d.budgetDay).reduce((x, y) => x + y, 0), 0)}€
              </span>
              <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// ITINERARY SCREEN
// ============================================
function ItineraryScreen({ trip, selectedDay, setSelectedDay, expandedActivity, setExpandedActivity }) {
  const dayIndex = selectedDay ? selectedDay - 1 : 0;
  const day = trip.days[dayIndex];

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ padding: "50px 0 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>
          <Calendar size={20} style={{ verticalAlign: "middle", marginRight: 8, color: "#FF6B6B" }} />
          Itinéraire jour par jour
        </h1>
      </div>

      {/* Day Selector Horizontal */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 16, msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {trip.days.map((d, i) => (
          <button key={i} onClick={() => { setSelectedDay(d.day); setExpandedActivity(null); }}
            style={{
              flexShrink: 0, padding: "10px 14px", borderRadius: 14,
              background: d.day === day.day ? `linear-gradient(135deg, ${d.color}, ${d.color}88)` : "rgba(255,255,255,0.05)",
              border: d.day === day.day ? "none" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer", textAlign: "center", minWidth: 64,
              transition: "all 0.2s ease"
            }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{d.emoji}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: d.day === day.day ? "#0a1628" : "rgba(255,255,255,0.6)" }}>J{d.day}</div>
          </button>
        ))}
      </div>

      {/* Day Header */}
      <div style={{
        background: `linear-gradient(135deg, ${day.color}18, ${day.color}08)`,
        borderRadius: 20, padding: "20px 18px", marginBottom: 16,
        border: `1px solid ${day.color}22`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 40 }}>{day.emoji}</div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Jour {day.day} — {day.city}</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "4px 0 0", fontWeight: 600 }}>
              {day.date} · {day.activities.length} activités · {Object.values(day.budgetDay).reduce((a, b) => a + b, 0)}€
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute", left: 11, top: 8, bottom: 8, width: 2,
          background: `linear-gradient(180deg, ${day.color}44, ${day.color}11)`
        }} />

        {day.activities.map((act, i) => {
          const Icon = iconMap[act.icon] || Compass;
          const isExpanded = expandedActivity === `${day.day}-${i}`;
          return (
            <div key={i} style={{ marginBottom: 12, position: "relative" }}>
              {/* Dot */}
              <div style={{
                position: "absolute", left: -22, top: 16,
                width: 12, height: 12, borderRadius: "50%",
                background: day.color, border: "2px solid #0a1628",
                boxShadow: `0 0 8px ${day.color}44`
              }} />

              <button onClick={() => setExpandedActivity(isExpanded ? null : `${day.day}-${i}`)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  background: isExpanded ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16, padding: "14px 16px",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${day.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Icon size={16} color={day.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: day.color, fontWeight: 800 }}>{act.time}</span>
                      {act.cost > 0 && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{act.cost}€</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginTop: 2 }}>{act.title}</div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
                </div>

                {isExpanded && (
                  <div style={{
                    marginTop: 12, paddingTop: 12,
                    borderTop: "1px solid rgba(255,255,255,0.06)"
                  }}>
                    <div style={{
                      background: "rgba(254,202,87,0.08)", borderRadius: 10, padding: "10px 14px",
                      display: "flex", alignItems: "flex-start", gap: 8
                    }}>
                      <Sparkles size={14} color="#FECA57" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{act.note}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {act.duration}
                      </span>
                      {act.cost > 0 && (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                          <CircleDollarSign size={12} /> {act.cost}€/pers
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      {day.tips && day.tips.length > 0 && (
        <div style={{
          background: "rgba(46,213,115,0.08)", borderRadius: 16, padding: 16, marginTop: 16,
          border: "1px solid rgba(46,213,115,0.12)"
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={14} color="#2ED573" /> Tips du jour
          </div>
          {day.tips.map((tip, i) => (
            <div key={i} style={{
              fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
              paddingLeft: 12, borderLeft: "2px solid rgba(46,213,115,0.3)",
              marginBottom: i < day.tips.length - 1 ? 10 : 0
            }}>
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* Nav Buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, paddingBottom: 20 }}>
        {dayIndex > 0 && (
          <button onClick={() => { setSelectedDay(day.day - 1); setExpandedActivity(null); }}
            style={{
              flex: 1, padding: "12px", borderRadius: 14,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
            <ChevronLeft size={16} /> Jour {day.day - 1}
          </button>
        )}
        {dayIndex < trip.days.length - 1 && (
          <button onClick={() => { setSelectedDay(day.day + 1); setExpandedActivity(null); }}
            style={{
              flex: 1, padding: "12px", borderRadius: 14,
              background: `linear-gradient(135deg, ${trip.days[dayIndex + 1].color}44, ${trip.days[dayIndex + 1].color}22)`,
              border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
            Jour {day.day + 1} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// BUDGET SCREEN
// ============================================
function BudgetScreen({ trip, cumulativeBudget, budgetByDay, categoryTotals, totalSpent, showAlert, setShowAlert }) {
  const remaining = trip.totalBudget - totalSpent;
  const dailyAvg = Math.round(totalSpent / trip.days.length);
  const overBudget = remaining < 0;

  // Simulate budget alert
  const alertData = {
    day: 7,
    category: "food",
    currentSpend: 25,
    weekBudget: 20,
    overBy: 5,
    alternative: { name: "Warung Made (200m)", price: 5, saving: 7 }
  };

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ padding: "50px 0 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>
          <Wallet size={20} style={{ verticalAlign: "middle", marginRight: 8, color: "#FECA57" }} />
          Budget dynamique
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 4 }}>Suivi en temps réel de vos dépenses</p>
      </div>

      {/* Main Budget Card */}
      <div style={{
        background: "linear-gradient(135deg, rgba(254,202,87,0.15) 0%, rgba(255,107,107,0.08) 100%)",
        borderRadius: 24, padding: 24,
        border: "1px solid rgba(254,202,87,0.15)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: overBudget ? "#FF6B6B" : "#2ED573" }}>
            {remaining}€
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
            {overBudget ? "Au-dessus du budget" : "Budget restant"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Total", value: `${trip.totalBudget}€`, icon: CircleDollarSign, color: "#FECA57" },
            { label: "Dépensé", value: `${totalSpent}€`, icon: TrendingUp, color: "#FF6B6B" },
            { label: "Moy/jour", value: `${dailyAvg}€`, icon: TrendingDown, color: "#48DBFB" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <s.icon size={16} color={s.color} style={{ marginBottom: 4 }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Alert Demo */}
      <button onClick={() => setShowAlert(!showAlert)}
        style={{
          width: "100%", marginTop: 16, padding: "14px 16px",
          background: showAlert ? "rgba(255,107,107,0.15)" : "rgba(255,107,107,0.08)",
          border: "1px solid rgba(255,107,107,0.2)",
          borderRadius: 16, cursor: "pointer", textAlign: "left",
          transition: "all 0.2s ease"
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,107,107,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <AlertTriangle size={18} color="#FF6B6B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#FF6B6B" }}>🚨 Alerte Budget</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Jour 7 · Dépassement nourriture</div>
          </div>
          <Bell size={16} color="#FF6B6B" />
        </div>

        {showAlert && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,107,107,0.15)" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 10px" }}>
              Si tu choisis le BBQ seafood ce soir (<strong style={{ color: "#FF6B6B" }}>12€</strong>), tu dépasses de <strong style={{ color: "#FF6B6B" }}>5€</strong> ton budget nourriture de la semaine.
            </p>
            <div style={{
              background: "rgba(46,213,115,0.1)", borderRadius: 12, padding: "10px 14px",
              border: "1px solid rgba(46,213,115,0.15)"
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2ED573", marginBottom: 4 }}>💡 Alternative à 200m</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                <strong>Fisherman's Village Street Food</strong> — {alertData.alternative.price}€ · Tu économises {alertData.alternative.saving}€
              </div>
            </div>
          </div>
        )}
      </button>

      {/* Spending Curve */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📈 Courbe de dépenses</h3>
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: "16px 8px 8px 0",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumulativeBudget}>
              <defs>
                <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FECA57" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FECA57" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="remainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ED573" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2ED573" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, trip.totalBudget]} />
              <Tooltip
                contentStyle={{ background: "rgba(10,22,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#fff", fontWeight: 700 }}
                formatter={(value, name) => [
                  `${value}€`,
                  name === "cumulative" ? "Dépensé" : "Restant"
                ]}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#FECA57" strokeWidth={2.5} fill="url(#budgetGrad)" />
              <Area type="monotone" dataKey="remaining" stroke="#2ED573" strokeWidth={1.5} fill="url(#remainGrad)" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Spending Bars */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📊 Dépenses par jour</h3>
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: "16px 8px 8px 0",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={budgetByDay}>
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "rgba(10,22,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#fff", fontWeight: 700 }}
                formatter={(v, n) => [`${v}€`, categoryLabels[n] || n]}
              />
              <Bar dataKey="hotel" stackId="a" fill={categoryColors.hotel} radius={[0, 0, 0, 0]} />
              <Bar dataKey="food" stackId="a" fill={categoryColors.food} />
              <Bar dataKey="transport" stackId="a" fill={categoryColors.transport} />
              <Bar dataKey="activities" stackId="a" fill={categoryColors.activities} />
              <Bar dataKey="other" stackId="a" fill={categoryColors.other} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div style={{ marginTop: 24, paddingBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>🏷️ Par catégorie</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([key, value]) => {
            const percent = Math.round((value / totalSpent) * 100);
            return (
              <div key={key} style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px 16px",
                border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    {categoryEmojis[key]} {categoryLabels[key]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: categoryColors[key] }}>{value}€</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{
                    width: `${percent}%`, height: "100%",
                    background: categoryColors[key], borderRadius: 10,
                    transition: "width 0.8s ease"
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, textAlign: "right" }}>{percent}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CHECKLIST SCREEN
// ============================================
function ChecklistScreen({ data, checked, toggle, totalChecked, totalItems }) {
  const percent = Math.round((totalChecked / totalItems) * 100);

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ padding: "50px 0 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>
          <CheckSquare size={20} style={{ verticalAlign: "middle", marginRight: 8, color: "#2ED573" }} />
          Checklist départ
        </h1>
      </div>

      {/* Progress */}
      <div style={{
        background: "linear-gradient(135deg, rgba(46,213,115,0.12) 0%, rgba(72,219,251,0.06) 100%)",
        borderRadius: 20, padding: 20, marginBottom: 20,
        border: "1px solid rgba(46,213,115,0.12)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{totalChecked}/{totalItems} complétés</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: percent === 100 ? "#2ED573" : "#FECA57" }}>{percent}%</span>
        </div>
        <div style={{ height: 10, background: "rgba(0,0,0,0.3)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{
            width: `${percent}%`, height: "100%",
            background: percent === 100 ? "linear-gradient(90deg, #2ED573, #10AC84)" : "linear-gradient(90deg, #FECA57, #FF6B6B)",
            borderRadius: 10, transition: "width 0.5s ease"
          }} />
        </div>
        {percent === 100 && (
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 14, color: "#2ED573", fontWeight: 800 }}>
            🎉 Tout est prêt, bon voyage !
          </div>
        )}
      </div>

      {/* Categories */}
      {data.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>{cat.category}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cat.items.map((item) => {
              const isChecked = checked[item.id];
              return (
                <button key={item.id} onClick={() => toggle(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: isChecked ? "rgba(46,213,115,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isChecked ? "rgba(46,213,115,0.15)" : item.critical ? "rgba(255,107,107,0.12)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 14, padding: "12px 14px",
                    cursor: "pointer", width: "100%", textAlign: "left",
                    transition: "all 0.2s ease"
                  }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                    background: isChecked ? "#2ED573" : "rgba(255,255,255,0.06)",
                    border: isChecked ? "none" : "2px solid rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s ease"
                  }}>
                    {isChecked && <Check size={14} color="#0a1628" strokeWidth={3} />}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: isChecked ? "rgba(255,255,255,0.4)" : "#fff",
                    textDecoration: isChecked ? "line-through" : "none",
                    transition: "all 0.2s ease"
                  }}>{item.text}</span>
                  {item.critical && !isChecked && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: "#FF6B6B",
                      background: "rgba(255,107,107,0.15)", padding: "2px 8px", borderRadius: 6,
                      marginLeft: "auto", flexShrink: 0
                    }}>ESSENTIEL</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
