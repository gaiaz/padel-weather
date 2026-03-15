import React, { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import loaderAnimation from './loader.json';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun, CloudRain, Wind, CheckCircle2,
  MapPin, Droplets, Loader2, RefreshCw,
  Thermometer, ChevronDown, ChevronUp, EyeOff, X,
  Snowflake, AlertTriangle, ThumbsUp, CalendarDays, Share
} from 'lucide-react';

const BRAND = '#0041af';
const GCAL_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const DAY_FULL  = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS    = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const getDateInfo = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const iso = d.toISOString().substring(0, 10);
  return {
    short:   offset === 0 ? 'Oggi' : DAY_SHORT[d.getDay()],
    full:    DAY_FULL[d.getDay()],
    dateStr: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
    num:     d.getDate(),
    iso,
  };
};

/* ── Animation variants ── */
const fadeDown = {
  hidden: { opacity: 0, y: -12 },
  show:   { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.055, delayChildren: 0.15 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

const sheetVariant = {
  hidden: { y: 80, opacity: 0 },
  show:   { y: 0,  opacity: 1, transition: { type: 'spring', stiffness: 220, damping: 28, delay: 0.25 } },
};

const contentSwap = {
  initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.18 } },
};

const slotVariant = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/* ── Slot verdict ── */
const getSlotVerdict = (s, dayData, ct) => {
  const rain = s.rain ?? 0;
  const temp = s.temp ?? 20;
  const hum  = s.humidity ?? 50;
  const wind = dayData?.wind ?? 0;

  if (rain > 60)
    return { label: 'Pioggia', color: '#dc2626', bg: '#fef2f2', icon: <CloudRain size={13} /> };
  if (temp > 33)
    return { label: 'Troppo caldo', color: '#dc2626', bg: '#fef2f2', icon: <Thermometer size={13} /> };
  if (wind > 35 && ct === 'outdoor')
    return { label: 'Vento forte', color: '#0d9488', bg: '#f0fdfa', icon: <Wind size={13} /> };
  if (temp < 8)
    return { label: 'Troppo freddo', color: '#6366f1', bg: '#eef2ff', icon: <Snowflake size={13} /> };
  if (rain > 30)
    return { label: 'Potrebbe piovere', color: '#e87400', bg: '#fff7ed', icon: <CloudRain size={13} /> };
  if (hum > 85)
    return { label: 'Umidità alta', color: '#e87400', bg: '#fff7ed', icon: <Droplets size={13} /> };
  if (temp < 12)
    return { label: 'Freddo', color: '#6366f1', bg: '#eef2ff', icon: <Snowflake size={13} /> };
  if (temp > 28)
    return { label: 'Abbastanza caldo', color: '#e87400', bg: '#fff7ed', icon: <Thermometer size={13} /> };
  if (temp >= 16 && temp <= 26 && rain < 15 && hum < 75)
    return { label: 'Ottimo', color: '#16a34a', bg: '#f0fdf4', icon: <ThumbsUp size={13} /> };
  return { label: 'OK', color: BRAND, bg: '#eff6ff', icon: <CheckCircle2 size={13} /> };
};

const App = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [courtType, setCourtType] = useState('outdoor');
  const [location, setLocation] = useState('Roma');
  const [tempLocation, setTempLocation] = useState('');
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const compactLockedRef = useRef(false);

  /* ── Google Calendar state ── */
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalToken, setGcalToken] = useState(null);
  const [calEvents, setCalEvents] = useState({}); // { 'YYYY-MM-DD': [{ title, startTime, endTime, allDay, slot }] }
  const gcalClientRef = useRef(null);

  const slotDetails = [
    { range: '08:00 - 12:00' },
    { range: '13:00 - 18:00' },
    { range: '18:00 - 23:00' },
  ];

  const mockFallback = Array.from({ length: 14 }).map((_, i) => {
    const di = getDateInfo(i);
    const rainy = i === 1;
    const windy = i === 3;
    const hot   = i >= 7;
    return {
      day:      di.short,
      full:     di.full,
      date:     di.dateStr,
      iso:      di.iso,
      tempMin:  hot ? 24 : 9,
      tempMax:  hot ? 34 : (rainy ? 11 : 17),
      condition: rainy ? 'rain' : (windy ? 'windy' : 'sunny'),
      rainProb:  rainy ? 90 : (windy ? 20 : 5),
      wind:      windy ? 40 : 12,
      humidity:  rainy ? 92 : 58,
      slots: [
        { time: 'Mattina',    temp: hot ? 26 : 10, rain: rainy ? 85 : 5,  condition: rainy ? 'rain' : 'sunny', humidity: rainy ? 88 : 65 },
        { time: 'Pomeriggio', temp: hot ? 34 : 17, rain: rainy ? 80 : 5,  condition: rainy ? 'rain' : 'sunny', humidity: rainy ? 80 : 52 },
        { time: 'Sera',       temp: hot ? 28 : 12, rain: rainy ? 75 : 10, condition: rainy ? 'rain' : 'sunny', humidity: rainy ? 90 : 82 },
      ],
    };
  });

  // WMO weather code → condition
  const wmoToCondition = (code) => {
    if (code == null) return 'sunny';
    if ([51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(code)) return 'rain';
    if ([71,73,75,77,85,86].includes(code)) return 'rain';
    if (code === 3) return 'cloudy';
    return 'sunny';
  };

  // Average values over an array of hourly indices
  const avg = (arr, indices) => {
    const vals = indices.map(i => arr[i]).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  const max = (arr, indices) => Math.round(Math.max(...indices.map(i => arr[i] ?? 0)));
  const dominantCode = (arr, indices) => {
    const vals = indices.map(i => arr[i] ?? 0);
    return vals.sort((a, b) => b - a)[0];
  };

  const fetchWeather = async () => {
    try {
      setLoading(true);
      // 1. Geocoding
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=it&format=json`
      );
      const geoData = await geoRes.json();
      const place = geoData.results?.[0];
      if (!place) throw new Error('Città non trovata');
      const { latitude, longitude } = place;

      // 2. Forecast (hourly + daily, 14 days)
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', latitude);
      url.searchParams.set('longitude', longitude);
      url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,windspeed_10m,relativehumidity_2m,weathercode');
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode');
      url.searchParams.set('forecast_days', '14');
      url.searchParams.set('timezone', 'auto');
      url.searchParams.set('wind_speed_unit', 'kmh');

      const wxRes  = await fetch(url);
      const wx     = await wxRes.json();
      const hourly = wx.hourly;
      const daily  = wx.daily;

      const data = daily.time.map((dateStr, di) => {
        const info   = getDateInfo(di);
        // hourly indices for this day
        const base   = di * 24;
        const morn   = [8,9,10,11].map(h => base + h);   // 08-11
        const aftern = [13,14,15,16,17].map(h => base + h); // 13-17
        const eve    = [18,19,20,21,22].map(h => base + h); // 18-22

        const slotData = (indices) => ({
          temp:      avg(hourly.temperature_2m, indices),
          rain:      max(hourly.precipitation_probability, indices),
          humidity:  avg(hourly.relativehumidity_2m, indices),
          condition: wmoToCondition(dominantCode(hourly.weathercode, indices)),
        });

        return {
          day:       info.short,
          full:      info.full,
          date:      info.dateStr,
          iso:       info.iso,
          tempMax:   Math.round(daily.temperature_2m_max[di]),
          tempMin:   Math.round(daily.temperature_2m_min[di]),
          rainProb:  daily.precipitation_probability_max[di] ?? 0,
          wind:      Math.round(daily.windspeed_10m_max[di]),
          humidity:  avg(hourly.relativehumidity_2m, [base+12]),
          condition: wmoToCondition(daily.weathercode[di]),
          slots: [
            { time: 'Mattina',    ...slotData(morn)   },
            { time: 'Pomeriggio', ...slotData(aftern) },
            { time: 'Sera',       ...slotData(eve)    },
          ],
        };
      });

      processData(data, true);
    } catch {
      processData(mockFallback, false);
    }
  };

  const processData = (data, liveStatus) => {
    setWeatherData(data.map(d => ({ ...d, score: calculatePadelScore(d) })));
    setIsLive(liveStatus);
    setLoading(false);
  };

  const calculatePadelScore = (d) => {
    let s = 10;
    if (d.rainProb > 40 && courtType === 'outdoor') s -= 8;
    if (d.wind > 25    && courtType === 'outdoor') s -= 4;
    if (d.tempMax > 32) s -= 3;
    return Math.max(0, s);
  };

  const scoreDotColor = (item) => {
    const isOut = courtType === 'outdoor';
    const maxRain = Math.max(...(item.slots ?? []).map(s => s.rain ?? 0));
    const maxTemp = Math.max(...(item.slots ?? []).map(s => s.temp ?? 0));
    if (isOut && maxRain > 50) return '#ff6467';
    if (isOut && maxRain > 20) return '#ffb900';
    if (maxTemp > 32) return '#ffb900';
    return '#00d492';
  };

  const conditionIcon = (item, size = 15) => {
    const rain = item.rainProb ?? 0;
    const c = (item.condition || '').toLowerCase();
    if (rain > 25 || c.includes('rain') || c.includes('piogg'))
      return <CloudRain className="text-blue-300" size={size} />;
    if (c.includes('wind') || c.includes('vent'))
      return <Wind className="text-teal-300" size={size} />;
    return <Sun className="text-amber-300" size={size} />;
  };

  useEffect(() => { fetchWeather(); }, [courtType, location]);

  /* ── Google Calendar: load GIS script ── */
  useEffect(() => {
    if (!GCAL_CLIENT_ID || GCAL_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      gcalClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GCAL_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: (response) => {
          if (response.access_token) {
            setGcalToken(response.access_token);
            setGcalConnected(true);
          }
        },
      });
    };
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  /* ── Fetch calendar events when token changes ── */
  useEffect(() => {
    if (gcalToken) fetchCalendarEvents(gcalToken);
  }, [gcalToken]);

  const connectGCal = () => {
    if (!gcalClientRef.current) return;
    gcalClientRef.current.requestAccessToken();
  };

  const disconnectGCal = () => {
    setGcalConnected(false);
    setGcalToken(null);
    setCalEvents({});
  };

  const timeToSlotName = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    const h = new Date(dateTimeStr).getHours();
    if (h >= 8  && h < 12) return 'Mattina';
    if (h >= 13 && h < 18) return 'Pomeriggio';
    if (h >= 18 && h < 23) return 'Sera';
    return null;
  };

  const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    return new Date(dateTimeStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchCalendarEvents = async (token) => {
    try {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 14);

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        setGcalConnected(false);
        setGcalToken(null);
        return;
      }

      const data = await res.json();
      const grouped = {};
      (data.items || []).forEach(event => {
        const dateStr = (event.start.dateTime || event.start.date || '').substring(0, 10);
        if (!dateStr) return;
        if (!grouped[dateStr]) grouped[dateStr] = [];
        const allDay = !event.start.dateTime;
        grouped[dateStr].push({
          title:     event.summary || 'Evento',
          startTime: event.start.dateTime || null,
          endTime:   event.end.dateTime || null,
          allDay,
          slot:      allDay ? null : timeToSlotName(event.start.dateTime),
        });
      });
      setCalEvents(grouped);
    } catch (e) {
      console.error('Calendar fetch error', e);
    }
  };

  const day  = weatherData?.[selectedDay];
  const slot = day?.slots?.[selectedSlot];

  const fieldAnalysis = () => {
    if (!slot || !day) return null;
    const rain = slot.rain ?? day.rainProb ?? 0;
    const isOutdoor = courtType === 'outdoor';

    if (isOutdoor && (rain > 60 || (day.rainProb ?? 0) > 60))
      return { label: 'Rischio pioggia', tip: `${rain}% di pioggia. Campo scivoloso o impraticabile.`, color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', iconBg: '#dc2626', iconBgBorder: 'rgba(252,165,165,0.4)', icon: <CloudRain size={18} color="#fff" /> };

    if (isOutdoor && (day.wind ?? 0) > 25)
      return { label: 'Vento forte', tip: `Fino a ${day.wind} km/h. Evita pallonetti, gioca colpi bassi.`, color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', iconBg: '#0d9488', iconBgBorder: 'rgba(153,246,228,0.4)', icon: <Wind size={18} color="#fff" /> };

    if (slot.temp > 30)
      return { label: courtType === 'indoor' ? 'Afa indoor' : 'Caldo intenso', tip: `${slot.temp}°C. Idratati spesso e riduci i punti lunghi.`, color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', iconBg: '#dc2626', iconBgBorder: 'rgba(252,165,165,0.4)', icon: <Thermometer size={18} color="#fff" /> };

    if (slot.temp < 8)
      return { label: 'Troppo freddo', tip: `Solo ${slot.temp}°C. Riscaldamento lungo, rischio infortuni.`, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', iconBg: '#6366f1', iconBgBorder: 'rgba(199,210,254,0.4)', icon: <Thermometer size={18} color="#fff" /> };

    if (isOutdoor && rain > 30)
      return { label: 'Possibile pioggia', tip: `${rain}% di probabilità pioggia in questa fascia. Tieni d'occhio il cielo.`, color: '#e87400', bg: '#fff7ed', border: '#feb84d', iconBg: '#e87400', iconBgBorder: 'rgba(254,154,0,0.4)', icon: <CloudRain size={18} color="#fff" /> };

    if (isOutdoor && slot.condition?.toLowerCase().includes('sun') && selectedSlot === 1)
      return { label: 'Sole in faccia', tip: 'Sole basso tra le 16 e le 18. Porta gli occhiali!', color: '#e87400', bg: '#fff7ed', border: '#feb84d', iconBg: '#e87400', iconBgBorder: 'rgba(254,154,0,0.4)', icon: <EyeOff size={18} color="#fff" /> };

    if ((slot.humidity ?? 0) > 85)
      return { label: 'Vetri bagnati', tip: 'Umidità altissima. La palla scivola sulle pareti.', color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', iconBg: '#dc2626', iconBgBorder: 'rgba(252,165,165,0.4)', icon: <Droplets size={18} color="#fff" /> };
    if ((slot.humidity ?? 0) > 70)
      return { label: 'Vetri umidi', tip: 'I vetri sudano. Rimbalzi meno reattivi.', color: '#e87400', bg: '#fff7ed', border: '#feb84d', iconBg: '#e87400', iconBgBorder: 'rgba(254,154,0,0.4)', icon: <Droplets size={18} color="#fff" /> };

    return { label: 'Clima ottimo', tip: 'Condizioni ideali. Divertitevi!', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', iconBg: '#16a34a', iconBgBorder: 'rgba(134,239,172,0.4)', icon: <CheckCircle2 size={18} color="#fff" /> };
  };

  const info = fieldAnalysis();

  const gcalEnabled = GCAL_CLIENT_ID && GCAL_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

  const buildGCalLink = () => {
    const slotTimes = [
      { start: '09:00', end: '10:30' },
      { start: '15:00', end: '16:30' },
      { start: '20:00', end: '21:30' },
    ];
    const { start, end } = slotTimes[selectedSlot];
    const dateBase = day.iso.replace(/-/g, '');
    const startStr = `${dateBase}T${start.replace(':', '')}00`;
    const endStr   = `${dateBase}T${end.replace(':', '')}00`;
    const title    = encodeURIComponent(`🎾 Padel — ${location}`);
    const details  = encodeURIComponent(`${info.label}: ${info.tip}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}`;
  };

  const handleShare = async () => {
    const text = `🎾 Padel Weather (${location})\n📅 ${fullDayName} ${day.date}\n⏰ ${slot.time}\n${info.label}: ${info.tip}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Padel Weather', text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <motion.div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: BRAND }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

      <Lottie animationData={loaderAnimation} loop style={{ width: 90, height: 90 }} />

      <motion.p className="font-black text-white/50 uppercase tracking-widest text-[10px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        Caricamento radar...
      </motion.p>
    </motion.div>
  );

  const fullDayName = day.full ?? day.day;
  const selectedDayEvents = day?.iso ? (calEvents[day.iso] || []) : [];
  const selectedDayEventCount = selectedDayEvents.length;

  return (
    <motion.div
      className="flex flex-col"
      style={{
        background: BRAND,
        minHeight: '100dvh',
      }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>

      {/* ── Blue section (fuori dallo scroll — si compatta via animation) ── */}
      <div className="flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

        {/* ── Header ── */}
        <motion.header
          className="flex justify-between items-start px-6"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0, paddingTop: isScrolled ? 10 : 20, paddingBottom: isScrolled ? 6 : 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          <div className="cursor-pointer" onClick={() => { setTempLocation(location); setIsLocModalOpen(true); }}>
            <h1 className="font-ibm text-[23.8px] leading-[24px] tracking-[-0.48px] italic text-white flex items-center gap-2" style={{ fontWeight: 700 }}>
              Padel<span style={{ color: 'rgba(255,255,255,0.45)' }}>Weather</span>
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Versione aggiornata" aria-hidden />
            </h1>
            <motion.div
              className="flex items-center gap-2 mt-2 overflow-hidden"
              animate={{ height: isScrolled ? 0 : 20, opacity: isScrolled ? 0 : 1, marginTop: isScrolled ? 0 : 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <span className="flex items-center gap-1 text-[11px] uppercase font-ibm font-bold text-white/70">
                <MapPin size={10} className="text-white/50" /> {location}
              </span>
              <span className="text-[9px] font-bold px-[9px] py-[3px] rounded-full border border-white/15 text-white/30">
                {isLive ? 'LIVE' : 'DEMO'}
              </span>
            </motion.div>
          </div>

          <div className="flex items-center gap-2">
            {gcalEnabled && (
              <motion.button
                onClick={gcalConnected ? disconnectGCal : connectGCal}
                className="p-[10px] rounded-[8px] relative"
                style={{ background: 'rgba(255,255,255,0.12)' }}
                whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                title={gcalConnected ? 'Calendario connesso — tap per disconnettere' : 'Connetti Google Calendar'}>
                <CalendarDays size={17} className="text-white" style={{ opacity: gcalConnected ? 1 : 0.4 }} />
                {gcalConnected && (
                  <motion.div
                    className="absolute top-[7px] right-[7px] w-[5px] h-[5px] rounded-full bg-green-400"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }} />
                )}
              </motion.button>
            )}
            <motion.button onClick={() => fetchWeather()} className="p-[10px] rounded-[8px]"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              whileTap={{ scale: 0.88, rotate: -30 }} whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <RefreshCw size={17} className="text-white" />
            </motion.button>
          </div>
        </motion.header>

        {/* ── Toggle — nascosto quando scrolled ── */}
        <motion.div
          className="px-6 overflow-hidden"
          animate={{ height: isScrolled ? 0 : 'auto', opacity: isScrolled ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
          <div className="py-3">
            <div className="flex p-1 rounded-[99px]" style={{ background: 'rgba(255,255,255,0.12)' }}>
              {['outdoor', 'indoor'].map((type) => (
                <motion.button key={type} onClick={() => setCourtType(type)}
                  className={`flex-1 py-[10px] text-[12px] rounded-[999px] uppercase font-ibm font-bold ${courtType === type ? 'bg-white' : 'text-white'}`}
                  style={courtType === type ? { color: BRAND } : {}}
                  whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  {type === 'outdoor' ? "All'aperto" : 'Al chiuso'}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Day strip ── */}
        <div className="overflow-x-auto no-scrollbar w-full">
          <motion.div
            className="flex gap-[8px] w-max"
            animate={{ paddingLeft: 24, paddingRight: 24, paddingTop: isScrolled ? 4 : 4, paddingBottom: isScrolled ? 10 : 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            {weatherData.map((item, i) => {
              const isSelected = selectedDay === i;
              const eventCount = gcalConnected ? (calEvents[item.iso]?.length || 0) : 0;
              return (
                <motion.button key={i}
                  onClick={() => { setSelectedDay(i); setSelectedSlot(1); setIsScrolled(false); compactLockedRef.current = false; }}
                  className="flex-shrink-0 flex flex-col items-center gap-[5.8px] rounded-[6px]"
                  initial={{ opacity: 0, y: 20, scale: 0.92 }}
                  animate={{
                    opacity: 1, y: 0, scale: 1,
                    width: isScrolled ? 52 : 70,
                    paddingTop:    isScrolled ? 8  : 14,
                    paddingBottom: isScrolled ? 8  : 14,
                    paddingLeft:   isScrolled ? 6  : 14,
                    paddingRight:  isScrolled ? 6  : 14,
                  }}
                  style={isSelected ? { background: 'transparent', border: '2px solid #fff' } : { background: 'rgba(255,255,255,0.1)', border: '2px solid transparent' }}
                  whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }}
                  transition={{
                    opacity:       { duration: 0.3, delay: 0.15 + i * 0.055 },
                    y:             { type: 'spring', stiffness: 260, damping: 22, delay: 0.15 + i * 0.055 },
                    scale:         { type: 'spring', stiffness: 260, damping: 22, delay: 0.15 + i * 0.055 },
                    width:         { type: 'spring', stiffness: 300, damping: 28 },
                    paddingTop:    { type: 'spring', stiffness: 300, damping: 28 },
                    paddingBottom: { type: 'spring', stiffness: 300, damping: 28 },
                    paddingLeft:   { type: 'spring', stiffness: 300, damping: 28 },
                    paddingRight:  { type: 'spring', stiffness: 300, damping: 28 },
                  }}>
                  <span className="text-[9px] uppercase tracking-[0.9px] font-ibm font-bold text-white/50">{item.day}</span>
                  <motion.span
                    className="font-ibm text-white leading-none"
                    animate={{ fontSize: isScrolled ? 15 : 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    style={{ fontWeight: 600 }}>
                    {item.date.split(' ')[0]}
                  </motion.span>
                  <AnimatePresence>
                    {!isScrolled && (
                      <motion.div key="icon"
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.15 }}>
                        {conditionIcon(item, 15)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: scoreDotColor(item) }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 + i * 0.04 }} />
                  <AnimatePresence>
                    {!isScrolled && gcalConnected && eventCount > 0 && (
                      <motion.div
                        className="flex items-center gap-[3px]"
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                        {Array.from({ length: Math.min(eventCount, 3) }).map((_, j) => (
                          <div key={j} className="w-[3px] h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.45)' }} />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

      </div>{/* end blue section */}

      {/* ── White sheet — overflow:clip mantiene border-radius con scroll interno ── */}
      <div className="flex-1 min-h-0 bg-white rounded-t-[36px]"
        style={{ overflow: 'clip', boxShadow: '0px -8px 40px 0px rgba(0,0,0,0.15)' }}>

        {/* ── Scroll area ── */}
        <div className="h-full overflow-y-auto"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          onScroll={e => {
            const top = e.currentTarget.scrollTop;
            if (top > 24) {
              if (!compactLockedRef.current) {
                setIsScrolled(true);
                compactLockedRef.current = true;
                setTimeout(() => { compactLockedRef.current = false; }, 500);
              }
            } else if (top < 8) {
              setIsScrolled(false);
            }
          }}>

      {/* inner wrapper — minHeight + paddingBottom per non finire sotto la CTA fixed */}
      <div style={{ minHeight: '100dvh', paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>

        {/* Sticky day header */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-3">
          <AnimatePresence mode="wait">
            <motion.div key={`header-${selectedDay}-${isScrolled}`} {...contentSwap}>
              {isScrolled ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-ibm text-[20px] tracking-[-0.5px] text-[#222f44]" style={{ fontWeight: 600 }}>{fullDayName}</span>
                    <span className="font-ibm text-[14px] text-[#90a1b9]" style={{ fontWeight: 500 }}>{day.date}</span>
                  </div>
                  <div className="px-3 py-[6px] rounded-[8px] font-ibm text-[18px] text-white" style={{ fontWeight: 500, background: BRAND }}>
                    {day.tempMax}°
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[36px] leading-[42px] tracking-[-1.8px] font-ibm text-[#222f44]" style={{ fontWeight: 600 }}>{fullDayName}</h2>
                    <div className="flex items-center gap-3">
                      <p className="font-ibm text-[18px] leading-[19.25px] text-[#364458]" style={{ fontWeight: 500 }}>{day.date}</p>
                      <AnimatePresence>
                        {gcalConnected && selectedDayEventCount > 0 && (
                          <motion.div className="flex items-center gap-[5px]"
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.2 }}>
                            <CalendarDays size={11} style={{ color: '#90a1b9' }} />
                            <span className="font-ibm text-[11px] text-[#90a1b9]" style={{ fontWeight: 600 }}>
                              {selectedDayEventCount} {selectedDayEventCount === 1 ? 'impegno' : 'impegni'}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="mt-1 pl-4 pr-3 py-[10px] rounded-[8px] font-ibm text-[24px] leading-[32px] text-white" style={{ fontWeight: 500, background: BRAND }}>
                    {day.tempMax}°
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="px-6 flex flex-col gap-3 pb-8">

        {/* Fascia analizzata */}
        <AnimatePresence mode="wait">
          <motion.div key={`fascia-${selectedSlot}`} className="flex items-center gap-2" {...contentSwap}>
            <span className="font-ibm text-[14px] text-[#364458]" style={{ fontWeight: 500 }}>Fascia analizzata:</span>
            <span className="font-ibm text-[9px] text-white uppercase px-[10px] py-[2px] rounded-full" style={{ fontWeight: 600, background: BRAND }}>{slot.time}</span>
          </motion.div>
        </AnimatePresence>

        {/* Field analysis card */}
        <AnimatePresence mode="wait">
          <motion.div key={`card-${selectedDay}-${selectedSlot}-${courtType}`}
            className="p-5 rounded-[8px] flex flex-col gap-3"
            style={{ background: info.bg, border: `1px solid ${info.border}` }} {...contentSwap}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div className="p-[6.7px] rounded-[3.4px]"
                  style={{ background: info.iconBg, border: `0.842px solid ${info.iconBgBorder}` }}
                  initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.1 }}>
                  {info.icon}
                </motion.div>
                <span className="font-ibm text-[21px] leading-[22.5px] tracking-[-0.63px]" style={{ fontWeight: 600, color: info.color }}>{info.label}</span>
              </div>
              <div className="flex flex-col items-end w-[48px]">
                <span className="font-ibm text-[9px] uppercase text-[#b99090]" style={{ fontWeight: 700 }}>Vento</span>
                <span className="font-ibm text-[12px] leading-[16px] text-[#6c4545]" style={{ fontWeight: 700 }}>{day.wind} km/h</span>
              </div>
            </div>
            <p className="font-ibm text-[14px] leading-[19.25px] text-[#583131]" style={{ fontWeight: 500 }}>{info.tip}</p>
          </motion.div>
        </AnimatePresence>

        {/* Accordion slot detail */}
        <div className="border-t border-slate-100 pt-[13px]">
          <motion.button onClick={() => setIsAccordionOpen(o => !o)}
            className="w-full flex justify-between items-center pb-3" whileTap={{ scale: 0.98 }}>
            <span className="font-ibm text-[14px] text-[#364458]" style={{ fontWeight: 500 }}>Dettaglio orario</span>
            <motion.div animate={{ rotate: isAccordionOpen ? 0 : 180 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
              <ChevronUp size={15} className="text-slate-400" />
            </motion.div>
          </motion.button>

          <AnimatePresence initial={false}>
            {isAccordionOpen && (
              <motion.div key="slots"
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ overflow: 'hidden' }}>
                <motion.div className="flex flex-col gap-2 pb-1"
                  variants={{ show: { transition: { staggerChildren: 0.07 } } }} initial="hidden" animate="show">
                  {day.slots.map((s, i) => {
                    const isActive = selectedSlot === i;
                    const verdict = getSlotVerdict(s, day, courtType);
                    const slotEvents = gcalConnected ? (selectedDayEvents.filter(ev => ev.slot === s.time)) : [];
                    return (
                      <motion.button key={i} onClick={() => setSelectedSlot(i)}
                        className="w-full flex flex-col text-left"
                        variants={slotVariant} whileTap={{ scale: 0.98 }}
                        style={isActive
                          ? { background: 'rgba(37,37,255,0.03)', border: `1px solid ${BRAND}`, borderRadius: '8px', padding: '14px 16px', opacity: 1 }
                          : { background: '#f8fafc', border: '2px solid transparent', borderRadius: '8px', padding: '14px 16px', opacity: 0.65 }}>

                        {/* Main row */}
                        <div className="flex items-center justify-between w-full">
                          {/* Left: name + time */}
                          <div className="flex flex-col items-start min-w-[80px]">
                            <span className="font-ibm text-[16px] text-[#364458]" style={{ fontWeight: isActive ? 700 : 500 }}>
                              {s.time}
                            </span>
                            <span className="font-ibm text-[10px] text-[#90a1b9] leading-[14px]" style={{ fontWeight: 600 }}>
                              {slotDetails[i].range}
                            </span>
                          </div>

                          {/* Center: verdict badge */}
                          <motion.div
                            className="flex items-center gap-1 px-[8px] py-[4px] rounded-[6px]"
                            style={{ background: verdict.bg }}
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.05 }}>
                            <span style={{ color: verdict.color }}>{verdict.icon}</span>
                            <span className="font-ibm text-[11px] leading-none" style={{ fontWeight: 700, color: verdict.color }}>
                              {verdict.label}
                            </span>
                          </motion.div>

                          {/* Right: temp + condition icon */}
                          <div className="flex flex-col items-end min-w-[36px] gap-[2px]">
                            <span className="font-ibm text-[14px] leading-[18px]"
                                  style={{ fontWeight: 700, color: s.temp > 30 ? '#fb2c36' : '#1d293d' }}>
                              {s.temp}°
                            </span>
                            <div className="flex items-center gap-[3px]">
                              {conditionIcon({ rainProb: s.rain, condition: s.condition }, 14)}
                              <span className="font-ibm text-[11px] text-[#90a1b9]" style={{ fontWeight: 600 }}>{s.rain}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Integrated agenda events */}
                        {slotEvents.length > 0 && (
                          <div className="mt-[10px] flex flex-col gap-[5px] w-full">
                            {slotEvents.map((ev, j) => (
                              <div key={j} className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-[3px] self-stretch rounded-full"
                                  style={{ background: i === 0 ? '#fbbf24' : i === 1 ? BRAND : '#6366f1' }} />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-ibm text-[12px] text-[#364458] truncate" style={{ fontWeight: 600 }}>{ev.title}</span>
                                  <span className="font-ibm text-[10px] text-[#90a1b9]" style={{ fontWeight: 500 }}>
                                    {ev.allDay ? 'Tutto il giorno' : `${formatTime(ev.startTime)} – ${formatTime(ev.endTime)}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        </div>{/* end content */}

      </div>{/* end inner wrapper */}

        </div>{/* end scroll area */}

      </div>{/* end white sheet */}

      {/* ── CTA — position fixed, bottom 0, safe area come padding-bottom ── */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20,
        background: 'white',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        display: 'flex', gap: '8px',
        paddingTop: '10px', paddingLeft: '24px', paddingRight: '24px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <motion.button
          onClick={() => window.open(buildGCalLink(), '_blank')}
          className="flex-1 py-[17px] rounded-[8px] font-ibm text-[17px] text-white"
          style={{ fontWeight: 500, background: BRAND }}
          whileHover={{ scale: 1.015, boxShadow: `0 8px 28px ${BRAND}55` }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}>
          Aggiungi partita
        </motion.button>
        <motion.button
          onClick={handleShare}
          className="px-5 py-[17px] rounded-[8px] flex items-center justify-center"
          style={{ background: '#f1f5f9' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}>
          <AnimatePresence mode="wait">
            <motion.span key={copyFeedback ? 'ok' : 'share'}
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}>
              {copyFeedback
                ? <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                : <Share size={20} style={{ color: '#364458' }} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Location modal ── */}
      <AnimatePresence>
        {isLocModalOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end" style={{ backdropFilter: 'blur(8px)' }}
            initial={{ background: 'rgba(0,0,0,0)' }} animate={{ background: 'rgba(0,0,0,0.6)' }} exit={{ background: 'rgba(0,0,0,0)' }}
            transition={{ duration: 0.25 }} onClick={() => setIsLocModalOpen(false)}>
            <motion.div className="w-full bg-white rounded-t-[32px] px-6 pt-6 pb-12"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black tracking-tight">Zona di gioco</h3>
                <button onClick={() => setIsLocModalOpen(false)} className="p-2 rounded-xl bg-slate-100"><X size={18} /></button>
              </div>
              <input type="text" value={tempLocation} onChange={e => setTempLocation(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && tempLocation) { setLocation(tempLocation); setIsLocModalOpen(false); } }}
                placeholder="Es. Milano, Roma, 20100…"
                className="w-full bg-slate-100 rounded-2xl py-4 px-5 font-bold text-lg mb-4 outline-none placeholder:text-slate-400"
                autoFocus />
              <motion.button onClick={() => { if (tempLocation) { setLocation(tempLocation); setIsLocModalOpen(false); } }}
                className="w-full py-4 rounded-[8px] font-ibm text-white text-sm uppercase tracking-wider"
                style={{ fontWeight: 700, background: BRAND }} whileTap={{ scale: 0.97 }}>
                Aggiorna radar →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default App;
